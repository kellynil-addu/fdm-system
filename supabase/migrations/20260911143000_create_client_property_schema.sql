-- ==============================================================================
-- ENUMS
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE public.property_status_enum AS ENUM ('Open', 'Reserved', 'Sold', 'Forfeited');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.doc_type_enum AS ENUM ('Valid ID', 'Deed of Sale', 'eCAR', 'Other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- TRIGGER FUNCTION: updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- CLIENT MANAGEMENT TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.client (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    address TEXT,
    tin_number VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_client_updated_at
BEFORE UPDATE ON public.client
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.contact_info (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client(client_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'Email', 'Phone'
    value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.client_document (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client(client_id) ON DELETE CASCADE,
    document_type public.doc_type_enum NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.client_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client(client_id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ==============================================================================
-- PROPERTY LOT TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.property_lot (
    property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.client(client_id) ON DELETE SET NULL,
    location VARCHAR(255) NOT NULL,
    block_number INT NOT NULL,
    lot_number INT NOT NULL,
    area_size NUMERIC(10, 2) NOT NULL,
    price_per_sqm NUMERIC(12, 2) NOT NULL,
    status public.property_status_enum NOT NULL DEFAULT 'Open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_property_lot_location_block_lot UNIQUE (location, block_number, lot_number)
);

CREATE TRIGGER set_property_lot_updated_at
BEFORE UPDATE ON public.property_lot
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_lot ENABLE ROW LEVEL SECURITY;

-- Permissions for public.client
CREATE POLICY "Allow read client" ON public.client
    FOR SELECT TO authenticated
    USING (rbac.has_permission('clients.read', auth.uid()));

CREATE POLICY "Allow insert client" ON public.client
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('clients.create', auth.uid()));

CREATE POLICY "Allow update client" ON public.client
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('clients.update', auth.uid()))
    WITH CHECK (rbac.has_permission('clients.update', auth.uid()));

CREATE POLICY "Allow delete client" ON public.client
    FOR DELETE TO authenticated
    USING (rbac.has_permission('clients.delete', auth.uid()));

-- Permissions for public.contact_info
CREATE POLICY "Allow read contact_info" ON public.contact_info
    FOR SELECT TO authenticated
    USING (rbac.has_permission('clients.read', auth.uid()));

CREATE POLICY "Allow insert contact_info" ON public.contact_info
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('clients.update', auth.uid()) OR rbac.has_permission('clients.create', auth.uid()));

CREATE POLICY "Allow update contact_info" ON public.contact_info
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('clients.update', auth.uid()))
    WITH CHECK (rbac.has_permission('clients.update', auth.uid()));

CREATE POLICY "Allow delete contact_info" ON public.contact_info
    FOR DELETE TO authenticated
    USING (rbac.has_permission('clients.update', auth.uid()));

-- Permissions for public.client_document
CREATE POLICY "Allow read client_document" ON public.client_document
    FOR SELECT TO authenticated
    USING (rbac.has_permission('clients.read', auth.uid()));

CREATE POLICY "Allow insert client_document" ON public.client_document
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('clients.update', auth.uid()) OR rbac.has_permission('clients.create', auth.uid()));

CREATE POLICY "Allow update client_document" ON public.client_document
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('clients.update', auth.uid()))
    WITH CHECK (rbac.has_permission('clients.update', auth.uid()));

CREATE POLICY "Allow delete client_document" ON public.client_document
    FOR DELETE TO authenticated
    USING (rbac.has_permission('clients.update', auth.uid()));

-- Permissions for public.client_log
CREATE POLICY "Allow read client_log" ON public.client_log
    FOR SELECT TO authenticated
    USING (rbac.has_permission('clients.read', auth.uid()));

CREATE POLICY "Allow insert client_log" ON public.client_log
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('clients.update', auth.uid()) OR rbac.has_permission('clients.create', auth.uid()));

-- Permissions for public.property_lot
CREATE POLICY "Allow read property_lot" ON public.property_lot
    FOR SELECT TO authenticated
    USING (rbac.has_permission('properties.read', auth.uid()));

CREATE POLICY "Allow insert property_lot" ON public.property_lot
    FOR INSERT TO authenticated
    WITH CHECK (rbac.has_permission('properties.create', auth.uid()));

CREATE POLICY "Allow update property_lot" ON public.property_lot
    FOR UPDATE TO authenticated
    USING (rbac.has_permission('properties.update', auth.uid()))
    WITH CHECK (rbac.has_permission('properties.update', auth.uid()));

CREATE POLICY "Allow delete property_lot" ON public.property_lot
    FOR DELETE TO authenticated
    USING (rbac.has_permission('properties.delete', auth.uid()));

-- Grants
GRANT ALL ON TABLE public.client TO authenticated, service_role;
GRANT ALL ON TABLE public.contact_info TO authenticated, service_role;
GRANT ALL ON TABLE public.client_document TO authenticated, service_role;
GRANT ALL ON TABLE public.client_log TO authenticated, service_role;
GRANT ALL ON TABLE public.property_lot TO authenticated, service_role;

-- ==============================================================================
-- RBAC: Grant system_admin clients.* and properties.* permissions
-- ==============================================================================

INSERT INTO rbac.role_permission (role_id, permission_id)
SELECT r.id AS role_id, p.id AS permission_id
FROM rbac.role r
CROSS JOIN rbac.permission p
WHERE r.name = 'system_admin'
  AND p.name IN (
    'clients.create',
    'clients.read',
    'clients.update',
    'clients.delete',
    'properties.create',
    'properties.read',
    'properties.update',
    'properties.delete'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

