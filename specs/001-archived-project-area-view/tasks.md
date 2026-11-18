---

description: "Task list for the archived project area view switch"
---

# Tasks: Archived Project Area View Switch

**Input**: Design documents from `/specs/001-archived-project-area-view/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/view-switch.md, quickstart.md

**Tests**: Included. The project constitution (Principle VII) and the plan require tests, and the
repo already has a Vitest + Playwright harness for this area.

**Organization**: Tasks are grouped by user story. Story 1 is the MVP; stories 2 and 3 adjust the
same two components and are sequenced after it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are given in every task

## Path Conventions

Single Next.js project at the repository root: `lib/`, `components/`, `scripts/tests/`, `e2e/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the ground this feature builds on. No scaffolding or dependency is needed.

- [x] T001 Confirm the test harness runs green before changes: `npx vitest run scripts/tests/properties/map-project-area.test.ts` and `npx tsc --noEmit`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure view-filter helper that every story consumes.

**⚠️ CRITICAL**: No story work can begin until `lib/project-area-views.ts` exists.

- [x] T002 Write the failing unit tests for the view filter in `scripts/tests/properties/map-project-area-view.test.ts`: active/archived results are disjoint, their union is a permutation of the input, input order is preserved, input array is not mutated, `is_archived` missing or `null` counts as active, and `countProjectAreasByView` returns `{active, archived}` summing to the input length
- [x] T003 Create `lib/project-area-views.ts` exporting `ProjectAreaView = 'active' | 'archived'`, `filterProjectAreasByView`, `countProjectAreasByView`, and `projectAreaViewOf` per `contracts/view-switch.md` (generic over `{ is_archived?: boolean | null }`, always returns a new array)
- [x] T004 Run `npx vitest run scripts/tests/properties/map-project-area-view.test.ts` and confirm T002's tests now pass

**Checkpoint**: Helper is green; stories can start.

---

## Phase 3: User Story 1 - Switch the map editor between active and archived project areas (Priority: P1) 🎯 MVP

**Goal**: Inside the map editor, the map draws and the picker lists exactly one set of project areas, switchable with one control.

**Independent Test**: Enter the editor with both an archived and an active project area present. The drawn set contains no archived outline; switching to Archived draws only archived ones; switching back restores the original set.

### Tests for User Story 1 ⚠️

> Write first; both MUST fail before implementation.

- [x] T005 [P] [US1] Add the Playwright spec skeleton `e2e/map-editor-archive-view.spec.ts`: log in with `loginAsAdmin` from `e2e/helpers/auth.ts`, open `/dashboard/properties/map`, enter the editor, wait for the map via `waitForMap` from `e2e/helpers/map.ts`, then read `window.__fdmMap`'s `getSource('project-areas-data').serialize().data.features` and assert every feature has `properties.isProjectAreaArchived === false`
- [x] T006 [US1] Extend `e2e/map-editor-archive-view.spec.ts` with the switching case: click the Archived tab, wait for the source to update, assert every feature has `isProjectAreaArchived === true` and the two feature-name sets are disjoint; then switch back and assert the original name set is restored exactly

### Implementation for User Story 1

- [x] T007 [US1] In `components/dashboard-properties/map-project-area-unified-view.tsx`, add `const [editorProjectAreaView, setEditorProjectAreaView] = useState<ProjectAreaView>('active')` and `const editorProjectAreas = useMemo(() => filterProjectAreasByView(projectAreas, editorProjectAreaView), [projectAreas, editorProjectAreaView])`; reset the view to `'active'` inside `handleConfirmEditorEntry`
- [x] T008 [US1] In the same file, pass `projectAreas={isEditorActive ? editorProjectAreas : projectAreas}` to `<ProjectAreaMap>` and `projectAreas={editorProjectAreas}` to `<MapProjectAreaEditor>`, and add `view`/`onViewChange` props to the editor element
- [x] T009 [US1] In the same file, implement `handleChangeEditorView(next: ProjectAreaView)`: call `setEditorProjectAreaView(next)`, then if `activeProjectAreaId` is not in the new set call the existing `handleSelectProjectArea(null)`; it MUST NOT touch `draftLots`, `pendingBoundaryUpdates`, or `pendingProjectAreaBoundaryUpdates`
- [x] T010 [US1] In `components/dashboard-properties/map-project-area-editor.tsx`, add `view: ProjectAreaView` and `onViewChange: (view: ProjectAreaView) => void` to `MapProjectAreaEditorProps` and destructure them
- [x] T011 [US1] In the same file, render the switch in the project-area-chooser state (`!activeProjectArea`) above the "Choose a project area to edit" heading using `Tabs`/`TabsList`/`TabsTrigger` from `components/ui/tabs` with `value={view}` and `onValueChange={onViewChange}`, labels `Active` and `Archived` (counts added in US3)
- [x] T012 [US1] In the same file, render the same switch in the selected-project-area state's header row so the staff member can switch after opening a project area; keep it disabled while `plotType !== null` or a draft/readjust activity is active (the card is already hidden in those states — preserve that)
- [x] T013 [US1] In `components/dashboard-properties/map-project-area.tsx`, add a comment at the `activeVisibleProjectAreas` memo recording that in editor mode the caller now supplies an already-filtered list, so the `isEditorMode ? allProjectAreas : …` rule stays as the non-editor behaviour only; change no logic
- [x] T014 [US1] Run `npx tsc --noEmit` and `npx vitest run scripts/tests/properties/map-project-area-view.test.ts`
- [x] T015 [US1] Run `npm run test:playwright -- e2e/map-editor-archive-view.spec.ts` and confirm both cases pass

**Checkpoint**: US1 delivers the switch and is independently testable.

