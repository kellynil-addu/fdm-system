# Feature Specification: Billing UI Convention & Primitives Alignment

**Feature Branch**: `006-billing-ui-alignment`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Align Billing UI with existing repository UI conventions: compose from shared ui-components primitives (FilterToolbar, Card, CardStickyHeader, SectionCard, StatusBar) adhering to the Rule of 2 and layout guidelines"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Declarative FilterToolbar & Card Table Header Integration (Priority: P1)

Billing staff navigating the primary ledger view on `/dashboard/billing` expect the exact same interaction paradigm found in the Clients and Properties directories: a clean `<Card>` container with a `<CardStickyHeader>` housing responsive status filter tabs, an instant search bar with clear affordances (`SearchX`), view-toggle buttons, and a standard `<ListPaginationFooter>`. Instead of custom hand-rolled toolbar divs with bespoke pill styling, staff interact with the unified `<FilterToolbar>` powered by `useListController`, ensuring visual uniformity and predictable keyboard and touch behaviors across all devices.

**Why this priority**: Eliminates visual and behavioral divergence on the most frequently used dashboard screen, providing consistent filtering, search resetting, and pagination behavior portfolio-wide.

**Independent Test**: Load `/dashboard/billing`, verify the accounts table, PDC tracker, and Discrepancy review queue are housed in standard `<Card>` containers with `<CardStickyHeader>` and `<FilterToolbar>`, filter by status and keyword, and verify identical styling to `/dashboard/clients`.

**Acceptance Scenarios**:

1. **Given** the Billing Accounts portfolio view, **When** staff loads the page, **Then** the table is housed inside a standard `<Card>` with a `<CardStickyHeader>` containing `<FilterToolbar>`.
2. **Given** status filter tabs on the toolbar, **When** staff selects "In Arrears", **Then** the tab uses the standard `FilterToolbarTabs` component displaying badge counts, active indicator styling, and zero occurrences of "delinquent".
3. **Given** an active search query, **When** staff clicks the clear icon (`X`), **Then** the search input clears instantly, and the table resets to show all records without full page reload.
4. **Given** pagination or large record sets, **When** scrolling to the bottom of the ledger, **Then** the table renders the standard `<ListPaginationFooter>` showing offset counts and pagination controls.

---

### User Story 2 - Uniform Card & Surface Archetype Alignment (Priority: P1)

The application enforces a strict "Two-Surface Model" separating white Card Surfaces (`bg-card`, cool `--border`) from beige Canvas Surfaces (`bg-background`, warm `--border-warm`). Billing KPI cards and summary containers currently use bespoke raw Tailwind containers with mismatched border and hover tokens. Staff need billing KPI cards and account summary headers to compose directly from `<Card>` (or `<Card variant="canvas">`) with standard `<CardTitle>`, `<CardDescription>`, and `<Badge>` primitives, eliminating raw utility chains and visual clutter.

**Why this priority**: Corrects high-contrast visual clash between warm canvas backgrounds and cool card borders, restoring visual harmony and readability.

**Independent Test**: View `/dashboard/billing` and `/dashboard/billing/[accountId]`, inspect the KPI summary cards and workspace sidebars, and confirm they use the design system's Card variants and tokens without hand-rolled border or background overrides.

**Acceptance Scenarios**:

1. **Given** the portfolio KPI cards on `/dashboard/billing`, **When** rendered on the page, **Then** each KPI card composes from `<Card variant="canvas">` (or `<Card>`) with standard `<CardTitle size="sm">` and semantically styled metric typography.
2. **Given** the Account Detail Workspace (`/dashboard/billing/[accountId]`), **When** staff views the left summary panel, **Then** the container composes from standard `<Card>` or `<SectionCard>` with `<CardHeader>`, `<CardTitle>`, and `<CardContent>`.
3. **Given** account status badges in the workspace, **When** rendered in the summary panel or table, **Then** badges use `<Badge shape="pill" dot>` with semantic variants (`success`, `warning`, `info`, `destructive`) mapped via `lib/status-colors.ts`.

---

### User Story 3 - Consistent Tabular Workspaces & Standard Empty States (Priority: P2)

