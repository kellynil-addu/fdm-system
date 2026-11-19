"use client";

import * as React from "react";
import type { UserSession, SessionContextValue } from "@/lib/types/session";
import {
  type PermissionRule,
  type CapabilityOrRule,
  type PermissionResource,
  checkPermissionRule,
} from "@/lib/capabilities";

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: UserSession;
  children: React.ReactNode;
}) {
  const value = React.useMemo<SessionContextValue>(() => {
    const roleSet = new Set(session.roles);
    const permissionSet = new Set(session.permissions);

    const can = (rule: CapabilityOrRule): boolean => {
      if (session.isSystemAdmin) return true;
      return checkPermissionRule(rule, (permission) => permissionSet.has(permission));
    };

    return {
      session,
      user: session.user,
      roles: session.roles,
      permissions: session.permissions,
      isSystemAdmin: session.isSystemAdmin,
      can,
      hasPermission: (permission: string) =>
        session.isSystemAdmin || permissionSet.has(permission),
      hasRole: (role: string) => roleSet.has(role),
    };
  }, [session]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}

export interface ResourcePermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function useResourcePermissions(
  resource: PermissionResource | string
): ResourcePermissions {
  const { can, hasPermission, isSystemAdmin } = useSession();
  return React.useMemo(() => {
    const canUpdate = can(`${resource}.update` as PermissionRule);
    return {
      canCreate: can(`${resource}.create` as PermissionRule),
      canRead: can(`${resource}.read` as PermissionRule),
      canUpdate,
      canEdit: canUpdate,
      canDelete: isSystemAdmin || hasPermission(`${resource}.delete`),
    };
  }, [can, hasPermission, isSystemAdmin, resource]);
}

export function useIntents<T extends Record<string, CapabilityOrRule>>(
  intentsMap: T
): Record<keyof T, boolean> {
  const { can, isSystemAdmin } = useSession();

  const entries = Object.entries(intentsMap);
  const cacheKey = entries
    .map(([k, v]) => `${k}:${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("|");

  return React.useMemo(() => {
    const result = {} as Record<keyof T, boolean>;
    for (const [k, rule] of entries) {
      result[k as keyof T] = isSystemAdmin || can(rule);
    }
    return result;
  }, [can, isSystemAdmin, cacheKey]);
}
