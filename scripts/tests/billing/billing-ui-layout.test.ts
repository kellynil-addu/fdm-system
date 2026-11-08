import { describe, it, expect } from 'vitest';
import { getBillingStatusVariant, getBillingStatusLabel } from '@/lib/status-colors';
import { formatCentavosToPhp } from '@/lib/status-colors';

describe('Billing UI Canonical Helpers & Formatting', () => {
  it('formats centavo integer values strictly into PHP currency with 2 decimal places', () => {
    expect(formatCentavosToPhp(125000)).toBe('₱125,000.00');
    expect(formatCentavosToPhp(3245.5)).toBe('₱3,245.50');
    expect(formatCentavosToPhp(0)).toBe('₱0.00');
    expect(formatCentavosToPhp(198000.75)).toBe('₱198,000.75');
  });

  it('guarantees zero occurrences of delinquent terminology in labels and maps to In Arrears', () => {
    const delinquentLabel = getBillingStatusLabel('delinquent');
    expect(delinquentLabel).toBe('In Arrears');
    expect(delinquentLabel.toLowerCase()).not.toContain('delinquent');

    const inArrearsLabel = getBillingStatusLabel('in_arrears');
    expect(inArrearsLabel).toBe('In Arrears');

    const variant = getBillingStatusVariant('in_arrears');
    expect(variant).toBe('warning');
  });

  it('maps all canonical statuses cleanly to shadcn badge variants', () => {
    expect(getBillingStatusVariant('active')).toBe('secondary');
    expect(getBillingStatusVariant('matured')).toBe('default');
    expect(getBillingStatusVariant('cleared')).toBe('success');
    expect(getBillingStatusVariant('forfeited')).toBe('destructive');
  });
});
