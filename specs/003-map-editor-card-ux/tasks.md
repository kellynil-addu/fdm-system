---
description: "Task list for Map Editor Card Layout Stability and UX Refinement"
---

# Tasks: Map Editor Card Layout Stability and UX Refinement

**Input**: Design documents from `specs/003-map-editor-card-ux/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/editor-card-contract.ts, quickstart.md  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file paths in its description.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment verification and test baseline

- [X] T001 Verify project environment, dependencies, and test runner baseline by running `npm run test:e2e:map` and `npx playwright test e2e/map-editor-archive-view.spec.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core layout contract and automated test harness that MUST be complete before user stories

**⚠️ CRITICAL**: Establish dimension assertions before changing component classes

- [X] T002 Review layout token specifications in `specs/003-map-editor-card-ux/contracts/editor-card-contract.ts` ensuring `w-[340px]` standard is established
- [X] T003 [P] Add Playwright test assertions in `e2e/map-editor-archive-view.spec.ts` verifying editor card bounding box width stability (`340px` ± 4px) across Chooser, Focused, and Active Plotting states

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Stable, predictable card dimensions across editor states (Priority: P1) 🎯 MVP

**Goal**: Eliminate horizontal layout shifts and sudden width collapse/expansion when switching between Chooser, Focused, and Active Plotting states.

**Independent Test**: Enter map editor, select project area, click "+ Plot Lot", place vertices, undo, and cancel; verify card container maintains anchored `w-[340px]` width without horizontal jumping.

### Implementation for User Story 1

- [X] T004 [US1] Apply stable anchored width (`w-[340px] max-w-[calc(100vw-2rem)]`) to the main floating card container in `components/dashboard-properties/map-project-area-editor.tsx`
- [X] T005 [US1] Refactor the Active Plotting header in `components/dashboard-properties/map-project-area-editor.tsx` into a structured status row with dedicated space for point count and the "Outside Boundary" alert
- [X] T006 [US1] Restructure Active Plotting action button row (Undo, Cancel, Finish Shape) in `components/dashboard-properties/map-project-area-editor.tsx` to maintain fixed hit targets and prevent wrapping
- [X] T007 [US1] Run Playwright test suite `npx playwright test e2e/map-editor-archive-view.spec.ts` to confirm dimensional stability and state transitions

**Checkpoint**: User Story 1 is fully functional and independently testable as an MVP increment.

---

## Phase 4: User Story 2 - Consistent sizing and visual hierarchy across controls (Priority: P1)

**Goal**: Harmonize button heights, typography tokens, icon sizing, and list scrolling across all states of the editor card.

**Independent Test**: Measure buttons and controls across Chooser, Focused, and Plotting states to verify matching control heights (`h-8` primary, `h-7` secondary) and aligned typography.

### Implementation for User Story 2

- [X] T008 [US2] Standardize button heights and typography tokens in `components/dashboard-properties/map-project-area-editor.tsx` (`h-8 text-xs font-medium` for primary actions; `h-7 text-xs` for secondary/toolbar actions)
- [X] T009 [US2] Standardize icon sizes to `h-3.5 w-3.5` across action buttons and list item icons in `components/dashboard-properties/map-project-area-editor.tsx`
- [X] T010 [US2] Refactor project area list items in `components/dashboard-properties/map-project-area-editor.tsx` with uniform vertical rhythm, symmetric padding, and aligned trailing badges
- [X] T011 [US2] Configure the project area scrollable container in `components/dashboard-properties/map-project-area-editor.tsx` with stable scrollbar padding to eliminate horizontal reflow on scroll

**Checkpoint**: User Stories 1 and 2 are functional, visually cohesive, and independently testable.

---

## Phase 5: User Story 3 - Ergonomic lot details entry and boundary adjustment transitions (Priority: P2)

**Goal**: Ensure lot details entry after finishing a shape and boundary readjustment mode open in proportioned, anchored cards without obscuring the canvas geometry.

**Independent Test**: Finish drawing a 4-point lot polygon; confirm the lot detail form renders in a proportional `w-[340px]` container without expanding into an oversized 576px modal.

### Implementation for User Story 3

- [X] T012 [US3] Refactor `activeDraft` lot detail container in `components/dashboard-properties/map-project-area-editor.tsx` from `max-w-xl` (576px) to anchored `w-[340px] max-w-[calc(100vw-2rem)]`
- [X] T013 [US3] Reorganize lot detail form fields (Block No., Lot No., Area display) in `components/dashboard-properties/map-project-area-editor.tsx` to fit elegantly within the 340px card layout
- [X] T014 [US3] Refactor Readjust Boundary container and LocalStorage recovery banners in `components/dashboard-properties/map-project-area-editor.tsx` to align with the standardized card width boundaries
- [X] T015 [US3] Add automated Playwright verification in `e2e/map-editor-archive-view.spec.ts` asserting that lot detail card dimensions remain bounded and do not exceed 360px

**Checkpoint**: All three user stories are complete and independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression testing, navigation verification, and validation guide execution

- [X] T016 Run full Playwright test suite `npx playwright test e2e/map-editor-archive-view.spec.ts` and Vitest unit tests `npx vitest run scripts/tests/properties/map-project-area-view.test.ts`
- [X] T017 Verify that all navigation flows ("Leave Editor", "Leave Project Area", property lot list switcher, and map controls) remain completely untouched and 100% backward-compatible
- [X] T018 Execute validation scenarios in `specs/003-map-editor-card-ux/quickstart.md` and verify zero visual regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user story tasks.
- **User Story 1 (Phase 3)**: Depends on Phase 2 — Deliverable as MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2 & Phase 3 container standardization.
- **User Story 3 (Phase 5)**: Depends on Phase 2 & Phase 3 container standardization.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Establishes the stable 340px card foundation for Chooser, Focused, and Plotting.
- **User Story 2 (P1)**: Polishes the internal control sizing, icons, and list rhythm within the stable 340px card.
- **User Story 3 (P2)**: Extends the 340px card geometry to the lot detail and boundary readjustment states.

### Parallel Opportunities

- T002 and T003 can run in parallel during Foundational Phase.
- T008, T009, T010, and T011 in US2 can be implemented together in `map-project-area-editor.tsx`.
- T012, T013, and T014 in US3 can be implemented together in `map-project-area-editor.tsx`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1: `T004`–`T007`).
3. **STOP and VALIDATE**: Test card width constancy with `npx playwright test e2e/map-editor-archive-view.spec.ts`.
4. Deliver MVP increment.

### Incremental Delivery
1. Add User Story 2 (`T008`–`T011`): Harmonize all buttons, icons, and list metrics.
2. Add User Story 3 (`T012`–`T015`): Refactor lot details and boundary readjustment containers.
3. Complete Polish (`T016`–`T018`): Final regression suite and navigation checks.
