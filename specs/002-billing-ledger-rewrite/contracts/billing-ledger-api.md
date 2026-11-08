# Interface Contracts: Billing & Ledger Rewrite

**Branch**: `002-billing-ledger-rewrite` | **Date**: 2026-11-08 | **Spec**: [spec.md](../spec.md)

This document formalizes the Server Actions, database RPCs, and query response payloads for `/dashboard/billing`.

---

## 1. Server Actions & Permissions

All mutations use `createScope` with RBAC permission enforcement:

| Server Action | Permission Required | Description |
|---|---|---|
| `getBillingAccounts(filters)` | `billing.read` | Paginated account list with dynamic arrears & aging |
| `getBillingAccountDetail(accountId)` | `billing.read` | Full account view: transactions, schedule, notices, PDCs |
| `generateStatement(accountId)` | `billing.read` | Generates printable statement data model |
| `recordPayment(input)` | `billing.create` | Posts a payment, allocates waterfall, updates journal |
| `reverseTransaction(input)` | `billing.update` | Reverses a posted entry non-destructively |
| `attachPenaltyArrangement(input)` | `billing.update` | Sets effective-dated penalty policy for account |
| `recordPostDatedCheck(input)` | `billing.create` | Records a PDC (record-only, no balance move) |
| `restructureAccount(input)` | `billing.update` | Re-spreads remaining unpaid principal (max 12 mos) |
| `recordNotice(input)` | `billing.create` | Dispatches 1st/2nd/Final demand letter |
| `updateNoticeDelivery(input)` | `billing.update` | Updates delivery status (Dispatched, Delivered, RTS) |
| `reopenForfeitedLot(input)` | `billing.update` | Clears document checklist and releases held lot |
| `importLegacyStatements(input)` | `billing.create` | Ingests Excel (.xlsx/.xls) or CSV workbooks |
| `getDiscrepancyQueue(filters)` | `billing.read` | Lists statements with arithmetic contradictions |
| `resolveDiscrepancy(input)` | `billing.update` | Records resolution note and clears review item |

---

## 2. Dynamic Account Summary Payload

Returned by `getBillingAccountDetail` and computed from database transactions:

```typescript
export interface BillingAccountSummaryView {
  account_id: string;
  property_id: string;
  property_lot: {
    lot_number: string;
    block_number: string;
    project_area_name: string;
    status: string;
  };
  client: {
    client_id: string;
    full_name: string;
    civil_status: string;
    spouse_name: string | null;
    tin: string | null;
    primary_contact: string | null;
  };
  cts_number: string | null;
  contract_date: string;
  status:
    | 'active'
    | 'matured'
    | 'fully_paid'
    | 'fully_paid_unclaimed'
    | 'cancelled'
    | 'restructured'
    | 'forfeited';

  // Financial Breakdown (All centavo-rounded numbers)
  total_selling_price: number;
  total_paid: number;
  outstanding_principal: number;
  penalties_accrued: number;
  penalties_waived: number;
  penalties_paid: number;
  penalties_due: number;
  fees_due: number;
  storage_fees_accrued: number;
  total_due: number;
  overpayment_credit: number; // Stored credit when total_paid > total_selling_price

  // Aging & Arrears
  installments_behind: number;
  oldest_unpaid_due_date: string | null;
  days_past_due: number;

  // Holds
  held_since: string | null;
  hold_duration_days: number | null;
}
```

---

## 3. Printable Statement Payload (`FR-041`, `SC-002`)

```typescript
export interface StatementPrintPayload {
  statement_date: string;
  account: BillingAccountSummaryView;
  contract_baseline_terms: {
    cts_number: string | null;
    contract_date: string;
    original_terms_months: number;
    monthly_installment: number;
    penalty_rate_percent: number;
  };
  applied_arrangement: {
    policy_name: string;
    rate_percent: number;
    authority: string;
    effective_start: string;
    effective_end: string | null;
  };
  schedule: Array<{
    installment_number: number;
    due_date: string;
    amount: number;
    amount_paid: number;
    status: 'paid' | 'partial' | 'overdue' | 'future';
    settled_date: string | null;
  }>;
  charges: Array<{
    charge_date: string;
    charge_type: 'penalty' | 'storage_fee' | 'titling_fee';
    period_label: string;
    rate_applied: string;
    amount: number;
    amount_waived: number;
    amount_paid: number;
    balance: number;
  }>;
  payments: Array<{
    payment_date: string;
    or_series: string;
    or_number: string;
    payment_mode: string;
    total_received: number;
    allocated_principal: number;
    allocated_penalties: number;
    allocated_fees: number;
    allocated_credit: number;
  }>;
  totals: {
    principal_balance: number;
    penalties_balance: number;
    fees_balance: number;
    overpayment_credit: number;
    net_total_due: number;
  };
}
```
