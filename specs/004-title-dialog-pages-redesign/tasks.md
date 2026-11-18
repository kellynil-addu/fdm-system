# Tasks: Title Dialog Stage Pages Redesign

**Input**: Design documents from `/specs/004-title-dialog-pages-redesign/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/title-stage-tabs.contract.ts](contracts/title-stage-tabs.contract.ts), [quickstart.md](quickstart.md)

**Tests**: Existing Vitest end-to-end integration suite in `scripts/tests/titles/` covers backend actions, permission guards, and stage transitions. UI layout, verbosity reduction, and component interactions are validated against `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation, visual verification, and incremental delivery.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no conflicting dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify dependencies, contracts, and baseline test suite before implementing stage view redesigns.

- [X] T001 Verify existing title integration tests pass via `npm run test:e2e:titles`
- [X] T002 [P] Inspect component contract interfaces in `specs/004-title-dialog-pages-redesign/contracts/title-stage-tabs.contract.ts` against existing exports in `components/dashboard-titles/`

---

## Phase 2: Foundational

**Purpose**: Ensure layout bounds, scroll constraints, and outer shell boundaries remain strictly preserved in `title-dialog.tsx`.

**⚠️ CRITICAL**: Must be verified before stage component visual refactoring.

- [X] T003 Verify dialog layout container bounds and scroll constraints (`w-[95vw] h-[90vh] overflow-hidden pr-1`) and mobile tab switcher in `components/dashboard-titles/title-dialog.tsx` to ensure `TitleDialogHeader` and `TitleTimelineView` remain untouched
- [X] T004 [P] Verify shared design tokens, `StatusBar`, and button variants to ensure semantic compliance with Rule of 2 and layout guidelines across `components/dashboard-titles/`

**Checkpoint**: Foundation ready — stage components can now be redesigned and verified independently.

---

## Phase 3: User Story 1 - Compact Intake & Clearance Verification Workspace (Priority: P1) 🎯 MVP

**Goal**: Replace verbose narrative banners and multi-card layouts in `TitleIntakeTab` with a compact 2-column spec sheet and immediate top action bar.

**Independent Test**: Open an account cleared by billing: verify that buyer information, co-owners, contact channels, and lot dimensions (sqm, price) render above the fold in a dense 2-column layout without narrative paragraph banners, and that clicking "Start Legal Processing" or "Return to Billing" triggers confirmed actions per Scenario 1 in `quickstart.md`.

### Implementation for User Story 1

- [X] T005 [US1] Replace verbose clearance verification banner in `components/dashboard-titles/title-intake-tab.tsx` with a concise status pill (`Cleared by Billing`) and clearance timestamp strip
- [X] T006 [US1] Consolidate buyer identity, co-buyers, contact channels, and property parcel specifications into a unified, compact two-column spec sheet in `components/dashboard-titles/title-intake-tab.tsx`
- [X] T007 [US1] Refactor primary action buttons in `components/dashboard-titles/title-intake-tab.tsx` into a compact above-the-fold action strip ("Return to Billing" danger/quiet variant and "Start Legal Processing" primary button) with explicit confirmation dialogs

**Checkpoint**: User Story 1 (MVP) is functional and testable independently.

---

## Phase 4: User Story 2 - Streamlined Document Preparation, Review & Signature Workbench (Priority: P1)

**Goal**: Streamline `TitlePacketTab` by removing the duplicate `StepChecklist` card, embedding TCT quick-edit directly into the header toolbar, condensing document rows with concise status pills, and docking stage progression controls at the top.

**Independent Test**: Open an active title in Document Preparation: verify no duplicate `StepChecklist` appears, TCT editing is accessible in the header area, release documents display in a dense list without helper microcopy, deed generation modal opens cleanly, and review/signature gates operate smoothly per Scenarios 2 & 3 in `quickstart.md`.

### Implementation for User Story 2