---

## Phase 4: User Story 2 - The editor's project area picker follows the switch (Priority: P2)

**Goal**: The picker lists exactly the set the map draws, with a truthful empty state.

**Independent Test**: In the editor on Active, the picker lists no archived project area; on Archived, only archived ones; with an empty set, the empty-state message names the view.

### Tests for User Story 2

- [x] T016 [US2] Extend `e2e/map-editor-archive-view.spec.ts` with a picker assertion: read the project area names rendered in the editor card and assert they equal the names of the drawn `project-areas-data` features for the current view, in both views

### Implementation for User Story 2

- [x] T017 [US2] In `components/dashboard-properties/map-project-area-editor.tsx`, change the empty state from "No project areas yet. Plot a new one below." to a view-aware message: `No active project areas.` or `No archived project areas.` based on `view`; keep the plot-new-project-area path available only on the Active view
- [x] T018 [US2] Add a comment in `MapProjectAreaEditor` at the `projectAreas.map(...)` list stating the prop is pre-filtered by the caller and the component must not filter again
- [x] T019 [US2] Run `npm run test:playwright -- e2e/map-editor-archive-view.spec.ts` and confirm the picker case passes in both views

**Checkpoint**: US1 and US2 both hold; the list and the map cannot drift.

---

## Phase 5: User Story 3 - The switch is visible and unambiguous (Priority: P3)

**Goal**: The current view is obvious at a glance, and each option shows how much it contains.

**Independent Test**: On entering the editor the Active tab is selected; both tabs show counts; switching swaps the selection.

### Tests for User Story 3

- [x] T020 [US3] Extend `e2e/map-editor-archive-view.spec.ts` with an assertion that the `Active` tab has `aria-selected="true"` on editor entry, that both tab labels contain their counts, and that selecting `Archived` moves `aria-selected` to it

### Implementation for User Story 3

- [x] T021 [US3] In `components/dashboard-properties/map-project-area-editor.tsx`, derive `const viewCounts = countProjectAreasByView(projectAreas)` and render the tab labels as `Active (${viewCounts.active})` and `Archived (${viewCounts.archived})`
- [x] T022 [US3] Measured per `.agents/skills/layout-verification/SKILL.md` at 900 / 1024 / 1440 px: tablist 271 px inside a 273 px card inner width; each trigger 130 × 28 px with `scrollWidth === clientWidth` and height 28 px (one 16 px line + 12 px padding); no card overflow. Labels fit — no fallback needed
- [x] T023 [US3] Run `npm run test:playwright -- e2e/map-editor-archive-view.spec.ts` and confirm the selection/count case passes

**Checkpoint**: All three stories functional and independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T024 Verify FR-009 explicitly: with the editor closed, the everyday map still draws no archived project area and the `PropertyLotsSidebar` project area filter still offers only non-archived ones (code unchanged — confirm by reading `components/dashboard-properties/property-lots-sidebar.tsx` and `lib/hooks/use-property-lots.ts`, and by the manual step in `quickstart.md`)
- [x] T025 Confirm the draft-preservation path (FR-007) by reading `map-project-area-unified-view.tsx`: no switch handler clears `draftLots`/`pendingBoundaryUpdates`/`pendingProjectAreaBoundaryUpdates`, and the localStorage effect in `lib/storage/map-draft-storage.ts` still restores on reselection; then run the half-plotted-draft manual check from `quickstart.md`
- [x] T026 Run `npm run lint` and `npx tsc --noEmit`, fix any failures
- [ ] T027 Run the remaining manual checks in `quickstart.md` (half-plotted draft across a switch, archive-while-selected, leave-editor) — these need a human at the browser and were not run

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Phase 1 — blocks every story
- **User Stories**: US1 → US2 → US3 (all touch the same two component files, so they are sequential)
- **Polish (Phase 6)**: after US1–US3

### Story Dependencies

- **US1 (P1)**: needs Phase 2 only — MVP
- **US2 (P2)**: needs US1 (the filtered prop and the switch control must exist)
- **US3 (P3)**: needs US1 (the control) and benefits from US2's list pass

### Within Each Story

- Tests written and failing before implementation
- Helper/props before rendering
- Component edits before Playwright runs

### Parallel Opportunities

- T002 and T003 touch different files but T003 needs T002's shape; keep them sequential
- Within US1, T007–T009 all edit `map-project-area-unified-view.tsx` (sequential); T010–T012 edit `map-project-area-editor.tsx` (sequential); T013 edits `map-project-area.tsx` — T013 can run in parallel with T007–T012
- T020 (spec) and T021 (component) cannot overlap
- Nothing else is parallel in a meaningful way: three of the four touched source files are single-owner

---

## Parallel Example: User Story 1

```bash
# Different files, no dependency between them:
Task: "T013 Add filtered-list invariant comment in components/dashboard-properties/map-project-area.tsx"
Task: "T007–T012 Wire view state in map-project-area-unified-view.tsx and render the switch in map-project-area-editor.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 → Phase 2 (helper green)
2. Phase 3 (US1): state, filtered list, switch control, Playwright proof
3. **STOP and VALIDATE**: the editor draws one set and can switch
4. Demo if ready

### Incremental Delivery

1. US1 → validate → the mixing problem is gone
2. US2 → the picker can no longer disagree with the map
3. US3 → counts and selection state make the mode obvious
4. Polish → lint, types, manual walkthrough

---

## Notes

- No migration, no server action, no permission change anywhere in this list
- `[P]` marks only genuinely non-overlapping files
- Every task names its file; no task requires reading another design document beyond the ones listed in Prerequisites
- Verify tests fail before implementing (T002 before T003, T005/T006 before T007–T012)
