"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizedCaller } from "@/lib/actions/auth-guard";
import { AuthError } from "@supabase/supabase-js";
import type { RbacRole } from "@/lib/actions/admin-roles";

export interface RegisterUserParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Zero or more rbac.role.id values to assign immediately after creation. */
  roleIds?: string[];
}

export type RegisterUserResult =
  | { success: true; userId: string }
  | { success: false; error: string };

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Pick<RbacRole, "id" | "name">[];
  isBanned: boolean;
}

export type ListUsersResult =
  | { success: true; users: UserListItem[] }
  | { success: false; error: string };

export async function registerUser(
  params: RegisterUserParams
): Promise<RegisterUserResult> {
  const { email, password, firstName, lastName, roleIds = [] } = params;

  const caller = await getAuthorizedCaller();
  if ("error" in caller) return { success: false, error: caller.error };

  const adminClient = createAdminClient();

  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

  if (createError) {
    console.error("[registerUser] createUser error:", createError.message);
    return { success: false, error: createError.message };
  }

  const newUserId = createData.user.id;

  if (roleIds.length > 0) {
    const rows = roleIds.map((roleId) => ({ user_id: newUserId, role_id: roleId }));
    const { error: roleError } = await adminClient
      .schema("rbac")
      .from("user_role")
      .upsert(rows, { onConflict: "user_id,role_id" });

    if (roleError) {
      console.error("[registerUser] role assignment error:", roleError.message);
      return {
        success: false,
        error: `User created (${newUserId}), but role assignment failed: ${roleError.message}`,
      };
    }
  }

  return { success: true, userId: newUserId };
}

export async function toggleUser(userId: string, enable: boolean) {
  const caller = await getAuthorizedCaller();
  if ("error" in caller) return { success: false, error: caller.error };

  const adminClient = createAdminClient();

  let errorMain: AuthError | null = null;

  if (enable) {
    // Workaround: to re-enable a user, reset the ban duration to 0
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: "0h",
    });
    errorMain = error;
  } else {
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    errorMain = error;
  }

  if (errorMain) {
    console.error("[toggleUser] error: ", errorMain.message);
    return { success: false, error: errorMain.message };
  }

  return { success: true };
}

export async function listUsers(): Promise<ListUsersResult> {
  const caller = await getAuthorizedCaller();
  if ("error" in caller) return { success: false, error: caller.error };

  const adminClient = createAdminClient();

  const allAuthUsers: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    banned_until?: string | null;
  }[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[listUsers] listUsers error:", error.message);
      return { success: false, error: error.message };
    }

    allAuthUsers.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        first_name: (u.user_metadata as Record<string, string> | null)?.first_name ?? "",
        last_name: (u.user_metadata as Record<string, string> | null)?.last_name ?? "",
        banned_until: u.banned_until,
      }))
    );

    if (data.users.length < perPage) break;
    page++;
  }

  const { data: userRoles, error: rolesError } = await adminClient
    .schema("rbac")
    .from("user_role")
    .select("user_id, role:role_id(id, name)")
    .returns<{ user_id: string; role: Pick<RbacRole, "id" | "name"> | null }[]>();

  if (rolesError) {
    console.error("[listUsers] user_role fetch error:", rolesError.message);
    return { success: false, error: rolesError.message };
  }

  const rolesByUser = (userRoles ?? []).reduce((map, row) => {
    if (row.role) map.set(row.user_id, [...(map.get(row.user_id) ?? []), row.role]);
    return map;
  }, new Map<string, Pick<RbacRole, "id" | "name">[]>());

  const now = new Date();
  const users: UserListItem[] = allAuthUsers.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    roles: rolesByUser.get(u.id) ?? [],
    isBanned: !!u.banned_until && new Date(u.banned_until) > now,
  }));

  return { success: true, users };
}

export type DeleteUserResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  const caller = await getAuthorizedCaller();
  if ("error" in caller) return { success: false, error: caller.error };

  const adminClient = createAdminClient();

  // Remove associated RBAC role mappings first (in case there is no ON DELETE CASCADE)
  const { error: rolesError } = await adminClient
    .schema("rbac")
    .from("user_role")
    .delete()
    .eq("user_id", userId);

  if (rolesError) {
    console.error("[deleteUser] role cleanup error:", rolesError.message);
    return { success: false, error: rolesError.message };
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("[deleteUser] deleteUser error:", deleteError.message);
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}

export type UpdateUserProfileResult =
  | { success: true }
  | { success: false; error: string };

export async function updateUserProfile(
  userId: string,
  firstName: string,
  lastName: string
): Promise<UpdateUserProfileResult> {
  const caller = await getAuthorizedCaller();
  if ("error" in caller) return { success: false, error: caller.error };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error) {
    console.error("[updateUserProfile] error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
