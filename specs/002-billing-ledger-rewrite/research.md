# Research & Technical Decisions: Billing & Ledger Rewrite

**Branch**: `002-billing-ledger-rewrite` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

This document consolidates architectural investigations, technology choices, and design patterns for the billing and ledger rewrite.

---

## 1. Excel Workbook Parsing for Legacy Statements

### Context
Legacy statements dating back to 2004 are authored in Excel workbooks (`.xlsx` and binary `.xls`). `FR-052` mandates importing these workbooks directly, recomputing rows, and pushing discrepancies to a review queue (`FR-057`).

### Options Evaluated
1. **`xlsx` (SheetJS)**:
   - *Pros*: Battle-tested parser supporting both modern `.xlsx` (OpenXML) and legacy `.xls` (BIFF8 binary format) used in the mid-2000s; zero native C++ bindings; runs synchronously or buffer-driven in Node.js server actions.
   - *Cons*: Advanced styling features are paid, but raw cell parsing, dates, formulas, and numeric extraction are completely free and open-source.
2. **`exceljs`**:
   - *Pros*: Excellent `.xlsx` streaming reader/writer.
   - *Cons*: Does not support legacy `.xls` binary format (pre-2007 Excel files). FDM historical data starts in 2004.
3. **`csv-parse`**:
   - *Pros*: Already present/used for CSV.
   - *Cons*: Cannot read Excel files directly; forcing staff to export hundreds of legacy workbooks to CSV violates capacity constraints.

### Decision
Introduce **`xlsx`** (`npm i xlsx`) for parsing uploaded `.xlsx` and `.xls` workbook buffers in Server Actions. Pair with existing CSV parser so both formats are supported (`FR-053`).

---

## 2. Numeric Precision and Centavo Money Math

### Context
`FR-010` and `SC-006` require that every amount be rounded to two decimal places (centavos) on write, with zero floating-point drift or fractional-centavo leakage across years of compound calculations.

### Options Evaluated
1. **Native JavaScript `number` with floating point**:
   - *Risk*: `0.1 + 0.2 === 0.30000000000000004`. Over 60 installments and compound penalty accruals, fractional pennies accumulate.
2. **Integer Centavos**:
   - *Pros*: Storing and calculating in integer centavos (`₱1,500.50` stored as `150050` cents) guarantees exact integer math.
   - *Cons*: Database schema standard for Philippine accounting and Supabase postgREST maps `NUMERIC(15, 2)` to standard numbers/strings.
3. **Scaled Centavo Rounding Utility with `NUMERIC(15, 2)`**:
   - *Approach*: Database columns enforce `NUMERIC(15, 2)` strictly. In TypeScript domain logic, define an immutable money arithmetic utility `roundCentavos(amount: number): number` using `Math.round((amount + Number.EPSILON) * 100) / 100`, or `toCentavos(pesos)` / `fromCentavos(cents)`.
   - *SQL Enforcement*: Postgres `ROUND(val::numeric, 2)` and column definitions `NUMERIC(15, 2)` everywhere.

### Decision
Use database `NUMERIC(15, 2)` for all monetary columns and implement a shared pure utility (`lib/billing/money.ts`) providing `roundCentavos`, `addMoney`, `subtractMoney`, and centavo-safe amortization schedule generation.

---

## 3. Balances Derived from Append-Only Transactions

### Context
`FR-007`, `FR-011`, and `FR-012` forbid storing remaining balances. Stored balances break down during out-of-order historical backfills. All balances (principal, penalties, fees, overpayment credits, installments behind) must be derived from the append-only transaction ledger and baseline cutover snapshot.

### Options Evaluated
1. **Dynamic Client-Side Calculation on every fetch**:
   - *Pros*: Zero sync triggers or denormalized balance columns to drift.
   - *Cons*: As transaction volume grows, querying all raw rows on every list view could be slow if unindexed.
   - *Mitigation*: FDM's operational scale is small (hundreds of accounts, single-digit transactions per month). A Postgres SQL View or composite SQL function (`calculate_account_ledger_summary(account_id)`) can compute balances in-database using aggregate queries (`SUM(CASE WHEN ...)`) with sub-millisecond response times.
2. **Stored `remaining_balance` with triggers (Old Architecture)**:
   - *Why Rejected*: Existing trigger `handle_ledger_payment_reconciliation` overwrote `remaining_balance`. When payments were entered out of historical order, every subsequent balance calculation became corrupted.

### Decision
Create a PostgreSQL database view / RPC `get_billing_account_summary` that computes:
- `outstanding_principal` = `total_contract_price - baseline_principal_paid - SUM(principal_applied)`
- `penalties_accrued` = `baseline_penalties_accrued + SUM(penalty_charged) - SUM(penalty_applied) - SUM(penalty_waived)`
- `fees_accrued` = `SUM(fee_charged) - SUM(fee_applied)`
- `overpayment_credit` = `GREATEST(0, total_paid - total_due)`
- `installments_behind` and `oldest_unpaid_date` derived by matching committed schedule installments against cumulative principal payments.

---

## 4. Installment Schedule Versioning & Installment Allocations

### Context
`FR-002`, `FR-003`, and `FR-004` mandate committing an explicit schedule of dated, priced installments summing exactly to the total selling price. Restructuring (`FR-040`) creates a new schedule version without destroying the prior schedule.

### Schema Design
- `billing_schedule`: `schedule_id`, `account_id`, `version`, `effective_date`, `is_active`, `reason`
- `billing_schedule_installment`: `installment_id`, `schedule_id`, `installment_number` (1..N), `due_date`, `principal_amount`, `interest_amount`, `total_amount`
- Constraint: Trigger or application assertion checking `SUM(total_amount) = account.total_contract_price`. Residual centavos in amortization division are explicitly placed in installment #N (`FR-003`).

---

## 5. Effective-Dated Penalty Policy & Storage Fee Modeling

### Context
`FR-022`–`FR-030` dictate that penalty arrangements are separate records effective over date ranges and attached explicitly per account (`FR-025`). Storage fees (`FR-033`) are recurring holding charges outside the contract price.

### Schema Design
- `billing_penalty_policy`: Defines policy templates (e.g. "Standard 3.5% on overdue installment", "Pandemic Bayanihan 0% Moratorium", "Compromise Amnesty").
- `billing_account_penalty_arrangement`: Attaches a policy to an `account_id` from `start_date` to `end_date`, recording approval, authority, and whether it extends the contract term (`FR-030`).
- `billing_holding_charge`: Tracks the monthly ₱540 (or configurable) storage fee starting after the free period post title release. Accrues beside the contract without affecting the "fully paid" contract state.

---

## 6. Notice Tracking & RTS Preservation

### Context
`FR-047`–`FR-051` require retaining notice dispatch and RTS (Return to Sender) tracking as legal evidence for forfeiture. The existing `ledger_account_notice` table structure is sound and will be migrated to the new schema conventions (`billing_account_notice`), retaining full history and file attachment links.

---

## 7. Review Queue for Legacy Discrepancies

### Context
`FR-057` and `FR-058` require importing self-contradictory legacy statements while capturing each discrepancy (e.g., printed totals != sum of rows, payments preceding due dates, non-standard installments) into an actionable review queue without blocking import.

### Schema Design
- `billing_import_job`: Tracks file name, uploaded by, format (Excel/CSV), total statements, clean count, flagged count.
- `billing_import_discrepancy`: `discrepancy_id`, `job_id`, `account_id`, `discrepancy_type`, `description`, `sheet_row_data`, `status` ('Pending', 'Resolved', 'Dismissed'), `resolved_by`, `resolved_at`, `resolution_notes`.
