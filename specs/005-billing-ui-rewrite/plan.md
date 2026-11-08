# Implementation Plan: Billing UI Rewrite & User Experience Overhaul

**Branch**: `005-billing-ui-rewrite` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-billing-ui-rewrite/spec.md`

## Summary

Feature `002-billing-ledger-rewrite` implemented an append-only transaction journal, dynamic balance computation, SheetJS Excel workbook ingestion, and Macedonian statutory surrender math in the backend. This plan overhauls `/dashboard/billing` and `/dashboard/billing/[accountId]` to deliver a high-density, cashier-friendly user interface. The overhaul introduces a dense, sortable accounts table with instant filtering, a dedicated multi-tab Account Workspace, global Post-Dated Check (PDC) tracking, an interactive Discrepancy Review Queue, and non-destructive payment reversal controls.

## Technical Context

**Language/Version**: TypeScript 5.x (ESNext, React 19)  
**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui (Radix Primitives), Lucide React, SheetJS (`xlsx`)  
**Storage**: Supabase PostgreSQL (append-only ledger tables: `billing_transaction`, `billing_schedule`, `billing_payment`, `billing_post_dated_check`, `billing_import_discrepancy`)  
**Testing**: Vitest (`scripts/tests/billing/`) with real database session emulation, Playwright layout verification  
**Target Platform**: Web (modern desktop browsers at 1366px–1920px, responsive tablet adaptation)  
**Project Type**: Internal enterprise Next.js full-stack application  
**Performance Goals**: Instant multi-parameter table filtering in $<200\text{ms}$, statement generation in $<1\text{s}$, payment posting round-trip in $<15\text{s}$  
**Constraints**: Internal employee-only operation, zero usage of prohibited terminology ("delinquent"), exact centavo rounding (2 decimal places) across all screens, zero floating-point drift  
**Scale/Scope**: 500+ billing accounts, dozens of daily cashier transactions, skeletal workforce in wind-down  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance Assessment | Status |
|-----------|------------------------|:------:|
| **I. Internal-Only, Employee-Operated** | The UI is accessible strictly to authenticated staff members (`billing_staff`, `accounting_staff`, `system_admin`). No customer login exists. | **PASS** |
| **II. Customers Are Viewers Only** | Statement of Account views and presentation modes are non-destructive and display-only. | **PASS** |
| **III. Data Integrity Over Convenience** | All mutations (payments, reversals, restructures, discrepancy resolutions) route strictly through validated Server Actions with RBAC checks. No client-side database writes. | **PASS** |
| **IV. Least Privilege by Role** | Actions enforce `billing.read`, `billing.write`, and `billing.admin` permissions with clear authorization guards. | **PASS** |
| **V. One Source of Truth** | Follows UI guidelines from `.agents/skills/ui-components/` and layout rules from `.agents/skills/layout-verification/`. | **PASS** |
| **VI. Simplicity and YAGNI** | Directly serves the two core wind-down jobs: collecting payments and clearing lots for title release. | **PASS** |
| **VII. Test-First for Domain Logic** | Core domain math and mutations are already validated by the 20-test billing suite in `scripts/tests/billing/`. UI integration verified via Vitest and Playwright. | **PASS** |
| **VIII. Realism Over Ambition** | Built using existing stack primitives (Next.js, Tailwind, shadcn/ui) without adding complex external state libraries or microservices. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/005-billing-ui-rewrite/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (/speckit-plan command output)
├── research.md          # Phase 0 architectural decisions
├── data-model.md        # Phase 1 UI state & view models
├── quickstart.md        # Phase 1 verification scenarios
├── contracts/           # Component interfaces and prop types
│   └── billing-ui-contracts.ts
└── checklists/          # Requirements and verification checklists
    └── requirements.md
```

### Source Code (repository root)

```text
components/dashboard-billing/
├── billing-records-section.tsx         # Dashboard container with Top Tabs (Accounts, PDCs, Review Queue)
├── billing-table-toolbar.tsx           # Search, status filter pills, view-toggle, and action buttons
├── billing-accounts-table.tsx          # High-density desktop table for accounts
├── billing-account-card.tsx            # Card representation for responsive mobile view
├── billing-kpi-cards.tsx               # Portfolio metrics (Total Receivables, MTD, Arrears, PDCs)
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

app/(dashboard)/dashboard/billing/
├── page.tsx                            # Main Billing Dashboard route
└── [accountId]/
    └── page.tsx                        # Dedicated Account Workspace route
```

**Structure Decision**: Standard Next.js App Router structure. All UI components live strictly 1 level deep directly under `components/dashboard-billing/` adhering strictly to `AGENTS.md` component organization rules.

## Complexity Tracking

*No violations identified. Architecture conforms strictly to all project constraints and the FDM Constitution.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | N/A | N/A |
