import { describe, it, expect } from 'vitest';
import {
  getSegmentLabel,
  getBreadcrumbs,
  getPageNameFromPathname,
} from '@/lib/route-labels';

describe('Route Labels & Breadcrumbs', () => {
  it('maps known static dashboard segments to human-readable titles', () => {
    expect(getSegmentLabel('admin')).toBe('Team & access');
    expect(getSegmentLabel('billing')).toBe('Billing & ledgers');
    expect(getSegmentLabel('clients')).toBe('Client records');
    expect(getSegmentLabel('properties')).toBe('Property inventory');
    expect(getSegmentLabel('map')).toBe('Project Area Map');
    expect(getSegmentLabel('legal')).toBe('Title releases');
    expect(getSegmentLabel('accounting')).toBe('Accounts Payable');
  });

  it('resolves UUIDs and dynamic resource IDs to contextual human names', () => {
    const sampleUuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(getSegmentLabel(sampleUuid, 'billing')).toBe('Ledger Account');
    expect(getSegmentLabel(sampleUuid, 'clients')).toBe('Client Profile');
    expect(getSegmentLabel(sampleUuid, 'properties')).toBe('Lot Details');
    expect(getSegmentLabel(sampleUuid, 'legal')).toBe('Title Record');
    expect(getSegmentLabel(sampleUuid, 'unknown')).toBe('Record Details');
  });

  it('generates breadcrumbs with human names for UUID routes', () => {
    const crumbs = getBreadcrumbs(
      '/dashboard/billing/550e8400-e29b-41d4-a716-446655440000'
    );
    expect(crumbs).toHaveLength(3);
    expect(crumbs[0].label).toBe('Dashboard');
    expect(crumbs[1].label).toBe('Billing & ledgers');
    expect(crumbs[2].label).toBe('Ledger Account');
    expect(crumbs[2].isCurrent).toBe(true);
  });

  it('returns specific human page names from pathnames', () => {
    expect(getPageNameFromPathname('/dashboard/admin')).toBe('Team & access');
    expect(getPageNameFromPathname('/dashboard/legal')).toBe('Title releases');
    expect(
      getPageNameFromPathname('/dashboard/billing/550e8400-e29b-41d4-a716-446655440000')
    ).toBe('Ledger Account');
    expect(
      getPageNameFromPathname('/dashboard/clients/550e8400-e29b-41d4-a716-446655440000')
    ).toBe('Client Profile');
  });
});
