# Feature Specification: Billing UI Rewrite & User Experience Overhaul

**Feature Branch**: `005-billing-ui-rewrite`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Rewrite UI to reflect changes made in 002, as well as to be suited to users"

## Clarifications

### Session 2026-11-08

- Q: How should the dedicated Account Workspace (`/dashboard/billing/[accountId]`) be structured between the contract summary metrics and the detailed financial tabs? → A: Option A (Two-column master-detail layout: Sticky left sidebar with contract metadata, dynamic balances, and primary cashier buttons; right wide area with tabbed tables).
- Q: Which tab in the right panel should be loaded as the default view when staff opens an account workspace? → A: Option A (Transaction Journal: Defaults to the append-only ledger showing recent payment history, sequence numbers, and receipt records).
- Q: How should the two-column Account Workspace adapt on tablet and mobile screen widths (under 1024px)? → A: Option A (Responsive vertical stack: Left summary panel collapses into a top summary card with quick actions; tabbed tables take full width below).

### Session 2026-11-09

- Q: Which design architecture should be adopted for the cashier Payment Posting & Waterfall Allocation modal (`/dashboard/billing`) to balance cashier posting speed with centavo allocation integrity? → A: Option B (Guided 3-Step Cashier Wizard: Sequential 3-step progressive modal featuring Step 1: Tender & Official Receipt entry, Step 2: Chronological Waterfall Allocation review against account aging with optional line-item overrides, and Step 3: Receipt confirmation and voucher preview before permanent ledger commit).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dense Operational Accounts Ledger & Filtering (Priority: P1)

Billing and collection staff in a property wind-down operation process dozens of client accounts daily. Rather than navigating disconnected card widgets, staff need a high-density, tabular workspace that displays crucial financial metrics at a glance: client buyer name, lot designation, total contract price, dynamic remaining principal balance, accrued penalties due, installments behind, and clearance status. Staff must be able to search instantly across buyer names, lot coordinates, and official receipt numbers, filter by operational status ("Active", "In Arrears", "Matured", "Cleared", "Forfeited"), and launch primary cashier actions in a single click.

**Why this priority**: Core daily tool for skeletal billing staff. Rapid lookup and accurate status filtering are prerequisites for collecting payments, tracking aging, and preventing misallocated funds.

**Independent Test**: Can be tested by opening the billing dashboard, filtering by "In Arrears", searching for a buyer, and verifying that financial totals, arrears indicators, and quick action buttons render without layout clipping or horizontal distortion.

**Acceptance Scenarios**:

1. **Given** 50+ billing accounts in various statuses, **When** a staff member loads the Billing dashboard, **Then** the system displays a dense, sortable table displaying Buyer, Lot, Total Contract Price, Remaining Principal, Overdue Installments, Penalty Due, Status badge, and Quick Actions.
2. **Given** an account with overdue installments past the 30-day grace period, **When** viewing the account in the ledger list, **Then** the account displays the status badge "In Arrears" (with zero usage of prohibited terminology such as "delinquent") and shows exact months behind.
3. **Given** the search bar, **When** staff types a lot number (e.g., "Block 4 Lot 12"), buyer name, or Official Receipt number, **Then** the table immediately filters the matching accounts within 200ms.
4. **Given** mobile or tablet viewport sizes, **When** viewing the billing dashboard, **Then** the table responsively adapts or stacks key fields gracefully without clipped numbers or unreadable text.

---

### User Story 2 - Comprehensive Account Detail & Append-Only Journal Workspace (Priority: P1)

