# Quickstart Validation Guide: Billing & Ledger Rewrite

**Branch**: `002-billing-ledger-rewrite` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

This quickstart guide documents runnable validation scenarios that verify the billing and ledger rewrite end-to-end, covering the append-only journal, dynamic balance computation, Excel import, and lot hold lifecycles.

---

## 1. Prerequisites & Environment Setup

Ensure environment variables are configured in `.env.local` or `.env.test`:
```bash
# Verify environment configuration
npm run test:e2e:utils
```

Install new runtime dependencies introduced for Excel workbook ingestion:
```bash
npm install xlsx
```

Execute baseline database migrations (including the new billing ledger schema):
```bash
npx supabase migration up
# or against cloud project:
npx supabase db push
```

---

## 2. Core Validation Scenarios

### Scenario 1: Append-Only Payment Posting & Dynamic Aging
**Goal**: Verify `SC-001`, `SC-003`, `SC-004`, `SC-007` (dynamic balances without stored totals, backdated payments, non-destructive reversals).

1. **Seed or select an active account**:
   - Total Contract Price: ₱180,000.00
   - Schedule: 60 installments @ ₱3,000.00/month
2. **Post an out-of-order payment**:
   - Value date: 2 years prior
   - Amount: ₱9,000.00 (settles 3 installments)
   - Method: Cash, OR: `OR-2026-001`
3. **Assert**:
   - `outstanding_principal` decreases by exactly ₱9,000.00 to ₱171,000.00.
   - `installments_behind` decreases by 3.
   - `billing_transaction` contains exactly 1 payment entry with `transaction_sequence = 1`.
4. **Reverse the payment**:
   - Call `reverseTransaction(accountId, transactionId, "Entered under wrong lot")`.
5. **Assert**:
   - Balances and `installments_behind` immediately return to their pre-payment state.
   - No rows were deleted from `billing_transaction`; reversal entry exists with sequence #2.

```bash
# Run automated suite
npm run test:e2e -- scripts/tests/billing/billing-journal.test.ts
```

---

### Scenario 2: Legacy Excel Workbook Import & Review Queue
**Goal**: Verify `SC-012`, `SC-016`, `SC-018` (importing hand-maintained workbooks and flagging contradictions).

1. **Prepare test fixture**:
   - `scripts/tests/fixtures/sample-legacy-soa.xlsx` with:
     - 60 installment rows
     - 1 payment with payment date preceding installment due date
     - Printed footer total that disagrees by ₱500.00 with the sum of rows
2. **Execute import Server Action**:
   - Call `importLegacyStatements({ format: 'xlsx', fileBase64: ... })`
3. **Assert**:
   - Account and historical transactions imported successfully.
   - Database balance recomputed from dated rows, ignoring printed footer total.
   - Discrepancy logged in `billing_import_discrepancy` with type `total_mismatch`.
   - Discrepancy appears in `/dashboard/billing` review queue.
4. **Resolve discrepancy**:
   - Call `resolveDiscrepancy({ discrepancyId, status: 'resolved', resolutionNotes: 'Recomputed from official receipts' })`.
   - Item marked resolved with staff identity and timestamp.

```bash
# Run automated import test
npm run test:e2e -- scripts/tests/billing/billing-excel-import.test.ts
```

---

### Scenario 3: Forfeited Account & Lot Hold Verification
**Goal**: Verify `SC-010`, `SC-014`, `SC-019` (holding forfeited lots, Maceda cash surrender value display, and deliberate reopening).

1. **Trigger Forfeiture on Matured Account**:
   - Account has 3 overdue notices (1st, 2nd, Final Demand).
   - Staff confirms forfeiture: system computes statutory Maceda CSV (e.g. ₱45,000.00) and displays it beside the agreed settlement.
2. **Assert**:
   - Account status becomes `forfeited`.
   - `held_since` timestamp recorded.
   - Linked `property_lot` status is locked to prevent assignment to any other buyer.
3. **Attempt duplicate contract**:
   - Creating a new contract on this lot is rejected with constraint error.
4. **Reopen lot**:
   - Staff checks checklist and calls `reopenForfeitedLot(accountId)`.
   - Lot becomes available; forfeited account remains closed with arrears archived.

```bash
# Run automated lifecycle test
npm run test:e2e -- scripts/tests/billing/billing-lot-hold.test.ts
```

---

### Scenario 4: Printable Statement Generation
**Goal**: Verify `SC-002`, `SC-006`, `SC-011` (all numbers rounded to 2 decimals, zero jargon like "delinquent", generation in < 2 seconds).

1. **Invoke Statement Generation**:
   - Call `generateStatement(accountId)`.
2. **Verify JSON & Print View**:
   - Vocabulary matches domain rules ("Matured", "Total Selling Price", "Penalty", "Monthly Installment Due").
   - Every figure has exactly 2 decimal places.
   - Time elapsed $< 500\text{ms}$.

```bash
# Run automated statement test
npm run test:e2e -- scripts/tests/billing/billing-statement.test.ts
```
