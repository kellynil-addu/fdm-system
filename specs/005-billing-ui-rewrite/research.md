# Phase 0 Research: Billing UI Rewrite & User Experience Overhaul

**Feature**: `005-billing-ui-rewrite`  
**Date**: 2026-11-08  
**Status**: Completed  

## 1. Executive Summary & Goals

Feature `002-billing-ledger-rewrite` delivered an append-only transaction journal, dynamic balance computation, SheetJS Excel workbook ingestion, and Macedonian statutory surrender math in the backend and database layer. However, the existing UI on `/dashboard/billing` still relied on legacy card containers and popups (`billing-account-dialog.tsx`) that obscured sequential transaction numbering, made cross-account PDC tracking difficult, and hid legacy Excel discrepancy resolution.

This research establishes the UI architecture, layout hierarchy, and interaction paradigms to transform `/dashboard/billing` into a high-density, cashier-friendly operational workspace tailored for the firm's skeletal workforce in wind-down.

---

## 2. Decision Log & Design Solutions

### Decision 1: High-Density Table View vs. Card Grid

- **Context**: Billing staff oversee hundreds of accounts with frequent lookups for OR numbers, overdue months, and balance verifications. The previous 3-column card grid required excessive vertical scrolling and truncated transaction sequences.
- **Decision**: Make a dense, sortable, and searchable Table the primary view on `/dashboard/billing`, while retaining a quick-toggle option for Cards.
- **Rationale**: Dense tabular layouts align with user workflows in accounting, property inventory, and client management. Staff can scan 20+ accounts per screen, sort by "Overdue Months" or "Remaining Balance", and launch action modals in a single click.

### Decision 2: Dedicated Account Workspace Route vs. Modal Dialog

- **Context**: Servicing a buyer requires reviewing up to 60 installment schedule lines, 20+ journal payments, reversible receipts, attached penalty policies, and PDC lists. cramming all this into a floating modal dialog (`billing-account-dialog.tsx`) resulted in nested scrollbars and cramped modals.
- **Decision**: Leverage the dedicated page `/dashboard/billing/[accountId]` as the full Account Detail Workspace, and keep a responsive Quick-Drawer/Sheet on the main dashboard for rapid inspections.
- **Rationale**: Deep-linkable URLs allow bookkeepers to share direct links to accounts, support native browser back/forward navigation, and provide full horizontal width for side-by-side audit breakdowns.

### Decision 3: Tabbed Ledger Navigation Hierarchy

- **Context**: An account encompasses several distinct financial-legal facets: raw journal transactions, amortization schedules, PDCs, penalty policies, demand notices, and statements.
- **Decision**: Structure the Account Detail Workspace into standard Radix/shadcn tabs:
  1. `ledger`: Append-only journal table (Seq #, Value Date, Type, OR #, Amount, Posted By, Reversal badge/action).
  2. `schedule`: Versioned installment amortization schedule (Due Date, Monthly Due, Status, Principal Paid).
  3. `pdcs`: Post-dated check portfolio for this account (Bank, Check #, Maturity Date, Amount, Status).
  4. `penalties`: Effective-dated penalty arrangement, board waiver history, and monthly calculation inspector.
  5. `notices`: Legal demand notices, Maceda Law surrender breakdown, and forfeiture/lot hold status.
  6. `statement`: Live printable Statement of Account preview with print stylesheet.

### Decision 4: Global PDC Portfolio & Discrepancy Review Queue Integration

- **Context**: Post-dated checks and legacy workbook discrepancies span across accounts, not just within a single account. Cashiers need to see all checks maturing this week, and billing managers need to clear all pending import discrepancies.
- **Decision**: Add top-level tabs on `/dashboard/billing`:
  - `Accounts` (default dense ledger table)
  - `PDC Tracker` (portfolio view of all on-hand checks across buyers, filterable by maturity date)
  - `Review Queue` (discrepancy review table for imported legacy workbooks)
- **Rationale**: Eliminates cross-account hunting. Staff can deposit batches of checks or resolve import batches from single screens.

### Decision 5: Non-Destructive Reversals & Modals UX

- **Context**: Financial transactions are immutable. Payments can only be reversed by posting a compensating reversal journal entry.
- **Decision**:
  - The "Reverse" button appears inline on payment rows in the transaction ledger.
  - Clicking it opens `BillingReversalModal`, requiring an audit reason (e.g. "Misallocated check").
  - On submission, the UI immediately marks the original row with a visual "Reversed" strikethrough/badge and appends the reversal entry with sequence incrementation.

### Decision 6: Zero Delinquent Phrasing & Exact Centavo Formatting

- **Context**: The FDM domain guidelines strictly prohibit derogatory labeling like "delinquent". All currency figures must render to exact centavos (2 decimal places).
- **Decision**: Enforce standard utility formatters across all UI components:
  - Status labels: `In Arrears`, `Matured`, `Active`, `Cleared`, `Forfeited`.
  - Amounts: `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
  - Zero floating-point rounding errors on screen.

---

## 3. Component Architecture & File Layout

Following `AGENTS.md` rules (all components strictly 1 level deep under `components/dashboard-billing/`):

```text
components/dashboard-billing/
├── billing-records-section.tsx         # Main container hosting Top Tabs (Accounts, PDCs, Review Queue)
├── billing-table-toolbar.tsx           # Search input, status filter pills, and action buttons
├── billing-accounts-table.tsx          # High-density desktop table for accounts
├── billing-account-card.tsx            # Card representation for mobile/card view toggle
├── billing-kpi-cards.tsx               # Portfolio summary metrics (Receivables, MTD, Arrears, PDCs)
├── billing-pdc-tracker.tsx             # Global PDC management table with deposit maturity alerts
├── billing-discrepancy-queue.tsx       # Global review queue for legacy Excel import discrepancies
├── billing-account-detail-workspace.tsx# Master workspace container on /dashboard/billing/[accountId]
├── billing-journal-tab.tsx             # Append-only transaction journal table with inline reversal trigger
├── billing-schedule-tab.tsx            # Versioned installment schedule table
├── billing-pdc-tab.tsx                 # Account-specific PDC sub-table
├── billing-penalties-tab.tsx           # Date-bounded penalty policy & waiver history
├── billing-notices-tab.tsx             # Demand notices, Maceda CSV breakdown & lot hold controls
├── billing-statement-view.tsx          # Printable customer Statement of Account
├── billing-payment-modal.tsx           # Cashier tender modal with waterfall allocation preview
├── billing-reversal-modal.tsx          # Non-destructive reversal confirmation dialog
├── billing-restructure-modal.tsx       # Term re-spreading modal (up to 12 months)
├── billing-pdc-modal.tsx               # Register new post-dated checks
├── billing-penalty-modal.tsx           # Attach penalty policy or board waiver
├── billing-excel-import-modal.tsx      # SheetJS .xlsx workbook upload dialog
├── billing-discrepancy-modal.tsx       # Discrepancy resolution dialog with staff notes
└── billing-lot-hold-dialog.tsx         # Maceda surrender & deliberate lot hold release dialog
```

---

## 4. Verification Strategy

1. **Unit & Component Testing**: Validate filter logic, centavo formatting, and tab switching via React component tests.
2. **Integration Verification**: Ensure all UI buttons trigger validated Server Actions in `lib/actions/billing.ts` without errors.
3. **Playwright Layout & Fit Verification**: Run headless browser measurements to verify that table columns do not wrap awkwardly or clip action buttons on 1366x768 screens.
