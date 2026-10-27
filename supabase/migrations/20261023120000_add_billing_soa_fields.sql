-- ==============================================================================
-- BILLING: Statement of Account fields
-- ==============================================================================
-- Additive and nullable only. No balance is rewritten (§11: "Prefer adding a nullable
-- field with a clear note over a migration that rewrites balances").
--
-- Every column here defaults to NULL, and the calculator treats NULL as "policy not
-- confirmed" / "no override". That means no existing account's numbers move when this
-- migration lands. A migrated account only changes behaviour once a human sets a value.

ALTER TABLE public.ledger_account
    -- Penalty-free cycles after the contract matures. NULL = policy not confirmed.
    -- The reference workbooks use 13 (maturity 2022-03-07 -> first charge 2023-05-07).
    ADD COLUMN IF NOT EXISTS penalty_grace_months INT
        CHECK (penalty_grace_months IS NULL OR penalty_grace_months BETWEEN 0 AND 36),

    -- Post-maturity rate when it differs from the in-contract rate. NULL = use
    -- penalty_rate_percent. The three observed policies: 3.5%/no grace, 3.5%/12mo, 2.0%/12mo.
    ADD COLUMN IF NOT EXISTS post_maturity_rate_percent NUMERIC(5, 2)
        CHECK (post_maturity_rate_percent IS NULL OR post_maturity_rate_percent BETWEEN 0 AND 20),

    -- The "ahente". Free text with no FK: agents are historical and often departed, and
    -- losing the agent link is a stated pain point in the walkthroughs.
    ADD COLUMN IF NOT EXISTS referral_name TEXT,

    -- Lets an account own its storage-fee clock when no land_title row exists — which is
    -- exactly the fully-paid-unclaimed case (a large and operationally urgent bucket).
    ADD COLUMN IF NOT EXISTS ready_for_claim_date DATE;

COMMENT ON COLUMN public.ledger_account.penalty_grace_months IS
    'Penalty-free monthly cycles after contract_end_date. NULL means the policy has not been confirmed for this account; the calculator applies no grace (pre-existing behaviour) until it is set.';

COMMENT ON COLUMN public.ledger_account.post_maturity_rate_percent IS
    'Monthly penalty rate applied after maturity when it differs from penalty_rate_percent. NULL means use penalty_rate_percent.';

COMMENT ON COLUMN public.ledger_account.referral_name IS
    'Free-text name of the referring agent ("ahente"). Deliberately not a foreign key: agents are historical and frequently departed.';

COMMENT ON COLUMN public.ledger_account.ready_for_claim_date IS
    'Date the title became claimable, used as the storage-fee clock start when no land_title row exists.';

-- ==============================================================================
-- Single balance formula
-- ==============================================================================
-- remaining_balance is written by two different paths — the trigger on ledger_payment, and
-- setAccountBillingBaseline when a legacy cutover snapshot is first recorded. Both must use
-- this same expression or the two drift apart:
--
--     GREATEST(0, total_contract_price - (baseline_principal_paid + SUM(ledger_payment.principal_amount)))
--
-- Nothing is redefined here. The trigger's own definition already matches, and is left as
-- written by 20261020110001_fix_billing_reconciliation_trigger.sql; this is the comment that
-- records which expression the two paths have to agree on. The TypeScript side carries a
-- matching note in setAccountBillingBaseline.

COMMENT ON COLUMN public.ledger_account.remaining_balance IS
    'Principal outstanding only — excludes penalty and fees. Kept equal to GREATEST(0, total_contract_price - (baseline_principal_paid + sum of ledger_payment.principal_amount)) by trg_ledger_payment_reconciliation; setAccountBillingBaseline applies the same formula when the baseline is first recorded.';

NOTIFY pgrst, 'reload schema';
