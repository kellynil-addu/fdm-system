# Quickstart & Verification Guide: Billing UI Convention & Primitives Alignment

**Feature**: `006-billing-ui-alignment` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

This guide documents visual and interactive verification scenarios to confirm that the Billing & Collections UI strictly adheres to the repository's UI conventions ([.agents/skills/ui-components/SKILL.md](../../.agents/skills/ui-components/SKILL.md)).

---

## 1. Prerequisites

Verify TypeScript compilation and baseline test passes:
```bash
npx tsc --noEmit
npm run test:e2e:billing
```

---

## 2. Visual & Interactive Verification Scenarios

### Scenario 1: Primary Accounts Table & FilterToolbar Integration

1. **Navigate to the Billing Dashboard**:
   - Open `/dashboard/billing`.
2. **Inspect the Primary Ledger Container**:
   - Verify the table is wrapped inside a standard `<Card>` with cool border (`border-border`).
   - Verify the header is a `<CardStickyHeader>` matching `/dashboard/clients`.
   - Verify the toolbar is the declarative `<FilterToolbar>` with `FilterToolbarTabs` showing counts for "All", "Active", "In Arrears", "Matured", "Cleared", and "Forfeited".
3. **Verify Search Clear Affordance**:
   - Type a query into the search input.
   - Click the clear icon (`X`); verify the search field clears and filters reset immediately.
4. **Verify Pagination Footer**:
   - Scroll to the bottom of the table; verify `<ListPaginationFooter>` renders standard page offsets and page controls.

---

### Scenario 2: KPI Metrics Cards & Canvas Surface Model

1. **Inspect KPI Cards on `/dashboard/billing`**:
   - Verify cards sit on the beige background canvas and use `<Card variant="canvas">` with warm borders (`border-border-warm`).
   - Verify typography uses `<CardTitle size="sm">` and `<CardDescription>` with semantic values (`text-success`, `text-warning`, `text-foreground`).
   - Verify there are zero raw utility chains like `flex items-center gap-2 rounded-... bg-[color-mix...]` in `billing-kpi-cards.tsx`.

---

### Scenario 3: Dedicated Account Workspace (`/dashboard/billing/[accountId]`)

1. **Open an Account Detail Page**:
   - Navigate to `/dashboard/billing/[accountId]`.
2. **Inspect Two-Column Layout**:
   - Verify the left summary panel composes from `<Card>` with standard `<CardHeader>`, `<CardTitle>`, and `<CardContent>`.
   - Verify badges use `<Badge shape="pill" dot>` with status variant mapped from `lib/status-colors.ts`.
   - Verify action buttons use `<Button variant="quiet">` and standard primary triggers.

---

### Scenario 4: Standard Empty States in Workspace Tabs

1. **Inspect Empty Tabs**:
   - Open an account with no PDCs, no legal notices, and no compromise agreements.
   - Switch to the "Post-Dated Checks", "Legal & Forfeiture", and "Penalties & Compromises" tabs.
   - Verify that each tab renders the standard `<EmptyState>` component with appropriate icons and actionable text, rather than a plain unstyled `div`.

---

### Scenario 5: FormField & Alert Primitives in Modal Dialogs

1. **Open Payment Modal**:
   - Click "Record Payment"; verify every input uses `<FormField label="..." error="...">`.
   - Enter invalid data (e.g. negative amount or missing OR number) and verify validation errors appear in the `<FormField>` error slot.
2. **Open Reversal Modal**:
   - Click "Reverse" on a journal transaction row; verify the warning banner uses `<Alert variant="warning">` with `<AlertTitle>` and `<AlertDescription>`.
3. **Open Lot Hold Dialog**:
   - On a forfeited account, click "Release Hold"; verify statutory grace period instructions use `<Alert variant="destructive">` or `<Alert variant="warning">`.
