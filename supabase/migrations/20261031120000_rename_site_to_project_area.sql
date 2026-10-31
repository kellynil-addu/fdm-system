-- ==============================================================================
-- RENAME site -> project_area  (Stage 3 of the Project Area standardisation)
--
-- The company's own term for the land a development sits on is "project area",
-- but the schema called it "site" while the UI used both. This is the schema
-- half of that rename; the UI copy and code identifiers landed first.
--
-- The `site_subdivision` table becomes `project_area_subdivision`, but
-- `subdivision_id` keeps its name: there is no `subdivision` table, so
-- "subdivision" is not a competing land-area term here. It is the plat-slot
-- word, and `.agents/skills/fdm-domain/SKILL.md` uses it that way.
--
-- Metadata-only — every statement below is a catalogue update, so this runs in
-- milliseconds regardless of table size. No data is rewritten.
--
-- Object names were confirmed against the live database
-- (`supabase db dump --linked --schema public`) rather than read off the
-- migration files, which had drifted.
-- ==============================================================================

BEGIN;

-- 1. Tables -------------------------------------------------------------------
ALTER TABLE public.site             RENAME TO project_area;
ALTER TABLE public.site_subdivision RENAME TO project_area_subdivision;

-- 2. Columns ------------------------------------------------------------------
-- subdivision_id is deliberately NOT renamed; see the header.
ALTER TABLE public.project_area             RENAME COLUMN site_id TO project_area_id;
ALTER TABLE public.property_lot             RENAME COLUMN site_id TO project_area_id;
ALTER TABLE public.project_area_subdivision RENAME COLUMN site_id TO project_area_id;

-- 3. Constraints --------------------------------------------------------------
-- A table rename does not rename constraints, indexes, triggers or policies.
ALTER TABLE public.project_area RENAME CONSTRAINT site_pkey             TO project_area_pkey;
ALTER TABLE public.project_area RENAME CONSTRAINT site_name_key         TO project_area_name_key;
ALTER TABLE public.project_area RENAME CONSTRAINT site_boundary_is_ring TO project_area_boundary_is_ring;

ALTER TABLE public.property_lot
    RENAME CONSTRAINT property_lot_site_id_fkey TO property_lot_project_area_id_fkey;

ALTER TABLE public.project_area_subdivision
    RENAME CONSTRAINT site_subdivision_pkey             TO project_area_subdivision_pkey;
ALTER TABLE public.project_area_subdivision
    RENAME CONSTRAINT site_subdivision_site_id_fkey     TO project_area_subdivision_project_area_id_fkey;
ALTER TABLE public.project_area_subdivision
    RENAME CONSTRAINT site_subdivision_boundary_is_ring TO project_area_subdivision_boundary_is_ring;
ALTER TABLE public.project_area_subdivision
    RENAME CONSTRAINT uq_site_subdivision               TO uq_project_area_subdivision;

-- 4. Indexes -----------------------------------------------------------------
ALTER INDEX public.idx_property_lot_site_id     RENAME TO idx_property_lot_project_area_id;
ALTER INDEX public.idx_site_subdivision_site_id RENAME TO idx_project_area_subdivision_project_area_id;

-- 5. Triggers ----------------------------------------------------------------
ALTER TRIGGER set_site_updated_at ON public.project_area
    RENAME TO set_project_area_updated_at;
ALTER TRIGGER set_site_subdivision_updated_at ON public.project_area_subdivision
    RENAME TO set_project_area_subdivision_updated_at;

-- 6. RLS policies ------------------------------------------------------------
-- Renamed, not recreated: their USING / WITH CHECK bodies call
-- rbac.has_permission(...) and never name the table, so they travel with it.
ALTER POLICY "Allow read site"   ON public.project_area RENAME TO "Allow read project_area";
ALTER POLICY "Allow insert site" ON public.project_area RENAME TO "Allow insert project_area";
ALTER POLICY "Allow update site" ON public.project_area RENAME TO "Allow update project_area";
ALTER POLICY "Allow delete site" ON public.project_area RENAME TO "Allow delete project_area";

ALTER POLICY "Allow read site_subdivision"   ON public.project_area_subdivision RENAME TO "Allow read project_area_subdivision";
ALTER POLICY "Allow insert site_subdivision" ON public.project_area_subdivision RENAME TO "Allow insert project_area_subdivision";
ALTER POLICY "Allow update site_subdivision" ON public.project_area_subdivision RENAME TO "Allow update project_area_subdivision";
ALTER POLICY "Allow delete site_subdivision" ON public.project_area_subdivision RENAME TO "Allow delete project_area_subdivision";

-- 7. Functions ---------------------------------------------------------------
-- DROP + CREATE, not CREATE OR REPLACE. Postgres has no ALTER FUNCTION ...
-- RENAME PARAMETER, and CREATE OR REPLACE refuses to change an input parameter
-- name. The name matters because PostgREST calls RPCs by JSON key, so the app
-- now sends `p_project_area_id`.
--
-- A DROP also drops the grants, which are re-issued at the end of this section.
-- The identity argument list is unchanged (uuid, int, int, ...), so the two
-- live signatures remain distinct and PostgREST has no overload ambiguity.
DROP FUNCTION IF EXISTS public.create_subdivision_lot(uuid, int, int, jsonb, boolean, numeric, numeric);
DROP FUNCTION IF EXISTS public.create_and_assign_property_from_subdivision(uuid, int, int, numeric, numeric, uuid, text, numeric, numeric, varchar);

