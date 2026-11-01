-- ==============================================================================
-- ADD updated_at TO project_area_subdivision
--
-- The table has carried a `set_project_area_subdivision_updated_at` trigger
-- (formerly `set_site_subdivision_updated_at`) since it was created, but the
-- column the trigger writes was never declared. `handle_updated_at()` is
-- unconditional:
--
--     NEW.updated_at = CURRENT_TIMESTAMP;
--
-- so every UPDATE raised `record "new" has no field "updated_at"`, which made
-- updateSubdivisionBoundary() fail outright. Nothing noticed because the only
-- write paths were INSERT and DELETE.
--
-- `created_at` is added alongside `updated_at` to match the sibling
-- `project_area` table, which carries both.
--
-- Rows written before this migration get the migration timestamp for both
-- columns. That is a placeholder, not a true creation time — the rows are plat
-- slots with no user-visible history, and backfilling from the owning project
-- area would assert a fact nobody recorded.
-- ==============================================================================

BEGIN;

ALTER TABLE public.project_area_subdivision
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

COMMIT;

NOTIFY pgrst, 'reload schema';