- [X] T008 [US2] Remove duplicate `StepChecklist` card from `components/dashboard-titles/title-packet-tab.tsx`, relying exclusively on `TitleTimelineView` for stage progress visualization
- [X] T009 [US2] Embed Transfer Certificate of Title (TCT) status chip and inline quick-edit form directly into the packet header toolbar in `components/dashboard-titles/title-packet-tab.tsx`
- [X] T010 [US2] Redesign the Release Packet document list in `components/dashboard-titles/title-packet-tab.tsx` into a dense, scannable table/list with concise status badges (`Complete`, `Missing`, `Omitted - Prior Transfer`) and compact contextual action icons (View, Generate Deed, Upload/Replace, Delete), eliminating redundant helper subtitle sentences
- [X] T011 [US2] Dock the dynamic Stage Management action strip at the top of `components/dashboard-titles/title-packet-tab.tsx`, presenting above-the-fold controls for Submit for Review, Revert with required reason, and Executive Signature Checkpoint

**Checkpoint**: User Stories 1 and 2 operate cleanly and allow full title progression from intake through signature with reduced vertical scrolling.

---

## Phase 5: User Story 3 - Concise Client Outreach, Claim Notices & Storage Fee Overview (Priority: P2)

**Goal**: Streamline `TitleNoticesTab` by elevating the "Record Release to Buyer" milestone action to the top, condensing the 4-tile storage fee card into an inline summary badge, and displaying notice history as a compact chronological audit log.

**Independent Test**: Open a title in "Ready for Claim": verify "Record Release to Buyer" is elevated as the top primary CTA, storage fees display as an inline summary badge (grace period, overdue months, accrued balance), and notice history renders as a compact chronological audit log per Scenario 5 in `quickstart.md`.

### Implementation for User Story 3

- [X] T012 [US3] Elevate "Record Release to Buyer" as the prominent primary milestone CTA at the top of `components/dashboard-titles/title-notices-tab.tsx`
- [X] T013 [US3] Condense the 4-box storage fee tile grid into an inline financial summary badge strip in `components/dashboard-titles/title-notices-tab.tsx` showing grace period status, overdue months, and accrued balance (₱540/mo)
- [X] T014 [US3] Refactor the notice escalation history in `components/dashboard-titles/title-notices-tab.tsx` into a compact chronological audit log with concise status pills (`Ongoing`, `Received`, `Returned to Sender`) and direct proof preview links
- [X] T015 [US3] Streamline the notice dispatch and resolution form in `components/dashboard-titles/title-notices-tab.tsx` for logging delivery outcomes and proof scan attachments without verbose instructional copy

**Checkpoint**: User Stories 1, 2, and 3 are functional and cover all pre-release and notice escalation operations with compact layouts.

---

## Phase 6: User Story 4 - Focused 30-Day Clearance Inspection & Countdown (Priority: P3)

**Goal**: Streamline `TitleClearanceTab` by eliminating redundant sub-checklists and focusing on a minimal countdown meter, key lot reference, and clear role-gated action buttons.

**Independent Test**: Open a title in "Clearance Period": verify countdown days remaining and target completion date render via `StatusBar`, no redundant document/TCT sub-checklists are present, standard users cannot advance early, and administrators see an override confirmation dialog per Scenario 4 in `quickstart.md`.

### Implementation for User Story 4

- [X] T016 [US4] Remove redundant packet verification sub-checklists from `components/dashboard-titles/title-clearance-tab.tsx`
- [X] T017 [US4] Streamline the 30-Day Clearance countdown card in `components/dashboard-titles/title-clearance-tab.tsx` with a clean `StatusBar` meter, days remaining pill, target completion date, and role-gated "Mark Ready for Claim" / "Early Clearance Override" trigger

**Checkpoint**: User Stories 1 through 4 are functional and streamlined.

---

## Phase 7: User Story 5 - Compact Turnover Dossier & Release Archive (Priority: P3)

**Goal**: Redesign `TitleReleasedTab` into a clean, compact certificate-grade 2-column key-value dossier with direct clearance sheet preview and metadata quick-edit dialog.

