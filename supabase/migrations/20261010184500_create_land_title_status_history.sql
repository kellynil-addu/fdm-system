-- ==============================================================================
-- CREATE LAND TITLE STATUS HISTORY
--
-- Tracks status changes over time with timestamps and user references.
-- Used to render the state timeline in the legal management dialog.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.land_title_status_history (
    history_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id    UUID NOT NULL REFERENCES public.land_title(title_id) ON DELETE CASCADE,
    status      VARCHAR(100) NOT NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_land_title_status_history_title_id
    ON public.land_title_status_history (title_id, changed_at ASC);

-- Enable RLS
ALTER TABLE public.land_title_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read land_title_status_history" ON public.land_title_status_history;
CREATE POLICY "Allow read land_title_status_history" ON public.land_title_status_history
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert land_title_status_history" ON public.land_title_status_history;
CREATE POLICY "Allow insert land_title_status_history" ON public.land_title_status_history
    FOR INSERT TO authenticated WITH CHECK (true);

GRANT ALL ON TABLE public.land_title_status_history TO authenticated, service_role;

-- Trigger to record status transitions automatically
CREATE OR REPLACE FUNCTION public.record_land_title_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.land_title_status_history (title_id, status, changed_at, changed_by)
        VALUES (NEW.title_id, NEW.status, COALESCE(NEW.created_at, NOW()), NEW.created_by);
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.land_title_status_history (title_id, status, changed_at, changed_by)
        VALUES (NEW.title_id, NEW.status, NOW(), COALESCE(auth.uid(), NEW.created_by));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_land_title_status_history ON public.land_title;
CREATE TRIGGER trg_land_title_status_history
AFTER INSERT OR UPDATE ON public.land_title
FOR EACH ROW
EXECUTE FUNCTION public.record_land_title_status_history();

-- Backfill existing titles
INSERT INTO public.land_title_status_history (title_id, status, changed_at, changed_by)
SELECT title_id, status, created_at, created_by
FROM public.land_title;
