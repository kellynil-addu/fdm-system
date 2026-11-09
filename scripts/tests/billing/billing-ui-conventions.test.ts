import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BILLING_STATUS_BADGE_VARIANT,
  getBillingStatusLabel,
} from '@/lib/status-colors';

describe('Billing UI Conventions & Design System Invariants', () => {
  it('maps all canonical billing statuses to valid shadcn Badge variants', () => {
    const validVariants = ['default', 'secondary', 'outline', 'success', 'warning', 'info', 'destructive'];
    const statuses = ['Active', 'In Arrears', 'in_arrears', 'Matured', 'Cleared', 'Forfeited', 'Restructured', 'Cancelled'] as const;

    for (const status of statuses) {
      const variant = BILLING_STATUS_BADGE_VARIANT[status];
      expect(validVariants).toContain(variant);
    }
  });

  it('prohibits delinquent terminology in human-facing labels', () => {
    const labels = [
      getBillingStatusLabel('in_arrears'),
      getBillingStatusLabel('delinquent'),
      getBillingStatusLabel('Active'),
      getBillingStatusLabel('Matured'),
      getBillingStatusLabel('Cleared'),
      getBillingStatusLabel('Forfeited'),
    ];

    for (const label of labels) {
      expect(label.toLowerCase()).not.toContain('delinquent');
    }
  });

  it('guarantees no raw slash-opacity tokens on custom hex variables in dashboard-billing components', () => {
    const billingDir = path.resolve(process.cwd(), 'components/dashboard-billing');
    const files = fs.readdirSync(billingDir).filter((f) => f.endsWith('.tsx'));

    // Hex tokens in globals.css break in browsers if used with /10 or /90 opacity modifiers
    const slashOpacityRegex = /(bg|text|border)-(primary|success|warning|destructive|border-warm)\/\d+/;

    for (const file of files) {
      const content = fs.readFileSync(path.join(billingDir, file), 'utf-8');
      const match = content.match(slashOpacityRegex);
      expect(match, `Found invalid slash-opacity token in ${file}: ${match?.[0]}`).toBeNull();
    }
  });

  it('guarantees billing-payment-modal does not require an unconditional BillingAccountsProvider', () => {
    const paymentModalPath = path.resolve(
      process.cwd(),
      'components/dashboard-billing/billing-payment-modal.tsx'
    );
    const content = fs.readFileSync(paymentModalPath, 'utf-8');

    // Must not call useBillingAccounts directly, as it crashes on the standalone account detail route
    expect(content).not.toMatch(/\buseBillingAccounts\s*\(/);
    expect(content).toContain('useOptionalBillingAccounts');
    expect(content).toContain('recordLedgerPayment');
  });
});