When servicing an individual buyer or fielding an inquiry, staff need a dedicated, complete Account Workspace that reflects the true append-only transaction ledger. The workspace features a two-column master-detail layout: a persistent left panel summarizing contract metadata, buyer profile, dynamic balance breakdown, and quick cashier actions; alongside a wide right panel with tabbed sections for:
1. **Transaction Journal**: Chronological append-only ledger entries showing sequence number, transaction date, type (Payment, Penalty Charge, Reversal), Official Receipt details, allocated amount, posting staff member, and one-click reversal actions with required reason entry.
2. **Amortization Schedule**: Active versioned schedule displaying every installment due date, monthly due, principal settled, and paid/unpaid status.
3. **PDC Portfolio**: On-hand post-dated checks associated with the account.
4. **Penalties & Compromises**: Applicable date-bounded penalty arrangement, waiver agreements, and monthly accrual log.
5. **Printable Statement**: One-click generation of the official customer-ready Statement of Account.

**Why this priority**: Eliminates confusion between estimated schedules and actual payments. Provides the legal and financial single source of truth for every lot sale.

**Independent Test**: Navigate to an account's detail workspace, review the transaction history, execute an out-of-order payment reversal, and confirm that the reversal entry appears with sequence incrementation while prior history remains intact.

**Acceptance Scenarios**:

1. **Given** an active account, **When** staff clicks into the account workspace, **Then** the system presents the two-column workspace, defaulting to the Transaction Journal tab while maintaining the left persistent balance summary.
2. **Given** an existing payment transaction, **When** authorized staff clicks "Reverse Transaction" and provides a mandatory explanation, **Then** the system posts a compensatory reversal record, visually links the reversal to the original entry, and updates account balances in real time.
3. **Given** an account with restructured terms, **When** viewing the installment schedule tab, **Then** the system displays the active schedule version number (e.g., "Schedule Version 2") and preserves access to prior deactivated schedule versions for audit comparison.
4. **Given** a tablet or mobile screen (< 1024px width), **When** viewing the account workspace, **Then** the left panel collapses into a compact top summary card with primary action buttons, and the tabbed tables expand to full width below.

---

### User Story 3 - Post-Dated Check (PDC) Management & Maturing Alerts (Priority: P2)

Property buyers frequently issue batches of post-dated checks covering upcoming quarterly or annual amortization. Staff need a dedicated workspace tab to view all on-hand checks across the portfolio, monitor checks maturing in the next 15/30 days, and update check lifecycles (Received $\rightarrow$ Deposited/Cleared $\rightarrow$ Bounced $\rightarrow$ Replaced).

**Why this priority**: PDCs prevent default before it happens. Cashiers need timely reminders to deposit checks and clear receipts.

**Independent Test**: Can be tested by adding a PDC for an account, navigating to the PDC management portfolio view, filtering for checks maturing this month, and marking a check as cleared or bounced.

**Acceptance Scenarios**:

1. **Given** a buyer remitting 12 monthly checks, **When** staff enters check numbers, banks, maturity dates, and amounts in the PDC modal, **Then** the checks are registered and visible in both the account workspace and the global PDC tracker.
2. **Given** a check approaching its due date, **When** staff views the billing dashboard, **Then** an alert badge or indicator highlights maturing checks due for bank deposit.
3. **Given** a bounced check, **When** staff records the check as "Bounced" with reason notes, **Then** the check status is updated, related payments are reversed or flagged, and a penalty notice option is surfaced.

---

### User Story 4 - Legacy Excel Workbook Import & Discrepancy Review Queue (Priority: P2)

Staff transitioning historical paper records and hand-maintained Excel workbooks into the system need an interactive, dedicated Review Queue. When a legacy `.xlsx` workbook is uploaded, the parser automatically flags discrepancies (formula calculation mismatches, date out-of-sequence warnings, or total balance discrepancies between printed footers and individual rows). Staff must be able to inspect discrepancies side-by-side, understand system recomputations, and apply formal resolution notes.

**Why this priority**: Guarantees legacy data integrity during company wind-down without letting bad paper formulas corrupt the new append-only ledger.

**Independent Test**: Upload a workbook fixture with a deliberate footer total disagreement, verify that the account enters the Discrepancy Review Queue with an alert pill, and resolve the item with staff audit notes.

**Acceptance Scenarios**:

