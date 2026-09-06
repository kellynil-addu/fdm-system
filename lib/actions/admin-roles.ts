"use server";

import { hasPermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface RbacRole {
  id: string;
  name: string;
  description: string | null;
}

export type SetUserRolesResult =
  | { success: true }
  | { success: false; error: string };

async function getAuthorizedCaller(): Promise<
  { id: string } | { error: string }
> {
  const serverClient = await createClient();
  const {
    data: { user: caller },
  } = await serverClient.auth.getUser();

  if (!caller) {
    return { error: "You must be logged in to perform this action." };
  }

  const allowed = await hasPermission("system.create", caller.id);
  if (!allowed) {
    return {
      error: "Access denied. You do not have permission to manage roles.",
    };
  }

  return { id: caller.id };
}

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

  const { error: deleteError } = await adminClient
    .schema("rbac")
    .from("user_role")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[setUserRoles] delete error:", deleteError.message);
    return { success: false, error: deleteError.message };
  }

  if (roleIds.length > 0) {
    const rows = roleIds.map((roleId) => ({ user_id: userId, role_id: roleId }));
    const { error: insertError } = await adminClient
      .schema("rbac")
      .from("user_role")
      .insert(rows);

    if (insertError) {
      console.error("[setUserRoles] insert error:", insertError.message);
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
}
