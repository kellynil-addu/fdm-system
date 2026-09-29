import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSelfDemote, SYSTEM_ADMIN_ROLE } from "@/lib/self-protection";

export interface RbacRole {
  id: string;
  name: string;
  description: string | null;
}

export async function getActiveRoles(adminClient: SupabaseClient): Promise<RbacRole[]> {
  const { data, error } = await adminClient
    .schema("rbac")
    .from("role")
    .select("id, name, description")
    .eq("active", true)
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch active roles: ${error.message}`);
  }

  return (data ?? []) as RbacRole[];
}

export async function setUserRoles(
  adminClient: SupabaseClient,
  callerId: string,
  userId: string,
  roleIds: string[]
): Promise<{ success: true }> {
  const uniqueRoleIds = Array.from(new Set(roleIds));

  // Stop an admin from stripping their own system_admin role
  if (userId.toLowerCase() === callerId.toLowerCase()) {
    const { data: adminRole, error: roleLookupError } = await adminClient
      .schema("rbac")
      .from("role")
      .select("id")
      .eq("name", SYSTEM_ADMIN_ROLE)
      .maybeSingle<{ id: string }>();

    if (roleLookupError) {
      throw new Error(`Role lookup failed: ${roleLookupError.message}`);
    }

    const demoteError = checkSelfDemote(
      callerId,
      userId,
      adminRole?.id ?? null,
      uniqueRoleIds
    );
    if (demoteError) {
      throw new Error(demoteError);
    }
  }

  const { error: rpcError } = await adminClient
    .schema("rbac")
    .rpc("set_user_roles", {
      p_user_id: userId,
      p_role_ids: uniqueRoleIds,
    });

  if (rpcError) {
    throw new Error(`Failed to set user roles: ${rpcError.message}`);
  }

  return { success: true };
}
