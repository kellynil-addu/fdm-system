-- ==============================================================================
-- UPDATE LAND TITLE STATUSES AND 30-DAY CLEARANCE TRACKING
--
-- 1. Adds clearance_started_at column to land_title.
-- 2. Drops old status check constraint.
-- 3. Migrates status values to legal operational terminology:
--    'Legal Processing'    -> 'Document Preparation'
--    'Legal Review'        -> 'For Review'
--    'Management Approval' -> 'For Signature'
--    '30-Day Clearance'    -> 'Clearance Period'
-- 4. Recreates check constraint chk_land_title_status with new values.
-- 5. Updates defaults trigger to auto-map legacy names and timestamp clearance.
-- ==============================================================================

-- 1. Add clearance_started_at to land_title
ALTER TABLE public.land_title
    ADD COLUMN IF NOT EXISTS clearance_started_at TIMESTAMP WITH TIME ZONE;

-- 2. Drop old status check constraint before updating rows
ALTER TABLE public.land_title DROP CONSTRAINT IF EXISTS chk_land_title_status;

-- 3. Update existing status values to new terminology
UPDATE public.land_title
SET status = CASE status
    WHEN 'Legal Processing' THEN 'Document Preparation'
    WHEN 'Legal Review' THEN 'For Review'
    WHEN 'Management Approval' THEN 'For Signature'
    WHEN '30-Day Clearance' THEN 'Clearance Period'
    WHEN 'Processing' THEN 'Cleared by Billing'
    WHEN 'Ready for Release' THEN 'Ready for Claim'
    ELSE status
END;

-- Backfill clearance_started_at for any records already in Clearance Period
UPDATE public.land_title
SET clearance_started_at = COALESCE(clearance_started_at, updated_at, created_at, NOW())
WHERE status = 'Clearance Period' AND clearance_started_at IS NULL;

-- 4. Recreate status check constraint with new terminology
ALTER TABLE public.land_title ADD CONSTRAINT chk_land_title_status CHECK (
    status IN (
        'Cleared by Billing',
        'Document Preparation',
        'For Review',
        'For Signature',
        'Clearance Period',
        'Ready for Claim',
        'Released'
    )
);

-- 5. Update trigger function to handle backward compatibility and auto-timestamp
CREATE OR REPLACE FUNCTION public.handle_land_title_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    END IF;

    -- Map legacy status values
    NEW.status := CASE NEW.status
        WHEN 'Processing' THEN 'Cleared by Billing'
        WHEN 'Legal Processing' THEN 'Document Preparation'
        WHEN 'Legal Review' THEN 'For Review'
        WHEN 'Management Approval' THEN 'For Signature'
        WHEN '30-Day Clearance' THEN 'Clearance Period'
        WHEN 'Ready for Release' THEN 'Ready for Claim'
        ELSE NEW.status
    END;

    -- Auto-record clearance start date
    IF NEW.status = 'Clearance Period' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Clearance Period') THEN
        NEW.clearance_started_at := COALESCE(NEW.clearance_started_at, NOW());
    END IF;

    RETURN NEW;
END;
$$;