1. **Given** a legacy Excel workbook upload, **When** the file contains a mismatch between the printed balance and the sum of dated receipts, **Then** the import records the transactions, creates an item in the Discrepancy Review Queue, and alerts staff.
2. **Given** pending discrepancies in the Review Queue, **When** staff views the Review Queue tab, **Then** the interface displays the account name, lot, discrepancy category, raw file value, and recomputed system balance.
3. **Given** a review queue item, **When** staff selects "Resolve Discrepancy", enters justification remarks, and confirms, **Then** the discrepancy status transitions to "Resolved" with staff identity and timestamp.

---

### User Story 5 - Forfeited Accounts, Maceda Law Surrender & Deliberate Lot Hold (Priority: P3)

When an installment buyer exhausts all notice cure periods without payment, staff must process cancellation and forfeiture under Republic Act 6552 (Maceda Law). The UI must calculate and display statutory Cash Surrender Value (50% for 2–5 years of payments + 5% per year up to 90%) side-by-side with authorized deduction agreements. Once forfeited, the UI must prominently lock the lot under a deliberate hold state, preventing accidental resale until a deliberate, authorized checklist release is signed off.

**Why this priority**: Protects the firm against wrongful forfeiture lawsuits while preventing lots in legal grace periods from being erroneously assigned to new buyers.

**Independent Test**: Open an overdue account with >2 years of payments, trigger the Forfeiture dialog, verify that the Maceda cash surrender value calculation renders accurately, confirm forfeiture, and observe that the property lot reflects the hold state.

**Acceptance Scenarios**:

1. **Given** an account eligible for forfeiture where the buyer paid 3 years of installments, **When** staff initiates the forfeiture action, **Then** the dialog displays statutory eligibility under RA 6552, shows a 50% Cash Surrender Value, and requests confirmation of notarized cancellation notice delivery.
2. **Given** a finalized forfeiture, **When** viewing the lot in property inventory or billing, **Then** the lot shows "Forfeited (On Hold)" and restricts reservation or sale.
3. **Given** a lot under forfeiture hold, **When** authorized staff clicks "Release Lot Hold", **Then** the system requires verification that statutory grace periods have elapsed before reopening the lot for sale.

---

### Edge Cases

- **Partial Centavo Allocation**: When entering a custom payment allocation across multiple past-due installments, the UI must validate that the sum of allocated amounts equals the total tendered cash/check amount down to the exact centavo before allowing submission.
- **Concurrent Overlapping Reversals**: If staff initiates a reversal on an old payment that had subsequent downstream penalty computations, the UI must clearly warn that reversing this payment will re-evaluate arrears aging and penalty charges across subsequent months.
- **Unscheduled / Unamortized Lots**: If an account has no active amortization schedule (e.g. unamortized raw lot assignment), payments must default to straight principal credit without throwing schedule lookup errors.
- **Zero-Value / Excessive Waivers**: Penalty waiver inputs must be bounded strictly between zero and the accrued penalty balance; entering a waiver exceeding total penalty arrears is rejected with inline feedback.
- **High-Zoom & Small Laptop Displays**: Staff running on 1366x768 or high DPI zoom (125%-150%) must be able to scroll tables horizontally with fixed pinned action columns and sticky headers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a unified Billing & Collections dashboard featuring portfolio KPI summaries (Total Receivables, Collected MTD, In Arrears Accounts, Maturing PDCs, and Pending Review Discrepancies).
- **FR-002**: The system MUST present a dense, sortable, and searchable tabular view of all billing accounts with instant multi-parameter filtering (by status, project area, and balance ranges).
- **FR-003**: The system MUST support an Account Detail Workspace at `/dashboard/billing/[accountId]` featuring a two-column master-detail layout: a persistent left panel displaying contract metadata, buyer profile, dynamic balance KPIs, and quick cashier action buttons; and a primary right panel with tabbed navigation across:
  - Transaction Journal (append-only ledger with sequential numbering and inline reversals; active by default)
  - Installment Schedule (versioned schedule with installment status)
  - Post-Dated Checks (portfolio management & status transitions)
  - Penalties, Arrangements & Waivers
  - Historical Notices & Legal / Forfeiture
  - Printable Statement of Account (live print preview)
