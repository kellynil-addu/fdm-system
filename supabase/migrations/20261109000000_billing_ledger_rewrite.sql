-- ==============================================================================
-- BILLING & LEDGER REWRITE MIGRATION
--
-- 1. Extend account_status_enum with 'Fully Paid', 'Fully Paid Unclaimed', 'Restructured'.
-- 2. Extend ledger_account with cadence, held_since, reopened_by.
-- 3. Create billing_schedule & billing_schedule_installment tables.
-- 4. Create append-only billing_transaction table with sequence generator.
-- 5. Create billing_payment & billing_payment_application tables.
-- 6. Create billing_post_dated_check table.
-- 7. Create billing_penalty_policy & billing_account_penalty_arrangement tables.
-- 8. Create billing_holding_charge table.
-- 9. Create billing_import_discrepancy table.
-- 10. Create billing_account view alias.
-- 11. Drop legacy payment reconciliation trigger that overwrote balances.
-- 12. Enable RLS and permissions.
-- ==============================================================================

-- 1. Extend account status enum
ALTER TYPE public.account_status_enum ADD VALUE IF NOT EXISTS 'Fully Paid';
ALTER TYPE public.account_status_enum ADD VALUE IF NOT EXISTS 'Fully Paid Unclaimed';
ALTER TYPE public.account_status_enum ADD VALUE IF NOT EXISTS 'Restructured';

-- 2. Extend ledger_account with schedule cadence & hold release metadata
ALTER TABLE public.ledger_account
    ADD COLUMN IF NOT EXISTS cadence VARCHAR(20) NOT NULL DEFAULT 'monthly',
    ADD COLUMN IF NOT EXISTS held_since TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Installment Schedules & Versioning
CREATE TABLE IF NOT EXISTS public.billing_schedule (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    term_months INT NOT NULL CHECK (term_months > 0),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, version)
);

CREATE INDEX IF NOT EXISTS idx_billing_schedule_account ON public.billing_schedule(account_id, is_active);

CREATE TABLE IF NOT EXISTS public.billing_schedule_installment (
    installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.billing_schedule(schedule_id) ON DELETE CASCADE,
    installment_number INT NOT NULL CHECK (installment_number > 0),
    due_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (schedule_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_billing_schedule_inst_due ON public.billing_schedule_installment(schedule_id, due_date ASC);

-- 4. Append-Only Transaction Journal
CREATE TABLE IF NOT EXISTS public.billing_transaction (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE RESTRICT,
    transaction_sequence BIGINT NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('payment', 'penalty_charge', 'fee_charge', 'adjustment', 'reversal')),
    value_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    reverses_transaction_id UUID REFERENCES public.billing_transaction(transaction_id) ON DELETE RESTRICT,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    posted_by UUID NOT NULL REFERENCES auth.users(id),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, transaction_sequence)
);

CREATE INDEX IF NOT EXISTS idx_billing_txn_account_seq ON public.billing_transaction(account_id, transaction_sequence ASC);
CREATE INDEX IF NOT EXISTS idx_billing_txn_value_date ON public.billing_transaction(account_id, value_date ASC);

