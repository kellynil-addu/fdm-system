-- ==============================================================================
-- FDM BILLING SYSTEM BACKEND SCHEMA
-- ==============================================================================

-- 1. Extend ledger_account with schedule, baseline, and fee metadata
ALTER TABLE public.ledger_account
    ADD COLUMN IF NOT EXISTS terms_months INT NOT NULL DEFAULT 60,
    ADD COLUMN IF NOT EXISTS monthly_amortization NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS amortization_day INT NOT NULL DEFAULT 28 CHECK (amortization_day BETWEEN 1 AND 31),
    ADD COLUMN IF NOT EXISTS penalty_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.50,
    ADD COLUMN IF NOT EXISTS titling_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS titling_fee_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS storage_fee_rate NUMERIC(10, 2) NOT NULL DEFAULT 540.00,
    ADD COLUMN IF NOT EXISTS cts_date DATE,
    ADD COLUMN IF NOT EXISTS first_due_date DATE,
    ADD COLUMN IF NOT EXISTS contract_end_date DATE,
    ADD COLUMN IF NOT EXISTS baseline_date DATE,
    ADD COLUMN IF NOT EXISTS baseline_principal_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS baseline_penalties_accrued NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS baseline_notes TEXT;

-- 2. Payment Transaction Ledger
CREATE TABLE IF NOT EXISTS public.ledger_payment (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    or_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Check', 'Bank Transfer', 'Online Deposit')),
    principal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (principal_amount >= 0),
    penalty_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (penalty_amount >= 0),
    storage_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (storage_fee_amount >= 0),
    titling_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (titling_fee_amount >= 0),
    total_amount NUMERIC(12, 2) GENERATED ALWAYS AS (
        principal_amount + penalty_amount + storage_fee_amount + titling_fee_amount
    ) STORED,
    receipt_attachment_id UUID REFERENCES public.file_attachment(attachment_id) ON DELETE SET NULL,
    remarks TEXT,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_payment_account_date ON public.ledger_payment(account_id, payment_date ASC);
CREATE INDEX IF NOT EXISTS idx_ledger_payment_or_no ON public.ledger_payment(or_number);

-- 3. Executive Compromise / Waiver Agreements
CREATE TABLE IF NOT EXISTS public.ledger_compromise (
    compromise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    original_penalty NUMERIC(12, 2) NOT NULL,
    agreed_penalty NUMERIC(12, 2) NOT NULL,
    waiver_amount NUMERIC(12, 2) GENERATED ALWAYS AS (original_penalty - agreed_penalty) STORED,
    restructured_months INT NOT NULL DEFAULT 0 CHECK (restructured_months <= 12),
    valid_until DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Approved' CHECK (status IN ('Pending', 'Approved', 'Fulfilled', 'Lapsed', 'Voided')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_compromise_account ON public.ledger_compromise(account_id);

-- 4. 3-Notice Maceda Collection & Demand Letters
CREATE TABLE IF NOT EXISTS public.ledger_account_notice (
    notice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    notice_type VARCHAR(50) NOT NULL CHECK (notice_type IN ('1st Notice', '2nd Notice', 'Final Demand')),
    notice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    dispatch_date DATE,
    courier_name VARCHAR(100) DEFAULT 'LBC Express',
    tracking_number VARCHAR(100),
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Dispatched', 'Delivered', 'Return to Sender (RTS)')),
    rts_attachment_id UUID REFERENCES public.file_attachment(attachment_id) ON DELETE SET NULL,
    rts_reason TEXT,
    proof_attachment_id UUID REFERENCES public.file_attachment(attachment_id) ON DELETE SET NULL,
    remarks TEXT,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_notice_account ON public.ledger_account_notice(account_id, notice_date DESC);

-- 5. Real-Time Balance Reconciliation Trigger
CREATE OR REPLACE FUNCTION public.handle_ledger_payment_reconciliation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_account_id UUID;
    v_total_principal_paid NUMERIC(15, 2);
    v_total_titling_paid NUMERIC(15, 2);
    v_tcp NUMERIC(15, 2);
    v_baseline_paid NUMERIC(15, 2);
BEGIN
    v_account_id := COALESCE(NEW.account_id, OLD.account_id);

    IF NOT EXISTS (SELECT 1 FROM public.ledger_account WHERE account_id = v_account_id) THEN
        RETURN NULL;
    END IF;

    SELECT 
        COALESCE(SUM(principal_amount), 0.00),
        COALESCE(SUM(titling_fee_amount), 0.00)
    INTO v_total_principal_paid, v_total_titling_paid
    FROM public.ledger_payment
    WHERE account_id = v_account_id;

    SELECT 
        total_contract_price,
        COALESCE(baseline_principal_paid, 0.00)
    INTO v_tcp, v_baseline_paid
    FROM public.ledger_account
    WHERE account_id = v_account_id;

    UPDATE public.ledger_account
    SET 
        remaining_balance = GREATEST(0.00, v_tcp - (v_baseline_paid + v_total_principal_paid)),
        titling_fee_paid = v_total_titling_paid,
        updated_at = CURRENT_TIMESTAMP
    WHERE account_id = v_account_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_payment_reconciliation ON public.ledger_payment;
CREATE TRIGGER trg_ledger_payment_reconciliation
AFTER INSERT OR UPDATE OR DELETE ON public.ledger_payment
FOR EACH ROW EXECUTE FUNCTION public.handle_ledger_payment_reconciliation();

-- 6. Row Level Security Policies
ALTER TABLE public.ledger_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_compromise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_account_notice ENABLE ROW LEVEL SECURITY;

-- ledger_payment policies
DROP POLICY IF EXISTS "Allow read ledger_payment" ON public.ledger_payment;
CREATE POLICY "Allow read ledger_payment" ON public.ledger_payment
    FOR SELECT TO authenticated
    USING (rbac.has_permission('billing.read', auth.uid()));

DROP POLICY IF EXISTS "Allow insert ledger_payment" ON public.ledger_payment;
CREATE POLICY "Allow insert ledger_payment" ON public.ledger_payment
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('billing.create', auth.uid()));

DROP POLICY IF EXISTS "Allow update ledger_payment" ON public.ledger_payment;
CREATE POLICY "Allow update ledger_payment" ON public.ledger_payment
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('billing.update', auth.uid()))
    WITH CHECK (rbac.has_permission('billing.update', auth.uid()));

DROP POLICY IF EXISTS "Allow delete ledger_payment" ON public.ledger_payment;
CREATE POLICY "Allow delete ledger_payment" ON public.ledger_payment
    FOR DELETE TO authenticated
    USING (rbac.has_permission('billing.delete', auth.uid()));

-- ledger_compromise policies
DROP POLICY IF EXISTS "Allow read ledger_compromise" ON public.ledger_compromise;
CREATE POLICY "Allow read ledger_compromise" ON public.ledger_compromise
    FOR SELECT TO authenticated
    USING (rbac.has_permission('billing.read', auth.uid()));

DROP POLICY IF EXISTS "Allow insert ledger_compromise" ON public.ledger_compromise;
CREATE POLICY "Allow insert ledger_compromise" ON public.ledger_compromise
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('billing.update', auth.uid()));

