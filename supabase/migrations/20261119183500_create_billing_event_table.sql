-- ==============================================================================
-- CREATE BILLING EVENT TABLE
--
-- Dedicated audit & activity log for billing and contract lifecycle milestones:
-- - Property reservations under installment contract ledgers
-- - Ledger contract forfeitures
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.billing_event (
    event_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES public.ledger_account(account_id) ON DELETE CASCADE,
    client_id   UUID REFERENCES public.client(client_id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.property_lot(property_id) ON DELETE SET NULL,
    event_type  VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_event_account_id
    ON public.billing_event (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_event_created_at
    ON public.billing_event (created_at DESC);

-- Enable RLS
ALTER TABLE public.billing_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_event_select" ON public.billing_event;
CREATE POLICY "billing_event_select" ON public.billing_event
    FOR SELECT TO authenticated
    USING (rbac.has_permission('billing.read', auth.uid()));

DROP POLICY IF EXISTS "billing_event_insert" ON public.billing_event;
CREATE POLICY "billing_event_insert" ON public.billing_event
    FOR INSERT TO authenticated
    WITH CHECK (
        rbac.has_permission('billing.create', auth.uid())
        OR rbac.has_permission('billing.update', auth.uid())
        OR rbac.has_permission('properties.update', auth.uid())
    );

GRANT ALL ON TABLE public.billing_event TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