When navigating between tabs in the Account Detail Workspace (Transaction Journal, Amortization Schedule, PDCs, Penalties, Notices), staff need tables to adhere to the repository's table composition pattern (`TableHeader className="bg-card"`, consistent column padding, and `<Button variant="quiet">` for calm secondary triggers). When an account has no recorded PDCs, notices, or compromise agreements, the UI must render the application's standard `<EmptyState>` primitive rather than plain text divs.

**Why this priority**: Standardizes tabular rhythm and empty states across detail views, making empty lists helpful and visually aligned with the rest of the app.

**Independent Test**: Open an account with no PDCs or notices, open the respective tabs, and verify the standard `<EmptyState>` component renders with appropriate icons, titles, and action prompts.

**Acceptance Scenarios**:

1. **Given** an Account Workspace tab with zero records (e.g. no PDCs on file), **When** viewing the tab, **Then** the interface renders the standard `<EmptyState>` primitive with appropriate icon and message.
2. **Given** action triggers inside table rows (such as "Reverse", "Resolve", or "View"), **When** rendered, **Then** buttons compose from `<Button variant="quiet">` or `<Button variant="ghost">` rather than bespoke Tailwind button styles.
3. **Given** sequential transaction numbers in the journal, **When** rendered, **Then** the table uses standard font-mono tabular layout with cool border separators.

---

### User Story 4 - Standard Dialog & Modal Form Composition (Priority: P2)

Billing modals (Payment Posting, Reversals, Term Restructure, PDCs, Discrepancy Resolution, and Lot Hold Release) must strictly compose from `@/components/ui/dialog`, `@/components/ui/form-field`, and `@/components/ui/alert`. Field labels and error messages must be bound via `<FormField label="..." error="...">` rather than duplicated manual label and red text tags. Confirmation warnings must use `<Alert variant="warning">` or `<Alert variant="destructive">`.

**Why this priority**: Guarantees accessible form semantics, consistent error message rendering, and uniform modal footers across all payment and audit workflows.

**Independent Test**: Open the Payment Posting modal and the Reversal modal, trigger validation errors on required fields, and confirm that errors render via `<FormField>` error slots with standard spacing and typography.

**Acceptance Scenarios**:

1. **Given** any billing dialog or modal, **When** inputs are rendered, **Then** every input is wrapped in a `<FormField>` primitive providing label, required indicator, and error messaging.
2. **Given** warning callouts in the Reversal or Lot Hold dialogs, **When** displayed, **Then** callouts compose from the `<Alert>` primitive with `<AlertTitle>` and `<AlertDescription>`.
3. **Given** modal action footers, **When** rendered, **Then** footers use standard `<DialogFooter>` with `<Button variant="quiet">` for cancel and standard primary/destructive action buttons.

---

### Edge Cases

