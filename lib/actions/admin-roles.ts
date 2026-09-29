"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { createAction, createQuery } from "@/lib/actions/action-handler";
import * as roleAdminService from "@/lib/services/admin/role-admin-service";
import type { RbacRole } from "@/lib/services/admin/role-admin-service";

export type { RbacRole };
export type SetUserRolesResult = { success: true };

export const getActiveRoles = createQuery({
  permission: PERMISSIONS.SYSTEM.CREATE,
  useAdminClient: true,
  handler: async (ctx): Promise<RbacRole[]> => {
    return roleAdminService.getActiveRoles(ctx.supabase);
  },
});

export const setUserRoles = createAction({
  permission: PERMISSIONS.SYSTEM.CREATE,
  useAdminClient: true,
  handler: async (
    ctx,
    userId: string,
    roleIds: string[]
  ): Promise<SetUserRolesResult> => {
    return roleAdminService.setUserRoles(ctx.supabase, ctx.userId, userId, roleIds);
  },
});
