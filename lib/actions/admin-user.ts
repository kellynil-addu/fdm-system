"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { createAction, createQuery } from "@/lib/actions/action-handler";
import { createUserSchema, updateUserProfileSchema } from "@/lib/validations/user";
import * as userAdminService from "@/lib/services/admin/user-admin-service";
import type {
  RegisterUserResult,
  UserListItem,
} from "@/lib/services/admin/user-admin-service";

export type { RegisterUserResult, UserListItem };
export type RegisterUserParams = userAdminService.RegisterUserParams;

export type ListUsersResult = {
  success: true;
  users: UserListItem[];
};

export type DeleteUserResult = { success: true };
export type UpdateUserProfileResult = { success: true };

export const registerUser = createAction({
  permission: PERMISSIONS.SYSTEM.CREATE,
  useAdminClient: true,
  handler: async (ctx, params: unknown): Promise<RegisterUserResult> => {
    const validated = createUserSchema.parse(params);
    return userAdminService.registerUser(ctx.supabase, validated);
  },
});

export const toggleUser = createAction({
  permission: PERMISSIONS.SYSTEM.CREATE,
  useAdminClient: true,
  handler: async (
    ctx,
    userId: string,
    enable: boolean
  ): Promise<{ success: true }> => {
    return userAdminService.toggleUser(ctx.supabase, ctx.userId, userId, enable);
  },
});

export const listUsers = createQuery({
  permission: PERMISSIONS.SYSTEM.CREATE,
  useAdminClient: true,
  handler: async (ctx): Promise<ListUsersResult> => {
    const users = await userAdminService.listUsers(ctx.supabase);
    return { success: true, users };
  },
});

export const deleteUser = createAction({
  permission: PERMISSIONS.SYSTEM.CREATE,
  useAdminClient: true,
  handler: async (ctx, userId: string): Promise<DeleteUserResult> => {
    return userAdminService.deleteUser(ctx.supabase, ctx.userId, userId);
  },
});

export const updateUserProfile = createAction({
  permission: PERMISSIONS.SYSTEM.CREATE,
  useAdminClient: true,
  handler: async (
    ctx,
    userId: string,
    firstName: string,
    lastName: string
  ): Promise<UpdateUserProfileResult> => {
    const parsed = updateUserProfileSchema.parse({ firstName, lastName });
    return userAdminService.updateUserProfile(
      ctx.supabase,
      userId,
      parsed.firstName,
      parsed.lastName
    );
  },
});
