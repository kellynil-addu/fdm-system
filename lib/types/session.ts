import type { CapabilityOrRule } from "@/lib/capabilities";

export interface SessionUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface UserSession {
  user: SessionUser | null;
  roles: string[];
  permissions: string[];
  isSystemAdmin: boolean;
}

export interface SessionContextValue {
  session: UserSession;
  user: SessionUser | null;
  roles: string[];
  permissions: string[];
  isSystemAdmin: boolean;
  can: (rule: CapabilityOrRule) => boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}
