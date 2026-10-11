-- ==============================================================================
-- REFACTOR PROPERTY TITLE NUMBER AND LEGACY TURNOVER FLAG
--
-- 1. Moves title_number to property_lot (intrinsic physical parcel attribute).
-- 2. Backfills existing property_lot.title_number from land_title.
-- 3. Replaces land_title.title_holder with is_legacy_transferred boolean.
-- 4. Removes deprecated title_number from land_title.
-- ==============================================================================

-- 1. Add title_number to property_lot
ALTER TABLE public.property_lot
    ADD COLUMN IF NOT EXISTS title_number VARCHAR(100);

-- 2. Backfill existing property_lot.title_number from land_title
UPDATE public.property_lot p
SET title_number = t.title_number
FROM public.land_title t
WHERE p.property_id = t.property_id
  AND t.title_number IS NOT NULL
  AND (p.title_number IS NULL OR p.title_number = '');

-- 3. Add is_legacy_transferred flag to land_title
ALTER TABLE public.land_title
    ADD COLUMN IF NOT EXISTS is_legacy_transferred BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill legacy records where title_holder was 'client'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'land_title'
          AND column_name = 'title_holder'
    ) THEN
        UPDATE public.land_title
        SET is_legacy_transferred = TRUE
        WHERE title_holder = 'client';
    END IF;
END $$;

-- 4. Clean up deprecated columns from land_title
ALTER TABLE public.land_title DROP CONSTRAINT IF EXISTS chk_land_title_holder;
ALTER TABLE public.land_title DROP COLUMN IF EXISTS title_holder;
ALTER TABLE public.land_title DROP COLUMN IF EXISTS title_number;

-- 5. Update subdivision assignment RPC to store title_number on property_lot
CREATE OR REPLACE FUNCTION public.create_and_assign_property_from_subdivision(
    p_site_id UUID,
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
    v_site_name VARCHAR(255);
    v_target_status public.property_status_enum;
    v_property_id UUID;
    v_tcp NUMERIC(15, 2);
    v_balance NUMERIC(15, 2);
    v_account_id UUID;
BEGIN
    SELECT s.name
    INTO v_site_name
    FROM public.site s
    WHERE s.site_id = p_site_id;

    v_site_name := COALESCE(v_site_name, 'Unknown Location');
    v_target_status := CASE
        WHEN p_ownership_type = 'fully_paid' THEN 'Sold'::public.property_status_enum
        ELSE 'Reserved'::public.property_status_enum
    END;

    INSERT INTO public.property_lot (
        site_id,
        location,
        block_number,
        lot_number,
        area_size,
        price_per_sqm,
        status,
        title_number
    ) VALUES (
        p_site_id,
        v_site_name,
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

NOTIFY pgrst, 'reload schema';
