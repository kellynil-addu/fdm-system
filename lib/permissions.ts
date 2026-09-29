import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserInfo } from "@/lib/user";

export const PERMISSIONS = {
    CLIENTS: {
        CREATE: "clients.create",
        READ: "clients.read",
        UPDATE: "clients.update",
        DELETE: "clients.delete",
    },
    PROPERTIES: {
        CREATE: "properties.create",
        READ: "properties.read",
        UPDATE: "properties.update",
        DELETE: "properties.delete",
    },
    SYSTEM: {
        CREATE: "system.create",
        READ: "system.read",
        UPDATE: "system.update",
        DELETE: "system.delete",
    },
    BILLING: {
        CREATE: "billing.create",
        READ: "billing.read",
        UPDATE: "billing.update",
        DELETE: "billing.delete",
    },
    LEGAL: {
        CREATE: "legal.create",
        READ: "legal.read",
        UPDATE: "legal.update",
        DELETE: "legal.delete",
    },
    ACCOUNTING: {
        CREATE: "accounting.create",
        READ: "accounting.read",
        UPDATE: "accounting.update",
        DELETE: "accounting.delete",
    },
} as const;

type ValueOf<T> = T[keyof T];
export type Permission =
    | ValueOf<{ [K in keyof typeof PERMISSIONS]: ValueOf<(typeof PERMISSIONS)[K]> }>
    | (string & {});

/**
 * The RPC calls below are POSTs, which Next.js does not memoize the way it
 * memoizes GET `fetch`es. Without `cache()` the same permission check issued
 * from the layout and again from the page costs two round trips per render.
 *
 * The user id is resolved before the cached call so that `hasPermission(name)`
 * and `hasPermission(name, currentUserId)` — both of which occur in this
 * codebase — collapse onto the same cache key instead of querying twice.
 */
const fetchHasPermission = cache(
    async (permissionName: string, userId: string): Promise<boolean> => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .schema("rbac")
            .rpc("has_permission", {
                p_permission_name: permissionName,
                p_user_id: userId,
            });

        if (error) {
            console.error("Error checking permission:", error.message || error.details || error);
            return false;
        }

        return Boolean(data);
    }
);

const fetchUserPermissions = cache(async (userId: string): Promise<string[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
        .schema("rbac")
        .rpc("get_user_permissions", { p_user_id: userId });

    if (error || !data) {
        if (error) {
            console.error(
                "Error fetching user permissions:",
                error.message || error.details || error
            );
        }
        return [];
    }

    return (data as Array<{ permission_name: string } | string>).map((item) =>
        typeof item === "string" ? item : item.permission_name
    );
});

/**
 * Checks whether a user (defaults to the currently logged-in user) has a specific RBAC permission.
 *
 * @param permissionName The name of the permission (e.g. 'billing.read')
 * @param userId Optional user UUID. If omitted, resolves to the current user.
 */
export async function hasPermission(
    permissionName: Permission,
    userId?: string
): Promise<boolean> {
    if (!permissionName) return false;

    const resolvedUserId = userId ?? (await getUserInfo())?.id;
    if (!resolvedUserId) return false;

    return fetchHasPermission(permissionName, resolvedUserId);
}

/**
 * Returns a list of permission names assigned to a user (defaults to the currently logged-in user).
 *
 * @param userId Optional user UUID. If omitted, resolves to the current user.
 */
export async function getUserPermissions(userId?: string): Promise<string[]> {
    const resolvedUserId = userId ?? (await getUserInfo())?.id;
    if (!resolvedUserId) return [];

    return fetchUserPermissions(resolvedUserId);
}
