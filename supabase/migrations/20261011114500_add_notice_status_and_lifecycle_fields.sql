-- Add notice lifecycle status and resolution tracking to land_title_notice
ALTER TABLE public.land_title_notice
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ongoing'
        CHECK (status IN ('ongoing', 'received', 'returned_to_sender')),
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Backfill status for existing notices that already have RTS records
UPDATE public.land_title_notice
SET status = 'returned_to_sender',
    status_updated_at = updated_at
WHERE rts_attachment_id IS NOT NULL AND status = 'ongoing';
