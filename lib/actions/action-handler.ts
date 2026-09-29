import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, requireAnyPermission } from "@/lib/actions/auth-guard";
import { getUserInfo } from "@/lib/user";
import type { Permission } from "@/lib/permissions";
import {
  type ActionResult,
  actionSuccess,
  actionError,
  actionZodError,
} from "@/lib/actions/action-result";

export interface ActionContext {
  supabase: SupabaseClient;
  user: User;
  userId: string;
}

export interface QueryContext {
  supabase: SupabaseClient;
  user: User | null;
  userId: string | null;
}

export interface ActionConfig<TArgs extends unknown[], TOutput> {
  permission?: Permission | Permission[];
  useAdminClient?: boolean;
  handler: (ctx: ActionContext, ...args: TArgs) => Promise<TOutput>;
}

export interface QueryConfig<TArgs extends unknown[], TOutput> {
  permission?: Permission | Permission[];
  useAdminClient?: boolean;
  handler: (ctx: QueryContext, ...args: TArgs) => Promise<TOutput>;
}

export function createAction<TArgs extends unknown[], TOutput>(
  config: ActionConfig<TArgs, TOutput>
): (...args: TArgs) => Promise<ActionResult<TOutput>> {
  return async (...args: TArgs): Promise<ActionResult<TOutput>> => {
    try {
      let userId: string;
      if (Array.isArray(config.permission)) {
        userId = await requireAnyPermission(config.permission);
      } else if (config.permission) {
        userId = await requirePermission(config.permission);
      } else {
        const user = await getUserInfo();
        if (!user) {
          return actionError("Unauthorized: You must be logged in to perform this action.");
        }
        userId = user.id;
      }

      const user = (await getUserInfo())!;
      const supabase = config.useAdminClient
        ? createAdminClient()
        : await createSupabaseServerClient();

      const data = await config.handler({ supabase, user, userId }, ...args);
      return actionSuccess(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return actionZodError(error);
      }
      return actionError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };
}

export function createQuery<TArgs extends unknown[], TOutput>(
  config: QueryConfig<TArgs, TOutput>
): (...args: TArgs) => Promise<TOutput> {
  return async (...args: TArgs): Promise<TOutput> => {
    let userId: string | null = null;
    let user: User | null = null;

    if (Array.isArray(config.permission)) {
      userId = await requireAnyPermission(config.permission);
      user = await getUserInfo();
    } else if (config.permission) {
      userId = await requirePermission(config.permission);
      user = await getUserInfo();
    } else {
      user = await getUserInfo();
      userId = user?.id ?? null;
    }

    const supabase = config.useAdminClient
      ? createAdminClient()
      : await createSupabaseServerClient();

    return config.handler({ supabase, user, userId }, ...args);
  };
}
