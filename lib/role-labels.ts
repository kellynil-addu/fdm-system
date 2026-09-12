/**
 * Human-readable names for the `rbac.role` slugs.
 *
 * The admin panel previously rendered the raw slug (`system_admin`,
 * `billing_staff`), which testers found hard to read.
 */
const ROLE_LABELS: Record<string, string> = {
  system_admin: "System Administrator",
  admin_staff: "Admin Staff",
  billing_staff: "Billing Staff",
  legal_staff: "Legal Staff",
  accounting_staff: "Accounting Staff",
};

/**
 * Falls back to title-casing the slug so a role added to the database later
 * still renders sensibly instead of disappearing or showing raw snake_case.
 */
export function roleLabel(name: string): string {
  return (
    ROLE_LABELS[name] ??
    name
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  );
}