- **FR-004**: The system MUST provide a guided 3-step Payment Posting modal (Step 1: Tender metadata and official receipt details; Step 2: Chronological waterfall allocation review across accrued penalties and overdue installments with strict centavo balance validation and optional line-item overrides; Step 3: Receipt voucher confirmation and print preview before permanent append-only ledger write).
- **FR-005**: The system MUST enforce non-destructive transaction reversals with mandatory audit remarks; original transaction rows MUST remain visible with explicit reversal indicator badges.
- **FR-006**: The system MUST display an interactive Post-Dated Check (PDC) portfolio view tracking maturing checks with visual badges for Pending, Cleared, Bounced, and Replaced statuses.
- **FR-007**: The system MUST feature a dedicated Discrepancy Review Queue tab alerting staff to imported legacy Excel discrepancies and providing a structured audit resolution workflow.
- **FR-008**: The system MUST provide a contract Restructure modal allowing staff to re-spread remaining unpaid principal across up to 12 months with preview of the new installment schedule.
- **FR-009**: The system MUST integrate statutory Maceda Law Cash Surrender Value calculations and grace period tracking directly in the forfeiture workflow.
- **FR-010**: The system MUST enforce deliberate lot hold status indicators on forfeited accounts and require explicit checklist validation before reopening lots for resale.
- **FR-011**: All customer-facing and printable statements generated from the UI MUST adhere strictly to canonical terminology ("In Arrears", "Matured", "Total Selling Price") and strictly prohibit derogatory phrasing such as "delinquent".
- **FR-012**: All monetary figures across tables, cards, modal dialogs, and printable views MUST be rendered with two decimal places (Philippine Peso format) with zero floating-point rounding drift.

### Key Entities

- **Billing Account**: Represents the buyer's property purchase financing agreement, holding total contract price, payment cadence, baseline cutoff snapshots, and dynamic balances.
- **Ledger Transaction**: Append-only journal row with monotonic sequence number, value date, transaction type, posted amount, posting staff identity, and reversal reference.
- **Payment Application**: Waterfall breakdown linking a payment to specific installments, penalties, or fee buckets.
- **Installment Schedule**: Versioned schedule of committed payment due dates and monthly amounts.
- **Post-Dated Check**: Recorded bank check held for future deposit, with maturity date, bank details, and clearance lifecycle.
- **Import Discrepancy**: Flagged inconsistency from legacy workbook imports with system recomputed comparisons and resolution audit trail.
- **Penalty Arrangement**: Date-bounded penalty policy rule and executive waiver agreements attached to an account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can search, filter, and locate any buyer account or lot in under 2 seconds on a portfolio of 500+ accounts.
- **SC-002**: Recording a standard monthly payment through the guided 3-step cashier wizard takes under 25 seconds from dashboard click to receipt confirmation, ensuring 100% review of chronological installment coverage and zero centavo allocation mismatch.
- **SC-003**: 100% of displayed monetary values match backend centavo ledger balances with zero centavo discrepancy across all screens.
- **SC-004**: Generation and print preview of an official Statement of Account completes in under 1 second.
- **SC-005**: All legacy workbook discrepancies are surfaced in the Review Queue within 1 click from the main billing dashboard, with zero unresolved items lost.
- **SC-006**: 100% of UI screens adhere to canonical terminology with zero occurrences of "delinquent" in user-visible text or print stylesheets.

## Assumptions

- Users accessing the billing interface are internal staff authenticated with appropriate RBAC roles (`billing_staff`, `accounting_staff`, or `system_admin`).
- The underlying database schema and server actions implemented in feature `002-billing-ledger-rewrite` are fully deployed and accessible.
- Desktop display (1280px and wider) is the primary work environment for daily bookkeeping, with responsive tablet adaptation for floor presentations.
- Printable statements are output via standard browser print dialogs using CSS `@media print` stylesheets.
