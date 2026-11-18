-- ==============================================================================
-- RETIRE public.client_document
--
-- Every client document is already mirrored into public.file_attachment by the
-- sync trigger, so the legacy table carries no data of its own. This migration
-- makes file_attachment the single home for all documents:
--
--   1. Adds `client_id` / `property_id` to file_attachment so client documents
--      are joinable from `client` and filterable by lot in SQL.
--   2. Re-scopes the write policies by `entity_type`: client paperwork is
--      written by staff with `clients.update`, Legal owns title paperwork, and
--      property staff own property attachments. Legal can no longer edit or
--      delete a client's own paperwork.
--   3. Drops the sync trigger, its function, and client_document itself.
--
-- Ownership by entity_type:
--   'client'            client paperwork, uploaded from the client profile
--   'land_title'        release packet documents (client_id set, so they still
--                       appear on the client's profile) and notice proofs
--                       (client_id left null, so they stay Legal-only)
--   'land_title_notice' notice attachments
--   'property'          property paperwork
-- ==============================================================================

-- 1. Join keys -----------------------------------------------------------------

ALTER TABLE public.file_attachment
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.client(client_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.property_lot(property_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_file_attachment_client_id
    ON public.file_attachment (client_id);

CREATE INDEX IF NOT EXISTS idx_file_attachment_property_id
    ON public.file_attachment (property_id);

-- Existing client paperwork was mirrored with entity_id = client_id.
UPDATE public.file_attachment
SET client_id = entity_id
WHERE entity_type = 'client'
  AND client_id IS NULL;

-- Lot links used to live in metadata as a plain string.
UPDATE public.file_attachment
SET property_id = (metadata ->> 'property_id')::uuid
WHERE property_id IS NULL
  AND metadata ? 'property_id';

-- 2. Entity-scoped write policies ---------------------------------------------
--
-- Reads stay open to clients.read / legal.read / properties.read as before:
-- every authenticated staff member who could see a client's documents can
-- still see them. Writes are now scoped to the owning domain.

DROP POLICY IF EXISTS "Allow insert file_attachment" ON public.file_attachment;
CREATE POLICY "Allow insert file_attachment" ON public.file_attachment
    FOR INSERT TO authenticated
    WITH CHECK (
        (entity_type = 'client'
            AND (rbac.has_permission('clients.update', auth.uid())
                 OR rbac.has_permission('clients.create', auth.uid())))
        OR (entity_type IN ('land_title', 'land_title_notice')
            AND (rbac.has_permission('legal.update', auth.uid())
                 OR rbac.has_permission('legal.create', auth.uid())))
        OR (entity_type = 'property'
            AND rbac.has_permission('properties.update', auth.uid()))
    );

DROP POLICY IF EXISTS "Allow update file_attachment" ON public.file_attachment;
CREATE POLICY "Allow update file_attachment" ON public.file_attachment
    FOR UPDATE TO authenticated
    USING (
        (entity_type = 'client'
            AND rbac.has_permission('clients.update', auth.uid()))
        OR (entity_type IN ('land_title', 'land_title_notice')
            AND rbac.has_permission('legal.update', auth.uid()))
        OR (entity_type = 'property'
            AND rbac.has_permission('properties.update', auth.uid()))
    )
    WITH CHECK (
        (entity_type = 'client'
            AND rbac.has_permission('clients.update', auth.uid()))
        OR (entity_type IN ('land_title', 'land_title_notice')
            AND rbac.has_permission('legal.update', auth.uid()))
        OR (entity_type = 'property'
            AND rbac.has_permission('properties.update', auth.uid()))
    );

DROP POLICY IF EXISTS "Allow delete file_attachment" ON public.file_attachment;
CREATE POLICY "Allow delete file_attachment" ON public.file_attachment
    FOR DELETE TO authenticated
    USING (
        (entity_type = 'client'
            AND (rbac.has_permission('clients.update', auth.uid())
                 OR rbac.has_permission('clients.delete', auth.uid())))
        OR (entity_type IN ('land_title', 'land_title_notice')
            AND rbac.has_permission('legal.update', auth.uid()))
        OR (entity_type = 'property'
            AND rbac.has_permission('properties.update', auth.uid()))
    );

-- 3. Remove the legacy table and its sync path --------------------------------

DROP TRIGGER IF EXISTS trg_sync_client_document_to_file_attachment ON public.client_document;
DROP FUNCTION IF EXISTS public.sync_client_document_to_file_attachment();
DROP TABLE IF EXISTS public.client_document;

NOTIFY pgrst, 'reload schema';
