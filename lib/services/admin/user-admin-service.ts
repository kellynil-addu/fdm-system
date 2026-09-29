import type { SupabaseClient, AuthError } from "@supabase/supabase-js";
import type { RbacRole } from "@/lib/actions/admin-roles";
import { checkSelfDeactivate, checkSelfDelete } from "@/lib/self-protection";
import type { CreateUserFormData } from "@/lib/validations/user";

export type RegisterUserParams = CreateUserFormData;

export interface RegisterUserResult {
  userId: string;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Pick<RbacRole, "id" | "name">[];
  isBanned: boolean;
}

export function describeCreateUserError(error: AuthError): string {
  const code = (error as AuthError & { code?: string }).code;
  const message = error.message.toLowerCase();

  if (code === "email_exists" || message.includes("already been registered") || message.includes("already exists")) {
    return "An account with this email address already exists. Search for it in the user list instead of creating a new one.";
  }

  if (code === "weak_password" || message.includes("password")) {
    return `Password rejected: ${error.message}`;
  }

  if (message.includes("invalid") && message.includes("email")) {
    return "That email address is not valid. Check it and try again.";
  }

  return error.message;
}

export async function registerUser(
  adminClient: SupabaseClient,
  input: CreateUserFormData
): Promise<RegisterUserResult> {
  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });

  if (createError) {
    throw new Error(describeCreateUserError(createError));
  }

  const newUserId = createData.user.id;

  if (input.roleIds && input.roleIds.length > 0) {
    const uniqueRoleIds = Array.from(new Set(input.roleIds));
    const { error: roleError } = await adminClient
      .schema("rbac")
      .rpc("set_user_roles", {
        p_user_id: newUserId,
        p_role_ids: uniqueRoleIds,
      });

    if (roleError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(`Role assignment failed: ${roleError.message}`);
    }
  }

  return { userId: newUserId };
}

export async function toggleUser(
  adminClient: SupabaseClient,
  callerId: string,
  userId: string,
  enable: boolean
): Promise<{ success: true }> {
  const deactivateError = checkSelfDeactivate(callerId, userId, enable);
  if (deactivateError) {
    throw new Error(deactivateError);
  }

  const ban_duration = enable ? "0h" : "876000h";
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

export async function listUsers(
  adminClient: SupabaseClient
): Promise<UserListItem[]> {
  const allAuthUsers: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    banned_until?: string | null;
  }[] = [];
  let page = 1;
  const perPage = 1000;
  const maxPages = 10;

  while (page <= maxPages) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
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

  const userIds = allAuthUsers.map((u) => u.id);
  let userRoles: { user_id: string; role: Pick<RbacRole, "id" | "name"> | null }[] = [];

  if (userIds.length > 0) {
    const { data: rolesData, error: rolesError } = await adminClient
      .schema("rbac")
      .from("user_role")
      .select("user_id, role:role_id(id, name)")
      .in("user_id", userIds)
      .returns<{ user_id: string; role: Pick<RbacRole, "id" | "name"> | null }[]>();

    if (rolesError) {
      throw new Error(rolesError.message);
    }
    userRoles = rolesData ?? [];
  }

  const rolesByUser = userRoles.reduce((map, row) => {
    if (row.role) map.set(row.user_id, [...(map.get(row.user_id) ?? []), row.role]);
    return map;
  }, new Map<string, Pick<RbacRole, "id" | "name">[]>());

  const now = new Date();
  return allAuthUsers.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    roles: rolesByUser.get(u.id) ?? [],
    isBanned: !!u.banned_until && new Date(u.banned_until) > now,
  }));
}

export async function deleteUser(
  adminClient: SupabaseClient,
  callerId: string,
  userId: string
): Promise<{ success: true }> {
  const selfDeleteError = checkSelfDelete(callerId, userId);
  if (selfDeleteError) {
    throw new Error(selfDeleteError);
  }

  const { error: rolesError } = await adminClient
    .schema("rbac")
    .from("user_role")
    .delete()
    .eq("user_id", userId);

  if (rolesError) {
    throw new Error(`Role cleanup error: ${rolesError.message}`);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return { success: true };
}

export async function updateUserProfile(
  adminClient: SupabaseClient,
  userId: string,
  firstName: string,
  lastName: string
): Promise<{ success: true }> {
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}
