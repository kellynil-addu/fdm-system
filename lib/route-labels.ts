export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Client records',
  properties: 'Property inventory',
  map: 'Project Area Map',
  admin: 'Team & access',
  settings: 'Account Settings',
  billing: 'Billing & ledgers',
  accounting: 'Accounts Payable',
  legal: 'Title releases',
  operations: 'Operations Log',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolves a route segment into a human-readable label based on route context
export function getSegmentLabel(segment: string, parentSegment?: string): string {
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment];
  }

  if (parentSegment === 'clients') {
    return 'Client Profile';
  }
  if (parentSegment === 'properties') {
    return 'Lot Details';
  }
  if (parentSegment === 'billing') {
    return 'Ledger Account';
  }
  if (parentSegment === 'legal' || parentSegment === 'titles') {
    return 'Title Record';
  }

  if (UUID_REGEX.test(segment)) {
    return 'Record Details';
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

// Builds an array of breadcrumb items with human-readable labels from a pathname
export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] !== 'dashboard') {
    return [{ label: 'Dashboard', isCurrent: true }];
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;
    const parentSegment = i > 0 ? segments[i - 1] : undefined;

    const label = getSegmentLabel(segment, parentSegment);

    items.push({
      label,
      href: isLast ? undefined : currentPath,
      isCurrent: isLast,
    });
  }

  return items;
}

// Returns the human-readable page name for the leaf segment of a dashboard pathname
export function getPageNameFromPathname(pathname: string): string {
  const breadcrumbs = getBreadcrumbs(pathname);
  if (breadcrumbs.length === 0) return 'Dashboard';
  return breadcrumbs[breadcrumbs.length - 1].label;
}
