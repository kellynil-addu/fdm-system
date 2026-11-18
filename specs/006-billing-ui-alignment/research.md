# Research & Architecture Decisions: Billing UI Convention & Primitives Alignment

**Feature**: `006-billing-ui-alignment` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

This document records the architectural decisions and component mappings for aligning the Billing UI with the repository's UI design system ([.agents/skills/ui-components/SKILL.md](../../.agents/skills/ui-components/SKILL.md)) and [`AGENTS.md`](../../AGENTS.md).

---

## Decision 1: Primary Table Architecture (`Card` + `CardStickyHeader` + `FilterToolbar`)

### Problem
`components/dashboard-billing/billing-table-toolbar.tsx` implemented a custom filter bar using bespoke utility classes and raw divs (`flex flex-col gap-3 rounded-lg border border-border bg-card p-3`), creating visual and behavioral divergence from `/dashboard/clients` and `/dashboard/properties`.

### Decision
Deprecate custom `billing-table-toolbar.tsx` in favor of declarative `<FilterToolbar>` embedded within `<CardStickyHeader>` atop `<Card>` in `billing-records-section.tsx` and `billing-accounts-table.tsx`.

### Composition Pattern
```tsx
<Card variant="default">
  <CardStickyHeader>
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 pb-0 sm:pb-0">
      <div>
        <CardTitle>Billing Accounts</CardTitle>
        <CardDescription>
          Active installment contracts, receivables, and payment ledgers
        </CardDescription>
      </div>
      <div className="flex items-center gap-2">
        <Button responsive onClick={onOpenPaymentModal}>
          <CreditCard className="h-4 w-4" />
          Record Payment
        </Button>
      </div>
    </div>
    <FilterToolbar
      controller={controller}
      viewMode={{
        value: viewMode,
        onChange: setViewMode,
        options: [
          { value: 'table', label: 'Table view', icon: <Rows className="h-4 w-4" /> },
          { value: 'cards', label: 'Cards view', icon: <LayoutList className="h-4 w-4" /> },
        ],
      }}
    />
  </CardStickyHeader>
  
  {controller.matchedItems.length === 0 ? (
    <EmptyState controller={controller} />
  ) : (
    <Table>...</Table>
  )}
  <ListPaginationFooter controller={controller} />
</Card>
```

---

## Decision 2: State Management via `useListController`

### Problem
Billing filter state was spread across custom `useBillingAccounts` context hooks, passing separate `search`, `tab`, and pagination states down to disparate components.

### Decision
Adopt `useListController` (`lib/hooks/use-list-controller.ts`) for all collection views (Accounts, PDCs, Discrepancies).
- Pass `controller` as a single object to `<FilterToolbar controller={controller} />`, `<ListPaginationFooter controller={controller} />`, and `<EmptyState controller={controller} />`.
- Define status tabs with counts (`all`, `Active`, `in_arrears`, `Matured`, `Cleared`, `Forfeited`) using `ui.variant: 'tabs'`.

---

## Decision 3: The Two-Surface Model for Billing Cards

### Problem
The billing dashboard lives on a warm beige canvas background (`bg-background` = `#F5F3EC`). KPI summary cards (`billing-kpi-cards.tsx`) were using cool border (`border-border`), creating poor contrast against the page canvas.

### Decision
Compose KPI summary cards using `<Card variant="canvas">` with warm borders (`border-border-warm`):
- Canvas cards use warm border tokens and `<CardTitle size="sm">`.
- White container cards (`<Card variant="default">`) remain white (`bg-card`) with cool borders (`border-border`) and warm cream hover rows (`hover:bg-row-hover`).

---

## Decision 4: Standardize Tabular Rhythm & `<EmptyState>`

### Problem
Workspace tabs (Journal, Schedule, PDCs, Penalties, Notices) rendered empty lists as raw text `div` blocks (`rounded-lg border border-border p-6 text-center text-xs text-muted-foreground`).

### Decision
Replace all ad-hoc empty divs with the application's standard `<EmptyState>` primitive (`components/ui/empty-state.tsx`):
- Automatically provides coordinated icons, titles, clear filter affordances, or creation prompts.
- Preserves consistent spacing across all tabs.

---

## Decision 5: Modal Form & Alert Primitives Composition

### Problem
Several billing modal forms manually rendered `<Label>` and red `<p>` error strings, and warning callouts were custom colored divs.

### Decision
- Standardize all form inputs with `<FormField label="..." error={errors.field?.message} required>` from `components/ui/form-field.tsx`.
- Standardize all warnings (reversal warnings, forfeiture statutory grace period alerts) with `<Alert variant="warning">` and `<Alert variant="destructive">` from `components/ui/alert.tsx`.
- Standardize dialog action buttons with `<Button variant="quiet">` for cancellation and standard primary triggers.
