'use client';

import * as React from 'react';
import { useSession } from '@/lib/hooks/use-session';

interface PermissionGateProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission } = useSession();

  let isAllowed = true;
  if (permission && !hasPermission(permission)) {
    isAllowed = false;
  }
  if (anyOf && anyOf.length > 0 && !anyOf.some((p) => hasPermission(p))) {
    isAllowed = false;
  }
  if (allOf && allOf.length > 0 && !allOf.every((p) => hasPermission(p))) {
    isAllowed = false;
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