-- Atomic sequence generator per account
CREATE OR REPLACE FUNCTION public.get_next_billing_transaction_sequence(p_account_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_seq BIGINT;
BEGIN
    SELECT COALESCE(MAX(transaction_sequence), 0) + 1
    INTO v_next_seq
    FROM public.billing_transaction
    WHERE account_id = p_account_id;

    RETURN v_next_seq;
END;
$$;

-- 5. Payments and Contract Waterfall Allocations
CREATE TABLE IF NOT EXISTS public.billing_payment (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES public.billing_transaction(transaction_id) ON DELETE CASCADE,
    or_series VARCHAR(50) NOT NULL DEFAULT 'Main',
    or_number VARCHAR(100) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('Cash', 'Check', 'Bank Transfer', 'Online Deposit')),
    total_received NUMERIC(15, 2) NOT NULL CHECK (total_received > 0),
    receipt_attachment_id UUID REFERENCES public.file_attachment(attachment_id) ON DELETE SET NULL,
    is_historical_split BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_payment_or ON public.billing_payment(or_number);

CREATE TABLE IF NOT EXISTS public.billing_payment_application (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.billing_payment(payment_id) ON DELETE CASCADE,
    allocation_type VARCHAR(30) NOT NULL CHECK (allocation_type IN ('penalty', 'interest', 'tax', 'principal', 'titling_fee', 'storage_fee', 'overpayment_credit')),
    installment_id UUID REFERENCES public.billing_schedule_installment(installment_id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_pay_app_payment ON public.billing_payment_application(payment_id);
CREATE INDEX IF NOT EXISTS idx_billing_pay_app_inst ON public.billing_payment_application(installment_id);

-- 6. Post-Dated Check Instruments (Record-only)
CREATE TABLE IF NOT EXISTS public.billing_post_dated_check (
    check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    check_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    check_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'holding', 'deposited', 'cleared', 'returned')),
    cleared_payment_id UUID REFERENCES public.billing_payment(payment_id) ON DELETE SET NULL,
    returned_reason TEXT,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_pdc_account ON public.billing_post_dated_check(account_id, check_date ASC);

-- 7. Effective-Dated Penalty Policies and Attachments
CREATE TABLE IF NOT EXISTS public.billing_penalty_policy (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    rate_percent NUMERIC(5, 2) NOT NULL CHECK (rate_percent >= 0),
    basis VARCHAR(50) NOT NULL DEFAULT 'overdue_installment' CHECK (basis IN ('overdue_installment', 'remaining_balance')),
    grace_period_days INT NOT NULL DEFAULT 30,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed standard policies
INSERT INTO public.billing_penalty_policy (name, rate_percent, basis, grace_period_days, description)
VALUES
    ('Standard 3.5%', 3.50, 'overdue_installment', 30, 'Standard monthly 3.5% penalty on overdue installment arrears'),
    ('Bayanihan Act 0% Moratorium', 0.00, 'overdue_installment', 0, 'Statutory pandemic grace period moratorium (no penalty accrual)'),
    ('Executive Amnesty 0%', 0.00, 'overdue_installment', 0, 'Approved 1-year amnesty on installment penalty accrual')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.billing_account_penalty_arrangement (
    arrangement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES public.billing_penalty_policy(policy_id),
    start_date DATE NOT NULL,
    end_date DATE,
    authority VARCHAR(100) NOT NULL,
    extends_contract_term BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_penalty_arr_acc ON public.billing_account_penalty_arrangement(account_id, start_date ASC);

-- 8. Holding Charges (Recurring Storage Fees after Title Release)
CREATE TABLE IF NOT EXISTS public.billing_holding_charge (
    holding_charge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    period_month DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 540.00 CHECK (amount >= 0),
    is_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_billing_holding_acc ON public.billing_holding_charge(account_id, period_month ASC);

-- 9. Legacy Statement Discrepancy Review Queue
CREATE TABLE IF NOT EXISTS public.billing_import_discrepancy (
    discrepancy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.ledger_account(account_id) ON DELETE SET NULL,
    source_filename VARCHAR(255) NOT NULL,
    sheet_name VARCHAR(100),
    discrepancy_type VARCHAR(50) NOT NULL CHECK (discrepancy_type IN ('total_mismatch', 'date_precedes_due', 'duplicate_receipt', 'missing_receipt', 'installment_amount_mismatch', 'matured_with_balance')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_import_disc_status ON public.billing_import_discrepancy(status, created_at DESC);

-- 10. Billing Account View Alias (unifies ledger_account with billing terminology)
CREATE OR REPLACE VIEW public.billing_account AS
SELECT
    la.account_id,
    la.property_id,
    la.status,
    la.total_contract_price,
    la.remaining_balance,
    la.terms_months,
    la.monthly_amortization,
    la.amortization_day,
    la.penalty_rate_percent,
    la.titling_fee,
    la.titling_fee_paid,
    la.storage_fee_rate,
    la.cts_date,
    la.first_due_date,
    la.contract_end_date,
    la.baseline_date,
    la.baseline_principal_paid,
    la.baseline_penalties_accrued,
    la.baseline_notes,
    la.cadence,
    la.forfeited_at,
    la.forfeiture_reason,
    la.held_since,
    la.reopened_at,
    la.reopened_by,
    la.created_at,
    la.updated_at
FROM public.ledger_account la;

-- 11. Drop legacy payment reconciliation trigger that overwrote balances on insert/update
DROP TRIGGER IF EXISTS trg_reconcile_ledger_payment ON public.ledger_payment;

-- 12. RLS & RBAC Permissions Configuration
ALTER TABLE public.billing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_schedule_installment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_post_dated_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_penalty_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_account_penalty_arrangement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_holding_charge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_import_discrepancy ENABLE ROW LEVEL SECURITY;

-- Permissive authenticated read policy (protected by Server Action createScope)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY[
            'billing_schedule',
            'billing_schedule_installment',
            'billing_transaction',
            'billing_payment',
            'billing_payment_application',
            'billing_post_dated_check',
            'billing_penalty_policy',
            'billing_account_penalty_arrangement',
            'billing_holding_charge',
            'billing_import_discrepancy'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can access %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Authenticated users can access %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
