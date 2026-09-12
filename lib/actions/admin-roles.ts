"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizedCaller } from "@/lib/actions/auth-guard";
import { checkSelfDemote, SYSTEM_ADMIN_ROLE } from "@/lib/self-protection";

export interface RbacRole {
  id: string;
  name: string;
  description: string | null;
}

export type SetUserRolesResult =
  | { success: true }
  | { success: false; error: string };

export async function getActiveRoles(): Promise<RbacRole[]> {
  const caller = await getAuthorizedCaller();
  if ("error" in caller) {
    console.error("[getActiveRoles] unauthorized:", caller.error);
    return [];
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .schema("rbac")
    .from("role")
    .select("id, name, description")
    .eq("active", true)
    .order("name");

  if (error) {
    console.error("[getActiveRoles] error:", error.message);
    return [];
  }

  return (data ?? []) as RbacRole[];
}

export async function setUserRoles(
  userId: string,
  roleIds: string[]
): Promise<SetUserRolesResult> {
  const caller = await getAuthorizedCaller();
  if ("error" in caller) return { success: false, error: caller.error };

  const adminClient = createAdminClient();
  const uniqueRoleIds = Array.from(new Set(roleIds));

  // Stop an admin from stripping their own system_admin role
  if (userId.toLowerCase() === caller.id.toLowerCase()) {
    const { data: adminRole, error: roleLookupError } = await adminClient
      .schema("rbac")
      .from("role")
      .select("id")
      .eq("name", SYSTEM_ADMIN_ROLE)
      .maybeSingle<{ id: string }>();

    if (roleLookupError) {
      console.error("[setUserRoles] role lookup error:", roleLookupError.message);
      return { success: false, error: roleLookupError.message };
    }

    const demoteError = checkSelfDemote(
      caller.id,
      userId,
      adminRole?.id ?? null,
      uniqueRoleIds,
    );
    if (demoteError) {
      return { success: false, error: demoteError };
    }
  }

  const { error: rpcError } = await adminClient
    .schema("rbac")
    .rpc("set_user_roles", {
      p_user_id: userId,
      p_role_ids: uniqueRoleIds,
    });

  if (rpcError) {
    console.error("[setUserRoles] error:", rpcError.message);
    return { success: false, error: rpcError.message };
  }

  return { success: true };
}
