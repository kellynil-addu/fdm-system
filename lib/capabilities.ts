export type PermissionResource =
  | "clients"
  | "properties"
  | "billing"
  | "legal"
  | "accounting"
  | "system";

export type PermissionAction = "create" | "read" | "update" | "delete";

export type PermissionName = `${PermissionResource}.${PermissionAction}`;

export type EitherRule = {
  readonly type: "either";
  readonly rules: readonly PermissionRule[];
};

export type AllRule = {
  readonly type: "all";
  readonly rules: readonly PermissionRule[];
};

export type PermissionRule =
  | PermissionName
  | EitherRule
  | AllRule;

export type CapabilityName =
  | "client.view"
  | "client.create"
  | "client.edit"
  | "client.archive"
  | "client.delete"
  | "client.uploadDocument"
  | "client.editDocument"
  | "client.deleteDocument"
  | "client.manageContacts"
  | "client.recordActivity"
  | "property.view"
  | "property.create"
  | "property.edit"
  | "property.archive"
  | "property.delete"
  | "property.assign"
  | "property.editMap"
  | "billing.view"
  | "billing.edit"
  | "billing.clear"
  | "billing.delete"
  | "legal.view"
  | "legal.edit"
  | "legal.delete"
  | "system.view"
  | "system.manage";

export type CapabilityOrRule = CapabilityName | PermissionRule;

let capabilitiesMap: Record<string, PermissionRule> | null = null;

export function toRule(rule: CapabilityOrRule): PermissionRule {
  if (typeof rule === "string" && capabilitiesMap && rule in capabilitiesMap) {
    return capabilitiesMap[rule];
  }
  return rule as PermissionRule;
}

export function either(...rules: CapabilityOrRule[]): EitherRule {
  return { type: "either", rules: rules.map(toRule) };
}

export function all(...rules: CapabilityOrRule[]): AllRule {
  return { type: "all", rules: rules.map(toRule) };
}

export const CAPABILITIES: Record<CapabilityName, PermissionRule> = {
  "client.view": "clients.read",
  "client.create": "clients.create",
  "client.edit": "clients.update",
  "client.archive": either("clients.update", "clients.create"),
  "client.delete": "clients.delete",
  "client.uploadDocument": "clients.update",
  "client.editDocument": "clients.update",
  "client.deleteDocument": "clients.delete",
  "client.manageContacts": "clients.update",
  "client.recordActivity": "clients.update",

  "property.view": "properties.read",
  "property.create": "properties.create",
  "property.edit": "properties.update",
  "property.archive": "properties.update",
  "property.delete": "properties.delete",
  "property.assign": all("properties.update", "clients.update"),
  "property.editMap": "properties.update",

  "billing.view": "billing.read",
  "billing.edit": "billing.update",
  "billing.clear": "billing.update",
  "billing.delete": "billing.delete",

  "legal.view": "legal.read",
  "legal.edit": "legal.update",
  "legal.delete": "legal.delete",

  "system.view": "system.read",
  "system.manage": "system.create",
};

capabilitiesMap = CAPABILITIES;

export function checkPermissionRule(
  rule: CapabilityOrRule,
  hasPermission: (permission: string) => boolean
): boolean {
  if (typeof rule === "string") {
    if (rule in CAPABILITIES && CAPABILITIES[rule as CapabilityName] !== rule) {
      return checkPermissionRule(
        CAPABILITIES[rule as CapabilityName],
        hasPermission
      );
    }
    return hasPermission(rule);
  }

  if (rule.type === "either") {
    return rule.rules.some((r) => checkPermissionRule(r, hasPermission));
  }

  if (rule.type === "all") {
    return rule.rules.every((r) => checkPermissionRule(r, hasPermission));
  }

  return false;
}