**Independent Test**: Open any released title: verify recipient details, valid ID, handover timestamp, property specs, and settled fee status render in a unified 2-column key-value layout, and the attached signed clearance sheet scan is previewable with a single click per Scenario 6 in `quickstart.md`.

### Implementation for User Story 5

- [X] T018 [US5] Redesign the released turnover archive in `components/dashboard-titles/title-released-tab.tsx` into a compact certificate-grade 2-column key-value dossier displaying recipient identity, ID number, handover timestamp, and lot reference
- [X] T019 [US5] Format the settled storage fee indicator and signed clearance sheet attachment preview tile in `components/dashboard-titles/title-released-tab.tsx` into a compact summary row with quick-edit trigger for correcting recipient metadata

**Checkpoint**: All 5 user story stages operate with low verbosity and high density.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cross-stage layout verification, responsive testing, and test suite execution.

- [X] T020 [P] Validate responsive layout wrapping on viewports from 768px (tablets) to 1920px (desktop monitors) across all 5 stage views to verify zero text clipping, no horizontal overflow, and a minimum 35% reduction in vertical scroll height
- [X] T021 Run full integration test suite via `npm run test:e2e:titles` to verify zero regression in title lifecycle state transitions and backend mutations
- [X] T022 Execute end-to-end quickstart validation scenarios from `specs/004-title-dialog-pages-redesign/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phases 3 to 7)**:
  - User Story 1 (P1): Account Intake (MVP)
  - User Story 2 (P1): Document Preparation Workbench (depends on US1 intake passing titles)
  - User Story 3 (P2): Ready for Claim & Notices (depends on US2 for title advancement)
  - User Story 4 (P3): 30-Day Clearance Inspection (intermediate stage between US2 and US3)
  - User Story 5 (P3): Released Archive Dossier (final stage reached after US3 release)
- **Polish (Phase 8)**: Depends on all user stories complete.

### Parallel Opportunities

- Setup tasks T001 and T002 can run in parallel.
- Foundational tasks T003 and T004 can run in parallel.
- Within each user story, independent sub-components and dialogs can be prepared in parallel.
- User story tab implementations affect distinct files:
  - US1: `components/dashboard-titles/title-intake-tab.tsx`
  - US2: `components/dashboard-titles/title-packet-tab.tsx`
  - US3: `components/dashboard-titles/title-notices-tab.tsx`
  - US4: `components/dashboard-titles/title-clearance-tab.tsx`
  - US5: `components/dashboard-titles/title-released-tab.tsx`

---

## Parallel Example: User Stories 1 and 2

```bash
# Developer A works on US1 Intake tab:
Task: "T006 [US1] Consolidate buyer identity and property parcel specifications into a unified, compact two-column spec sheet in components/dashboard-titles/title-intake-tab.tsx"

# Developer B works on US2 Document Preparation tab:
Task: "T009 [US2] Embed Transfer Certificate of Title (TCT) status chip and inline quick-edit form directly into the packet header toolbar in components/dashboard-titles/title-packet-tab.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup & baseline test check.
2. Complete Phase 2: Foundational bounds check in `title-dialog.tsx`.
3. Complete Phase 3: User Story 1 (`title-intake-tab.tsx`).
4. **STOP and VALIDATE**: Verify intake verification and "Start Legal Processing" per Scenario 1 in `quickstart.md`.

### Incremental Delivery

1. Add User Story 2 (`title-packet-tab.tsx`): Remove `StepChecklist`, embed header TCT editor, compact document rows, top stage controls.
2. Add User Story 4 (`title-clearance-tab.tsx`): Minimal countdown meter without duplicate checklists.
3. Add User Story 3 (`title-notices-tab.tsx`): Elevate "Record Release" to top, inline fee strip, compact notice audit log.
4. Add User Story 5 (`title-released-tab.tsx`): Compact certificate dossier.
5. Execute Phase 8: Layout and responsive fit validation + full test suite pass.
