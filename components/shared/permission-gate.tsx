'use client';

import * as React from 'react';
import { useSession } from '@/lib/hooks/use-session';
import {
  type PermissionRule,
  type CapabilityName,
  either,
  all,
} from '@/lib/capabilities';

interface PermissionGateProps {
  permission?: string;
  capability?: CapabilityName;
  rule?: PermissionRule;
  anyOf?: (string | PermissionRule)[];
  allOf?: (string | PermissionRule)[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  capability,
  rule,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, hasPermission } = useSession();

  let isAllowed = true;
  if (rule && !can(rule)) {
    isAllowed = false;
  }
  if (capability && !can(capability)) {
    isAllowed = false;
  }
  if (permission && !hasPermission(permission)) {
    isAllowed = false;
  }
  if (anyOf && anyOf.length > 0 && !can(either(...(anyOf as PermissionRule[])))) {
    isAllowed = false;
  }
  if (allOf && allOf.length > 0 && !can(all(...(allOf as PermissionRule[])))) {
    isAllowed = false;
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
