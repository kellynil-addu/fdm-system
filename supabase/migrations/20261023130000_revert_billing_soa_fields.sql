-- ==============================================================================
-- BILLING: revert the Statement of Account fields
-- ==============================================================================
-- Undoes 20261023120000_add_billing_soa_fields.sql.
--
-- Why a forward migration rather than deleting the original: 20261023120000 has already
-- been applied to the linked project, and an applied migration is never edited in place.
-- The undo therefore has to be its own migration.
--
-- Net effect of the pair is nothing. Both stay in the history so the record shows the
-- columns existed and were withdrawn, rather than silently never having been there.

ALTER TABLE public.ledger_account
    DROP COLUMN IF EXISTS penalty_grace_months,
    DROP COLUMN IF EXISTS post_maturity_rate_percent,
    DROP COLUMN IF EXISTS referral_name,
    DROP COLUMN IF EXISTS ready_for_claim_date;

-- Each dropped column takes its own COMMENT with it. This one does not: remaining_balance
-- is pre-existing and carried no comment until 20261023120000 added one, so the prior
-- state is restored by clearing it. Dropping the column is not an option here — the point
-- is to leave remaining_balance exactly as it was, not to remove it.

COMMENT ON COLUMN public.ledger_account.remaining_balance IS NULL;

NOTIFY pgrst, 'reload schema';
