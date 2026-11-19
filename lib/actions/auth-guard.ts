import "server-only";

import { redirect, forbidden } from "next/navigation";
import { getUserInfo } from "@/lib/user";
import { hasPermission } from "@/lib/permissions";
import {
  type PermissionRule,
  type CapabilityOrRule,
  CAPABILITIES,
  type CapabilityName,
} from "@/lib/capabilities";

export async function getAuthorizedCaller(): Promise<
  { id: string } | { error: string }
> {
  const user = await getUserInfo();

  if (!user) {
    return { error: "You must be logged in to perform this action." };
  }

  const allowed = await hasPermission("system.create", user.id);
  if (!allowed) {
    return {
      error: "Access denied. You do not have permission to manage this resource.",
    };
  }

  return { id: user.id };
}

export async function requirePermission(permissionName: string): Promise<string> {
  const user = await getUserInfo();
  if (!user) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }

  const allowed = await hasPermission(permissionName, user.id);
  if (!allowed) {
    throw new Error(`Forbidden: You do not have permission '${permissionName}'.`);
  }

  return user.id;
}

// TBD: we could also give ONLY read access to property and users, instead of having ANY
export async function requireAnyPermission(permissionNames: string[]): Promise<string> {
  const user = await getUserInfo();
  if (!user) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }

  for (const name of permissionNames) {
    const allowed = await hasPermission(name, user.id);
    if (allowed) return user.id;
  }

  throw new Error(`Forbidden: You do not have any of the required permissions: ${permissionNames.join(", ")}`);
}

export async function evaluateRuleAsync(
  rule: CapabilityOrRule,
  hasPermAsync: (permission: string) => Promise<boolean>
): Promise<boolean> {
  if (typeof rule === "string") {
    if (rule in CAPABILITIES && CAPABILITIES[rule as CapabilityName] !== rule) {
      return evaluateRuleAsync(
        CAPABILITIES[rule as CapabilityName],
        hasPermAsync
      );
    }
    return hasPermAsync(rule);
  }

  if (rule.type === "either") {
    for (const r of rule.rules) {
      if (await evaluateRuleAsync(r, hasPermAsync)) return true;
    }
    return false;
  }

  if (rule.type === "all") {
    for (const r of rule.rules) {
      if (!(await evaluateRuleAsync(r, hasPermAsync))) return false;
    }
    return true;
  }

  return false;
}

export async function requireRule(
  rule: CapabilityOrRule,
  userId?: string
): Promise<string> {
  const user = await getUserInfo();
  if (!user) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }
  const resolvedUserId = userId ?? user.id;

  const allowed = await evaluateRuleAsync(rule, (permission) =>
    hasPermission(permission, resolvedUserId)
  );
  if (!allowed) {
    throw new Error("Forbidden: You do not have permission to perform this action.");
  }

  return resolvedUserId;
}

export async function verifyPageAccess(
  permissionName: string,
  redirectTo: string = "/dashboard"
): Promise<{ userId: string }> {
  const user = await getUserInfo();
  if (!user) {
    redirect("/login");
  }

  const allowed = await hasPermission(permissionName, user.id);
  if (!allowed) {
    forbidden();
  }

  return { userId: user.id };
}

