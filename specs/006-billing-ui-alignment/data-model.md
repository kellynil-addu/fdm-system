# Data Model & View State: Billing UI Convention & Primitives Alignment

**Feature**: `006-billing-ui-alignment` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

This document formalizes the view models, controller configurations, and primitive prop mappings for the refactored billing components.

---

## 1. List Controller Configuration (`useListController`)

The primary accounts list and sub-portfolio lists (PDCs, Review Queue) utilize `useListController`:

```ts
import type { UseListControllerOptions } from '@/lib/hooks/use-list-controller';
import type { BillingAccountSummary } from '@/lib/types/billing';

export interface BillingFilterState {
  status: 'all' | 'Active' | 'in_arrears' | 'Matured' | 'Cleared' | 'Forfeited';
  search: string;
}

export const BILLING_ACCOUNTS_CONTROLLER_CONFIG: UseListControllerOptions<
  BillingAccountSummary,
  BillingFilterState
> = {
  filterPredicate: (account, filters) => {
    // 1. Status matching
    if (filters.status !== 'all') {
      if (filters.status === 'in_arrears') {
        const isArrears =
          account.status === 'Delinquent' ||
          (account.installments_behind ?? 0) > 0 ||
          (account.days_past_due ?? 0) > 30;
        if (!isArrears) return false;
      } else if (account.status !== filters.status) {
        return false;
      }
    }

    // 2. Search matching (Buyer, Lot, Title)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const buyerName = account.client?.full_name?.toLowerCase() ?? '';
      const lot = `block ${account.property.block_number} lot ${account.property.lot_number}`.toLowerCase();
      const location = account.property.location.toLowerCase();
      return buyerName.includes(q) || lot.includes(q) || location.includes(q);
    }

    return true;
  },
  pageSize: 25,
};
```

---

## 2. Primitive Status & Badge Mappings

Canonical billing statuses map directly to `Badge` and `CallingCard` primitive variants without hand-rolled classes:

```ts
// lib/status-colors.ts

export const BILLING_STATUS_VARIANT: Record<
  CanonicalAccountStatus | 'Delinquent' | 'in_arrears',
  'success' | 'warning' | 'default' | 'info' | 'destructive' | 'muted'
> = {
  Active: 'success',
  'In Arrears': 'warning',
  in_arrears: 'warning',
  Delinquent: 'warning', // Canonical fallback
  Matured: 'info',
  Cleared: 'default',
  Forfeited: 'destructive',
  Restructured: 'info',
  Cancelled: 'muted',
};

export const BILLING_STATUS_BADGE_VARIANT: Record<
  CanonicalAccountStatus | 'Delinquent' | 'in_arrears',
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'info' | 'destructive'
> = {
  Active: 'success',
  'In Arrears': 'warning',
  in_arrears: 'warning',
  Delinquent: 'warning',
  Matured: 'info',
  Cleared: 'secondary',
  Forfeited: 'destructive',
  Restructured: 'info',
  Cancelled: 'outline',
};
```

---

## 3. Surface & Card Archetypes

| Component | Surface Type | Container Primitive | Border Token | Hover Token |
|:---|:---|:---|:---|:---|
| **KPI Cards** (`billing-kpi-cards.tsx`) | Canvas | `<Card variant="canvas">` | `--border-warm` | `hover:bg-card` |
| **Accounts Ledger** (`billing-accounts-table.tsx`) | Card | `<Card variant="default">` | `--border` | `hover:bg-row-hover` |
| **PDC Tracker** (`billing-pdc-tracker.tsx`) | Card | `<Card variant="default">` | `--border` | `hover:bg-row-hover` |
| **Review Queue** (`billing-discrepancy-queue.tsx`) | Card | `<Card variant="default">` | `--border` | `hover:bg-row-hover` |
| **Account Summary Sidebar** (Detail Workspace) | Card | `<Card variant="default">` | `--border` | N/A |
| **Detail Workspace Tabs** (Detail Workspace) | Card | `<Card variant="default">` | `--border` | `hover:bg-row-hover` |
