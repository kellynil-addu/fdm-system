# Quickstart Validation Guide: Billing UI Rewrite & User Experience Overhaul

**Feature**: `005-billing-ui-rewrite` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

This quickstart guide documents verification scenarios for testing the overhauled Billing & Collections UI end-to-end, covering the dense tabular dashboard, unified account workspace, PDC portfolio, discrepancy review queue, and deliberate lot hold lifecycles.

---

## 1. Prerequisites & Environment Setup

Verify that the local development server is running and database migrations from feature `002` are applied:
```bash
# Check TypeScript sound compilation
npx tsc --noEmit

# Ensure dev server or test environment is running
npm run test:e2e:billing
```

---

## 2. Interactive User Scenarios

### Scenario 1: High-Density Table Filtering & Quick Cashier Tender

1. **Navigate to the Billing Dashboard**:
   - Open `/dashboard/billing`.
   - Verify KPI cards display: Total Receivables, Collected MTD, Accounts In Arrears, Maturing PDCs, and Pending Review Discrepancies.
2. **Filter & Search**:
   - Click the "In Arrears" filter tab.
   - Verify all displayed accounts show the "In Arrears" warning badge and overdue months indicator (with zero occurrences of the word "delinquent").
   - Type a buyer's name or lot number (e.g., "Lot 1") in the search input; verify real-time table filtering in $<200\text{ms}$.
3. **Quick Payment Tender**:
   - Click the "Pay" action icon on any active account row.
   - The Payment modal opens with buyer and lot details pre-populated.
   - Enter `₱3,000.00`, OR Number, and select "Cash".
   - Submit payment; verify the remaining balance decreases immediately on the table without full page reload.

---

### Scenario 2: Unified Account Detail Workspace & Reversible Journal

1. **Open Account Workspace**:
   - Click any account row or direct navigate to `/dashboard/billing/[accountId]`.
   - Verify the top summary card renders:
     - Total Contract Price & Remaining Principal Balance.
     - Buyer Profile with TIN, Civil Status, and Primary Contact.
     - Lot designation, Area ($m^2$), and Title status.
2. **Review Journal Tab**:
   - Switch to the "Ledger Transactions" tab.
   - Verify every transaction displays a monotonic sequence number (`#1`, `#2`, `#3...`), value date, transaction type, OR number, and posting staff identity.
3. **Execute Non-Destructive Reversal**:
   - On a payment row, click the "Reverse" button.
   - Enter the reason: "Customer check replaced before clearing".
   - Confirm reversal; observe that:
     - The original row remains visible with a "Reversed" strikethrough badge.
     - A new reversal transaction entry is appended at the bottom with the next sequence number.
     - Account dynamic balances and installments behind update instantaneously.

---

### Scenario 3: Global Post-Dated Check (PDC) Management

1. **Access PDC Portfolio**:
   - On `/dashboard/billing`, click the "PDC Tracker" top tab.
   - View the table of all registered checks on hand across accounts.
2. **Filter Maturing Checks**:
   - Filter by "Maturing in 30 Days".
   - Identify checks requiring bank deposit.
3. **Status Transition**:
   - Click the status dropdown on a pending check.
   - Select "Cleared" or "Bounced".
   - If "Bounced", observe that the check status updates with an alert badge, and an audit note is logged.

---

### Scenario 4: Legacy Workbook Discrepancy Review Queue

1. **Upload Legacy Excel Workbook**:
   - Click "Import Legacy SOA" on the toolbar.
   - Select a sample legacy `.xlsx` file containing formula mismatches.
   - Complete upload.
2. **Inspect Review Queue**:
   - Click the "Review Queue" tab on `/dashboard/billing`.
   - Observe pending items with raw file values vs. recomputed system values side-by-side.
3. **Resolve Discrepancy**:
   - Click "Resolve" on a discrepancy row.
   - Enter resolution remarks: "Verified with official receipts archive; recomputed balance approved."
   - Confirm; the item moves to resolved with staff identity and timestamp.

---

### Scenario 5: Forfeited Account, Maceda Law Surrender & Deliberate Lot Hold

1. **Inspect Forfeited Account**:
   - Filter accounts by "Forfeited".
   - Open a forfeited account detail page.
2. **Verify Maceda Law Cash Surrender Calculation**:
   - Switch to the "Legal & Forfeiture" tab.
   - Verify the statutory Cash Surrender Value breakdown (RA 6552) is clearly presented alongside the cancellation notice history.
3. **Deliberate Lot Hold Release**:
   - Verify the lot status is locked as "Forfeited (On Hold)".
   - Click "Release Lot Hold".
   - Complete the statutory checklist (confirming notice delivery and 30-day cure expiration).
   - Submit; the lot is released and made available for inventory assignment.