CREATE FUNCTION public.create_subdivision_lot(
    p_project_area_id UUID,
    p_block_number INT,
    p_lot_number INT,
    p_boundary JSONB,
    p_create_property_lot BOOLEAN DEFAULT FALSE,
    p_area_size NUMERIC(10, 2) DEFAULT NULL,
    p_price_per_sqm NUMERIC(12, 2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_project_area_name VARCHAR(255);
    v_subdivision public.project_area_subdivision;
    v_lot public.property_lot;
BEGIN
    SELECT s.name
    INTO v_project_area_name
    FROM public.project_area s
    WHERE s.project_area_id = p_project_area_id;

    IF v_project_area_name IS NULL THEN
        RAISE EXCEPTION 'Project area not found.';
    END IF;

    INSERT INTO public.project_area_subdivision (
        project_area_id,
        block_number,
        lot_number,
        boundary
    ) VALUES (
        p_project_area_id,
        p_block_number,
        p_lot_number,
        p_boundary
    )
    RETURNING * INTO v_subdivision;

    IF COALESCE(p_create_property_lot, FALSE) THEN
        INSERT INTO public.property_lot (
            project_area_id,
            location,
            block_number,
            lot_number,
            area_size,
            price_per_sqm,
            status,
            boundary
        ) VALUES (
            p_project_area_id,
            v_project_area_name,
            p_block_number,
            p_lot_number,
            p_area_size,
            p_price_per_sqm,
            'Open'::public.property_status_enum,
            p_boundary
        )
        ON CONFLICT (location, block_number, lot_number) DO UPDATE SET
            project_area_id = EXCLUDED.project_area_id,
            area_size = EXCLUDED.area_size,
            price_per_sqm = EXCLUDED.price_per_sqm,
            status = EXCLUDED.status,
            boundary = EXCLUDED.boundary
        RETURNING * INTO v_lot;

        -- JSON keys stay 'subdivision' / 'lot': the app reads
        -- result.data.subdivision, and the key names the row, not the table.
        RETURN pg_catalog.jsonb_build_object(
            'subdivision', pg_catalog.to_jsonb(v_subdivision),
            'lot', pg_catalog.to_jsonb(v_lot)
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'subdivision', pg_catalog.to_jsonb(v_subdivision),
        'lot', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_subdivision_lot(uuid, int, int, jsonb, boolean, numeric, numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_subdivision_lot(uuid, int, int, jsonb, boolean, numeric, numeric) TO authenticated, service_role;

CREATE FUNCTION public.create_and_assign_property_from_subdivision(
    p_project_area_id UUID,
    p_block_number INT,
    p_lot_number INT,
    p_area_size NUMERIC(10, 2),
    p_price_per_sqm NUMERIC(12, 2),
    p_client_id UUID,
    p_ownership_type TEXT,
    p_total_contract_price NUMERIC(15, 2) DEFAULT NULL,
    p_remaining_balance NUMERIC(15, 2) DEFAULT NULL,
    p_title_number VARCHAR(100) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_project_area_name VARCHAR(255);
    v_target_status public.property_status_enum;
    v_property_id UUID;
    v_tcp NUMERIC(15, 2);
    v_balance NUMERIC(15, 2);
    v_account_id UUID;
BEGIN
    SELECT s.name
    INTO v_project_area_name
    FROM public.project_area s
    WHERE s.project_area_id = p_project_area_id;

    -- Unchanged from the pre-rename body. Note this is the same poisoned
    -- fallback the app-side createlot path uses; see the follow-up on
    -- property_lot.location.
    v_project_area_name := COALESCE(v_project_area_name, 'Unassigned Project Area');
    v_target_status := CASE
        WHEN p_ownership_type = 'fully_paid' THEN 'Sold'::public.property_status_enum
        ELSE 'Reserved'::public.property_status_enum
    END;

    INSERT INTO public.property_lot (
        project_area_id,
        location,
        block_number,
        lot_number,
        area_size,
        price_per_sqm,
        status,
        title_number
    ) VALUES (
        p_project_area_id,
        v_project_area_name,
        p_block_number,
        p_lot_number,
        p_area_size,
        p_price_per_sqm,
        v_target_status,
        p_title_number
    )
    RETURNING property_id INTO v_property_id;

    v_tcp := COALESCE(p_total_contract_price, p_area_size * p_price_per_sqm);
    v_balance := CASE
        WHEN p_ownership_type = 'fully_paid' THEN 0
        ELSE COALESCE(p_remaining_balance, v_tcp)
    END;

    INSERT INTO public.ledger_account (
        property_id,
        status,
        total_contract_price,
        remaining_balance,
        cleared_at,
        cleared_by
    ) VALUES (
        v_property_id,
        'Active'::public.account_status_enum,
        v_tcp,
        v_balance,
        CASE WHEN p_ownership_type = 'fully_paid' THEN pg_catalog.now() END,
        CASE WHEN p_ownership_type = 'fully_paid' THEN auth.uid() END
    )
    RETURNING account_id INTO v_account_id;

    INSERT INTO public.account_party (
        account_id,
        client_id,
        role,
        ownership_percentage,
        is_primary
    ) VALUES (
        v_account_id,
        p_client_id,
        'Principal Buyer',
        100.00,
        TRUE
    );

    RETURN v_property_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_and_assign_property_from_subdivision(uuid, int, int, numeric, numeric, uuid, text, numeric, numeric, varchar) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_and_assign_property_from_subdivision(uuid, int, int, numeric, numeric, uuid, text, numeric, numeric, varchar) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
