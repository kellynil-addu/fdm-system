# Implementation Plan: Billing & Ledger Rewrite

**Branch**: `002-billing-ledger-rewrite` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-billing-ledger-rewrite/spec.md`

## Summary

Rewrite the billing and accounting module (`/dashboard/billing`) to replace stored running balances with an append-only transaction ledger, explicit versioned installment schedules, effective-dated penalty policy attachments, and centavo-rounded money entry. Add native Excel workbook ingestion with an arithmetic discrepancy review queue, Maceda statutory cash surrender value calculation, and deliberate lot hold lifecycles for forfeited accounts.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 22 (Next.js 15/16 App Router, React 19)

**Primary Dependencies**:
- `@supabase/ssr`, `@supabase/supabase-js` (PostgreSQL client)
- `xlsx` (SheetJS) for parsing legacy Excel workbooks (`.xlsx` and binary `.xls`)
- `zod` for input schema validation
- `react-hook-form` with `@hookform/resolvers/zod`
- `shadcn/ui` primitives (Radix UI, Tailwind CSS, Lucide icons)
- `jspdf`, `jspdf-autotable` for formatted PDF/print statements

**Storage**: PostgreSQL (Supabase) in `public` schema with RLS; `file_attachment` links in Backblaze B2/S3.

**Testing**: Vitest (`scripts/tests/billing/`) with real database integration, emulated auth cookies, and `@faker-js/faker`.

**Target Platform**: Linux server (Node.js runtime / Next.js on Vercel) accessed via internal desktop browser.

**Project Type**: Full-stack Next.js web application with PostgreSQL backend.

**Performance Goals**: Statement generation in $< 2$ seconds (`SC-002`); single-screen balance and aging lookup $< 500\text{ms}$ (`SC-001`).

**Constraints**:
- Single-digit internal staff; strictly employee-operated, no customer self-service.
- Append-only financial ledger: zero in-place updates or deletions of financial journal entries.
- Centavo precision (`NUMERIC(15, 2)`): zero floating-point accumulation or values with $> 2$ decimals (`FR-010`, `SC-006`).
- No duplicate live contracts on the same lot (`FR-005`, `SC-010`).

**Scale/Scope**:
- Several hundred legacy raw-lot accounts spanning from 2004 to present.
- Backfill and reconciliation workload rather than high-frequency real-time consumer traffic.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| **I. Internal-Only, Employee-Operated** | The module is strictly internal for billing, cashier, and legal staff. No customer login or buyer portal is introduced. | **PASS** |
| **II. Customers Are Viewers Only** | Statements and account views are printable or presented by staff; customers have no mutable inputs. | **PASS** |
| **III. Data Integrity Over Convenience** | Append-only ledger transactions, validated Server Actions with `createScope`, explicit schedule versioning, and zero direct client database writes. | **PASS** |
| **IV. Least Privilege by Role** | RBAC permissions (`billing.read`, `billing.create`, `billing.update`, `legal.read`). Admin self-protection preserved. | **PASS** |
| **V. One Source of Truth** | Aligns with `.agents/skills/backend-architecture/` and `.agents/skills/fdm-domain/`. Does not duplicate skills verbatim. | **PASS** |
| **VI. Simplicity and YAGNI** | Squarely serves Job #1 ("Collect"). Omits BIR tax filing, general ledger accounting, automated SMS/email, and artificial client codes. | **PASS** |
| **VII. Test-First for Domain Logic** | Comprehensive Vitest suites planned in `scripts/tests/billing/` against real database before merge. | **PASS** |
| **VIII. Realism Over Ambition** | Runs on existing Supabase and Vercel infrastructure; no custom background workers; resilient to skeletal staffing. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/002-billing-ledger-rewrite/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 architectural decisions & tech evaluation
├── data-model.md        # Phase 1 schema, entities, and state transitions
├── quickstart.md        # Phase 1 end-to-end runnable validation scenarios
├── contracts/           # Phase 1 Server Action & API schemas
│   ├── billing-actions.ts
│   └── billing-ledger-api.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
app/(dashboard)/dashboard/billing/
├── page.tsx                               # Billing dashboard main view (accounts list, KPI cards, aging)
└── [accountId]/
    └── page.tsx                           # Account detail: ledger journal, schedule, notices, PDC, statement

components/dashboard-billing/
├── billing-account-card.tsx               # Account detail card (status badges, held lot indicators)
├── billing-account-dialog.tsx             # Create account modal (schedule generator)
├── billing-compromise-modal.tsx           # Penalty compromise agreement modal
├── billing-discrepancy-modal.tsx          # Legacy import review queue modal
├── billing-excel-import-modal.tsx         # Excel (.xlsx/.xls) and CSV statement uploader
├── billing-kpi-cards.tsx                  # Aging summary cards (current, 30/60/90+ days)
├── billing-notice-modal.tsx               # Demand notice generator & tracking dialog
├── billing-payment-modal.tsx              # Payment posting modal with waterfall preview
├── billing-pdc-modal.tsx                  # Post-dated check record dialog
├── billing-records-section.tsx            # Accounts table with quick filters and search
├── billing-restructure-modal.tsx          # Contract restructure dialog (re-spreads principal)
├── billing-reversal-modal.tsx             # Non-destructive transaction reversal modal
└── billing-statement-view.tsx             # Printable statement view with audit breakdown

lib/
├── actions/
│   └── billing.ts                         # Server actions (createScope: billing.read, billing.create, billing.update)
├── billing/
│   ├── excel-importer.ts                  # SheetJS parser for legacy Excel workbooks
│   ├── csv-importer.ts                    # CSV importer fallback
│   ├── money.ts                           # Centavo rounding and arithmetic utilities
│   ├── schedule.ts                        # Installment schedule generation & residual centavo allocation
│   ├── waterfall.ts                       # Contract payment waterfall allocation logic
│   └── maceda.ts                          # Cash surrender value computation
├── hooks/
│   └── use-billing-accounts.tsx           # Context & state management for billing views
├── types/
│   └── billing.ts                         # Domain TypeScript interfaces
└── validations/
    └── billing.ts                         # Zod schemas for forms and Server Actions

supabase/migrations/
└── 20261109000000_billing_ledger_rewrite.sql # Database schema, indexes, and RPCs

scripts/tests/billing/
├── billing-journal.test.ts                # Append-only transaction and reversal tests
├── billing-schedule.test.ts               # Versioned schedule and centavo distribution tests
├── billing-waterfall.test.ts              # Payment waterfall and credit balance tests
├── billing-excel-import.test.ts           # Legacy Excel import and discrepancy queue tests
├── billing-lot-hold.test.ts               # Forfeiture, lot hold, and reopening tests
└── billing-statement.test.ts              # Printable statement and aging calculation tests
```

**Structure Decision**:
Follows the repository's established 3-tier architecture:
1. Primitives in `components/ui/` (unmodified).
2. Domain logic & calculations in `lib/billing/` and `lib/actions/billing.ts` using `createScope`.
3. Flat domain view components in `components/dashboard-billing/` (strictly 1 level deep).
4. Real-database integration tests in `scripts/tests/billing/`.

## Complexity Tracking

*No constitution violations. Architecture uses existing Supabase and Next.js foundations, adding `xlsx` for Excel workbook parsing.*
