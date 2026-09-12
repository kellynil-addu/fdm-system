-- Atomically replaces all roles assigned to a user within a single transaction.

CREATE OR REPLACE FUNCTION rbac.set_user_roles(
    p_user_id UUID,
    p_role_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rbac, auth, public
AS $$
DECLARE
    v_distinct_count INT;
    v_valid_count INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    IF p_role_ids IS NOT NULL AND cardinality(p_role_ids) > 0 THEN
        SELECT COUNT(DISTINCT r_id)
        INTO v_distinct_count
        FROM unnest(p_role_ids) AS r_id;

        SELECT COUNT(*)
        INTO v_valid_count
        FROM rbac.role
        WHERE id = ANY(p_role_ids);

        IF v_valid_count <> v_distinct_count THEN
            RAISE EXCEPTION 'One or more role IDs are invalid.';
        END IF;
    END IF;

    DELETE FROM rbac.user_role
    WHERE user_id = p_user_id;

    IF p_role_ids IS NOT NULL AND cardinality(p_role_ids) > 0 THEN
        INSERT INTO rbac.user_role (user_id, role_id)
        SELECT DISTINCT p_user_id, unnest(p_role_ids);
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION rbac.set_user_roles(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rbac.set_user_roles(UUID, UUID[]) TO service_role;

