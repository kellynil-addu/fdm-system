# Implementation Plan: Billing UI Convention & Primitives Alignment

**Branch**: `006-billing-ui-alignment` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-billing-ui-alignment/spec.md`

## Summary

This plan aligns the Billing & Collections UI (`/dashboard/billing` and `/dashboard/billing/[accountId]`) with the repository's established UI conventions, design system tokens, and architectural guidelines from `.agents/skills/ui-components/SKILL.md` and `AGENTS.md`. The plan replaces bespoke hand-rolled toolbars and containers with standard shared primitives (`FilterToolbar`, `Card`, `CardStickyHeader`, `SectionCard`, `EmptyState`, `StatusBar`, `FormField`, `Alert`), adheres to the Two-Surface Model (Card vs. Canvas surfaces), and integrates the unified `useListController` state machine.

## Technical Context

**Language/Version**: TypeScript 5.x (ESNext, React 19)  
**Primary Dependencies**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui (Radix Primitives), Lucide React  
**Storage**: Supabase PostgreSQL (via existing `lib/actions/billing.ts` Server Actions)  
**Testing**: Vitest (`scripts/tests/billing/`) integration test suite, Playwright layout verification  
**Target Platform**: Web (modern desktop browsers at 1366px–1920px, responsive tablet adaptation)  
**Project Type**: Internal enterprise Next.js full-stack application  
**Performance Goals**: Instant multi-parameter table filtering in $<200\text{ms}$, 60fps scrolling with sticky table headers  
**Constraints**: Internal employee-only operation, zero usage of prohibited terminology ("delinquent"), strict two-decimal-place currency formatting (`formatCentavosToPhp`), exact compliance with "Rule of 2" and the Two-Surface Model  
**Scale/Scope**: 500+ billing accounts, 12 refactored billing components, zero backend schema modifications  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance Assessment | Status |
|-----------|------------------------|:------:|
| **I. Internal-Only, Employee-Operated** | The UI remains accessible strictly to authenticated staff members (`billing_staff`, `accounting_staff`, `system_admin`). | **PASS** |
| **II. Customers Are Viewers Only** | Presentation and statement views are display-only and non-destructive. | **PASS** |
| **III. Data Integrity Over Convenience** | All mutations continue routing through validated Server Actions with RBAC permission checks. | **PASS** |
| **IV. Least Privilege by Role** | Actions enforce `billing.read`, `billing.write`, and `billing.admin` permissions with auth guards. | **PASS** |
| **V. One Source of Truth** | Directly implements guidelines from `.agents/skills/ui-components/` and `.agents/skills/layout-verification/`. | **PASS** |
| **VI. Simplicity and YAGNI** | Eliminates duplicate bespoke toolbar implementations by reusing existing `@/components/ui/` primitives. | **PASS** |
| **VII. Test-First for Domain Logic** | Validated against existing 23-test billing suite in `scripts/tests/billing/` and layout verification. | **PASS** |
| **VIII. Realism Over Ambition** | Uses existing stack components without adding any new external dependencies or state libraries. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/006-billing-ui-alignment/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (/speckit-plan command output)
├── research.md          # Phase 0 architectural decisions & component mappings
├── data-model.md        # Phase 1 UI state & view models
├── quickstart.md        # Phase 1 verification scenarios
├── contracts/           # Component interfaces and prop types
│   └── billing-ui-alignment.contract.ts
└── checklists/          # Requirements and verification checklists
    └── requirements.md
```

### Source Code (repository root)

```text
components/dashboard-billing/
├── billing-records-section.tsx         # Dashboard container with Top Tabs (Accounts, PDCs, Review Queue)
├── billing-accounts-table.tsx          # High-density desktop table composing from Card + CardStickyHeader + FilterToolbar
├── billing-account-card.tsx            # Card representation for responsive mobile view composing from RecordCard
├── billing-kpi-cards.tsx               # Portfolio metrics composing from Card variant="canvas"
├── billing-pdc-tracker.tsx             # Global PDC management table with Card + CardStickyHeader + FilterToolbar
├── billing-discrepancy-queue.tsx       # Global review queue composing from Card + CardStickyHeader + FilterToolbar
├── billing-account-detail-workspace.tsx# Master workspace container composing from SectionCard / Card
├── billing-journal-tab.tsx             # Append-only journal composing from Card + EmptyState
├── billing-schedule-tab.tsx            # Versioned schedule composing from Card + EmptyState
├── billing-pdc-tab.tsx                 # Account PDCs composing from Card + EmptyState
├── billing-penalties-tab.tsx           # Penalties & waivers composing from Card + EmptyState
├── billing-notices-tab.tsx             # Legal notices & Maceda CSV composing from Card + EmptyState
├── billing-payment-modal.tsx           # Modal form composing from FormField and Dialog primitives
├── billing-reversal-modal.tsx          # Modal form composing from FormField, Alert, and Dialog primitives
├── billing-restructure-modal.tsx       # Modal form composing from FormField and Dialog primitives
├── billing-pdc-modal.tsx               # Modal form composing from FormField and Dialog primitives
├── billing-discrepancy-modal.tsx       # Modal form composing from FormField and Dialog primitives
└── billing-lot-hold-dialog.tsx         # Modal dialog composing from FormField, Alert, and Dialog primitives

lib/
├── status-colors.ts                    # Updated canonical billing status variant maps (BILLING_STATUS_BADGE_VARIANT)
└── hooks/
    └── use-billing-accounts.tsx        # Streamlined context hook delegating collection filtering to useListController
```

**Structure Decision**: Standard Next.js App Router structure. All component files live strictly 1 level deep directly under `components/dashboard-billing/` adhering strictly to `AGENTS.md` component organization rules. Custom toolbar file `billing-table-toolbar.tsx` is removed and replaced by `@/components/ui/filter-toolbar`.

## Complexity Tracking

*No violations identified. Architecture conforms strictly to all project constraints and the FDM Constitution.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | N/A | N/A |