- **Mobile Viewport Overflow**: On mobile screens (< 640px), `<FilterToolbar>` tabs must horizontally scroll cleanly without clipping search inputs or breaking card boundaries.
- **Controller State Synchronization**: When switching top-level tabs on `/dashboard/billing` (e.g., from "Accounts" to "PDC Tracker"), the search and filter state must either preserve appropriate tab scope or cleanly reset without stale filter artifacts.
- **Dense Table Row Height**: Table rows must remain dense (compact padding `py-2` to `py-2.5`) to preserve high-density cashier ergonomics while maintaining accessible touch targets on interactive action buttons.
- **Zero-Delinquent Terminology Invariant**: Across all refactored `<FilterToolbar>` tabs, `<Badge>` pills, and `<EmptyState>` descriptions, the word "delinquent" must remain strictly prohibited, using "In Arrears" exclusively.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Billing accounts ledger MUST compose from `<Card>`, `<CardStickyHeader>`, and `<FilterToolbar>` primitives from `@/components/ui/`, adhering to the primary list pattern used across the app.
- **FR-002**: Filter and search controls on the billing dashboard MUST integrate with the `useListController` hook (`lib/hooks/use-list-controller.ts`) for unified search, status tabs, and pagination state.
- **FR-003**: The custom `billing-table-toolbar.tsx` MUST be replaced with `<FilterToolbar>` composition, eliminating duplicate search, filter pill, and view-toggle utility chains per the "Rule of 2".
- **FR-004**: Portfolio KPI cards (`billing-kpi-cards.tsx`) MUST compose from `<Card variant="canvas">` (or `<Card>`) with standard `<CardTitle>` and semantic typography tokens, eliminating hand-rolled container styling.
- **FR-005**: The Account Detail Workspace (`/dashboard/billing/[accountId]`) left summary card MUST compose from `<Card>` or `<SectionCard>`, utilizing standard `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, and `<CardContent>`.
- **FR-006**: Status indicators across all billing views MUST compose from the standard `<Badge>` primitive with `shape="pill"` and `dot` support, mapping canonical statuses (`Active`, `In Arrears`, `Matured`, `Cleared`, `Forfeited`) through `lib/status-colors.ts`.
- **FR-007**: Empty states in the accounts table, PDC tracker, review queue, and workspace tabs MUST compose from the standard `<EmptyState>` primitive (`components/ui/empty-state.tsx`), eliminating plain text placeholder divs.
- **FR-008**: Secondary actions, table row buttons, and cancel buttons MUST use semantic primitive variants (`variant="quiet"`, `variant="canvas"`, `variant="destructive"`, `variant="ghost"`) without contradictory inline class overrides.
- **FR-009**: All billing modal forms (`billing-payment-modal.tsx`, `billing-reversal-modal.tsx`, `billing-restructure-modal.tsx`, `billing-pdc-modal.tsx`, `billing-discrepancy-modal.tsx`, `billing-lot-hold-dialog.tsx`) MUST compose inputs inside `<FormField>` primitives with bound error props.
- **FR-010**: All modal warning callouts and audit notifications MUST compose from `<Alert>` with `<AlertTitle>` and `<AlertDescription>` instead of bespoke colored alert boxes.
- **FR-011**: All color styling MUST strictly use semantic Tailwind tokens (`bg-primary`, `text-foreground`, `border-border`, `border-border-warm`, `bg-card`) and unbroken CSS `color-mix()` class literals; hardcoded hex and slash-opacity classes are prohibited.
- **FR-012**: Strict canonical terminology ("In Arrears", "Total Selling Price") with zero occurrences of "delinquent" MUST be maintained across all refactored views, toolbars, and empty states.

### Key Entities

- **UI Primitives (`components/ui/`)**: Reusable domain-agnostic components (`Card`, `CardStickyHeader`, `FilterToolbar`, `SectionCard`, `Badge`, `Button`, `FormField`, `Alert`, `EmptyState`, `StatusBar`).
- **Domain Mapping (`lib/status-colors.ts`)**: Translation layer mapping ledger statuses (`Active`, `In Arrears`, `Matured`, `Cleared`, `Forfeited`) to badge variants and human-readable labels.
- **List Controller (`lib/hooks/use-list-controller.ts`)**: State machine managing search query, status tabs, pagination offset, and view mode across collection views.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of billing table toolbars use the shared `<FilterToolbar>` and `<CardStickyHeader>` primitives, eliminating bespoke toolbar implementations.
- **SC-002**: 100% of billing cards compose from `@/components/ui/card` primitives, eliminating raw hand-rolled container markup.
- **SC-003**: 100% of form inputs across billing modals compose within `<FormField>` primitives with unified error presentation.
- **SC-004**: 100% of empty states across billing tables and workspace tabs render via the standard `<EmptyState>` primitive.
- **SC-005**: All 23 tests in `scripts/tests/billing/` pass with zero functional regression.
- **SC-006**: Zero occurrences of the word "delinquent" in any user-visible text, badge, or stylesheet.

---

## Assumptions

- The backend server actions and database schemas implemented in features `002` and `005` remain unchanged; this feature refactors component composition and UI layer consistency.
- The `useListController` hook supports client-side filtering and pagination out of the box for the loaded billing accounts collection.
- Responsive breakpoints follow Tailwind defaults (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`).
- The refactored views maintain full compatibility with existing Playwright layout verification and Vitest integration suites.
