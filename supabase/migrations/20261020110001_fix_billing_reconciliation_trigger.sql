-- ==============================================================================
-- FIX: Prevent cascade delete lock in handle_ledger_payment_reconciliation
-- ==============================================================================

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

    -- If parent ledger_account is being deleted, skip reconciliation update
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
