-- Centralized file attachment table, backward-compatibility sync, and land title notice tracking.

CREATE TABLE IF NOT EXISTS public.file_attachment (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_category TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_file_attachment_entity
    ON public.file_attachment (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_file_attachment_category
    ON public.file_attachment (file_category);

ALTER TABLE public.file_attachment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read file_attachment" ON public.file_attachment;
CREATE POLICY "Allow read file_attachment" ON public.file_attachment
    FOR SELECT TO authenticated
    USING (
        rbac.has_permission('clients.read', auth.uid())
        OR rbac.has_permission('legal.read', auth.uid())
        OR rbac.has_permission('properties.read', auth.uid())
    );

DROP POLICY IF EXISTS "Allow insert file_attachment" ON public.file_attachment;
CREATE POLICY "Allow insert file_attachment" ON public.file_attachment
    FOR INSERT TO authenticated
    WITH CHECK (
        rbac.has_permission('clients.update', auth.uid())
        OR rbac.has_permission('clients.create', auth.uid())
        OR rbac.has_permission('legal.update', auth.uid())
        OR rbac.has_permission('properties.update', auth.uid())
    );

DROP POLICY IF EXISTS "Allow update file_attachment" ON public.file_attachment;
CREATE POLICY "Allow update file_attachment" ON public.file_attachment
    FOR UPDATE TO authenticated
    USING (
        rbac.has_permission('clients.update', auth.uid())
        OR rbac.has_permission('legal.update', auth.uid())
        OR rbac.has_permission('properties.update', auth.uid())
    )
    WITH CHECK (
        rbac.has_permission('clients.update', auth.uid())
        OR rbac.has_permission('legal.update', auth.uid())
        OR rbac.has_permission('properties.update', auth.uid())
    );

DROP POLICY IF EXISTS "Allow delete file_attachment" ON public.file_attachment;
CREATE POLICY "Allow delete file_attachment" ON public.file_attachment
    FOR DELETE TO authenticated
    USING (
        rbac.has_permission('clients.update', auth.uid())
        OR rbac.has_permission('legal.update', auth.uid())
        OR rbac.has_permission('properties.update', auth.uid())
    );

GRANT ALL ON TABLE public.file_attachment TO authenticated, service_role;

-- Backfill existing client documents into centralized file attachments
INSERT INTO public.file_attachment (
    attachment_id,
    entity_type,
    entity_id,
    file_category,
    file_path,
    metadata,
    uploaded_at,
    uploaded_by
)
SELECT
    document_id,
    'client',
    client_id,
    document_type::text,
    file_path,
    CASE 
        WHEN property_id IS NOT NULL THEN jsonb_build_object('property_id', property_id)
        ELSE '{}'::jsonb
    END,
    uploaded_at,
    uploaded_by
FROM public.client_document
ON CONFLICT (attachment_id) DO NOTHING;

-- Synchronize legacy client_document modifications into file_attachment
CREATE OR REPLACE FUNCTION public.sync_client_document_to_file_attachment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.file_attachment (
            attachment_id,
            entity_type,
            entity_id,
            file_category,
            file_path,
            metadata,
            uploaded_at,
            uploaded_by
        )
        VALUES (
            NEW.document_id,
            'client',
            NEW.client_id,
            NEW.document_type::text,
            NEW.file_path,
            CASE 
                WHEN NEW.property_id IS NOT NULL THEN jsonb_build_object('property_id', NEW.property_id)
                ELSE '{}'::jsonb
            END,
            NEW.uploaded_at,
            NEW.uploaded_by
        )
        ON CONFLICT (attachment_id) DO NOTHING;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.file_attachment
        SET
            file_category = NEW.document_type::text,
            file_path = NEW.file_path,
            metadata = CASE 
                WHEN NEW.property_id IS NOT NULL THEN jsonb_build_object('property_id', NEW.property_id)
                ELSE '{}'::jsonb
            END
        WHERE attachment_id = NEW.document_id;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.file_attachment WHERE attachment_id = OLD.document_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_document_to_file_attachment ON public.client_document;
CREATE TRIGGER trg_sync_client_document_to_file_attachment
AFTER INSERT OR UPDATE OR DELETE ON public.client_document
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_document_to_file_attachment();

-- Land title notice records with foreign key link to RTS scan in file_attachment
CREATE TABLE IF NOT EXISTS public.land_title_notice (
    notice_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id            UUID NOT NULL REFERENCES public.land_title(title_id) ON DELETE CASCADE,
    notice_number       INT NOT NULL CHECK (notice_number BETWEEN 1 AND 3),
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rts_attachment_id   UUID REFERENCES public.file_attachment(attachment_id) ON DELETE SET NULL,
    rts_reason          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_title_notice_number UNIQUE (title_id, notice_number)
);

CREATE INDEX IF NOT EXISTS idx_land_title_notice_title_id
    ON public.land_title_notice (title_id, notice_number ASC);

CREATE INDEX IF NOT EXISTS idx_land_title_notice_rts_attachment_id
    ON public.land_title_notice (rts_attachment_id);

ALTER TABLE public.land_title_notice ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read land_title_notice" ON public.land_title_notice;
CREATE POLICY "Allow read land_title_notice" ON public.land_title_notice
    FOR SELECT TO authenticated
    USING (
        rbac.has_permission('legal.read', auth.uid())
        OR rbac.has_permission('clients.read', auth.uid())
    );

DROP POLICY IF EXISTS "Allow insert land_title_notice" ON public.land_title_notice;
CREATE POLICY "Allow insert land_title_notice" ON public.land_title_notice
    FOR INSERT TO authenticated
    WITH CHECK (
        rbac.has_permission('legal.update', auth.uid())
        OR rbac.has_permission('legal.create', auth.uid())
    );

DROP POLICY IF EXISTS "Allow update land_title_notice" ON public.land_title_notice;
CREATE POLICY "Allow update land_title_notice" ON public.land_title_notice
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('legal.update', auth.uid()))
    WITH CHECK (rbac.has_permission('legal.update', auth.uid()));

DROP POLICY IF EXISTS "Allow delete land_title_notice" ON public.land_title_notice;
CREATE POLICY "Allow delete land_title_notice" ON public.land_title_notice
    FOR DELETE TO authenticated
    USING (rbac.has_permission('legal.update', auth.uid()));

GRANT ALL ON TABLE public.land_title_notice TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