DROP POLICY IF EXISTS "Allow update ledger_compromise" ON public.ledger_compromise;
CREATE POLICY "Allow update ledger_compromise" ON public.ledger_compromise
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('billing.update', auth.uid()))
    WITH CHECK (rbac.has_permission('billing.update', auth.uid()));

-- ledger_account_notice policies
DROP POLICY IF EXISTS "Allow read ledger_account_notice" ON public.ledger_account_notice;
CREATE POLICY "Allow read ledger_account_notice" ON public.ledger_account_notice
    FOR SELECT TO authenticated
    USING (rbac.has_permission('billing.read', auth.uid()) OR rbac.has_permission('legal.read', auth.uid()));

DROP POLICY IF EXISTS "Allow insert ledger_account_notice" ON public.ledger_account_notice;
CREATE POLICY "Allow insert ledger_account_notice" ON public.ledger_account_notice
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('billing.create', auth.uid()) OR rbac.has_permission('legal.create', auth.uid()));

DROP POLICY IF EXISTS "Allow update ledger_account_notice" ON public.ledger_account_notice;
CREATE POLICY "Allow update ledger_account_notice" ON public.ledger_account_notice
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('billing.update', auth.uid()) OR rbac.has_permission('legal.update', auth.uid()))
    WITH CHECK (rbac.has_permission('billing.update', auth.uid()) OR rbac.has_permission('legal.update', auth.uid()));

GRANT ALL ON TABLE public.ledger_payment TO authenticated, service_role;
GRANT ALL ON TABLE public.ledger_compromise TO authenticated, service_role;
GRANT ALL ON TABLE public.ledger_account_notice TO authenticated, service_role;
