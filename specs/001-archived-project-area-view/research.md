# Phase 0 Research: Archived Project Area View Switch

All Technical Context entries were resolvable from the repository; no NEEDS CLARIFICATION remains.

## R1. Where the switch control lives

**Decision**: Inside the existing top-left editor control card in
`components/dashboard-properties/map-project-area-editor.tsx`, in the project-area-chooser state
(`!activeProjectArea`), directly above the "Choose a project area to edit" list — and also in the
selected-project-area state's header row so the staff member can switch after opening one.

**Rationale**: That card is already the editor's control surface and is already hidden while a
focused activity (plot draft, boundary readjust) is running. Placing the switch there means it is
never reachable while unsaved geometry is mid-gesture, satisfying FR-007 without a new guard. The
editor tells us it is `return null` when `!isEditorActive`, so the switch is confined to editor mode
by construction — FR-009.

**Alternatives considered**:
- *Floating control next to the existing "Map Editor" button in the unified view* — rejected: that
  button is rendered only when the editor is **not** active, so it is the wrong surface.
- *A control in `PropertyLotsSidebar`* — rejected: the sidebar is hidden whenever the editor is
  active (`isSidebarOpen && !isEditorActive` in `map-project-area-unified-view.tsx`), so the user
  could not reach it, and it would contradict the clarification that only editor mode changes.
- *A keyboard shortcut* — rejected: undiscoverable for a skeletal staff.

## R2. How the filter flows through the component tree

**Decision**: Hold `editorProjectAreaView: 'active' | 'archived'` in
`ProjectAreaMapUnifiedView`. Derive `editorProjectAreas = filterProjectAreasByView(projectAreas, view)`
via a pure helper in `lib/project-area-views.ts`, and pass that filtered array to **both**
`<ProjectAreaMap projectAreas=…>` and `<MapProjectAreaEditor projectAreas=…>`. In non-editor mode,
keep passing the unfiltered `projectAreas` to the map exactly as today.

**Rationale**: `map-project-area.tsx` already filters by mode
(`isEditorMode ? allProjectAreas : allProjectAreas.filter(s => !s.is_archived)`). Passing the editor a
list that is already one set means the map's `isEditorMode` branch, the pin/label effect, the
`projectAreasGeoJson` and `lotsGeoJson` memos, and the registered-lot map all follow for free — one
filter at the top instead of five downstream conditionals. It also gives the editor picker the same
list as the map, so FR-002 and FR-003 cannot drift apart.

**Alternatives considered**:
- *Pass the view down and filter in `map-project-area.tsx`* — rejected: duplicates the predicate in
  two components and requires the editor to filter separately for its picker, which is exactly the
  drift class FR-002/FR-003 guards against.
- *Refetch per view from the server* — rejected: violates the no-refetch perf goal, and
  `getAllProjectAreasWithLots` already returns both sets.

## R3. What happens to selection and focus on switch

**Decision**: In the unified view's switch handler, if the currently `activeProjectAreaId` is not in
the newly selected set, call the existing `handleSelectProjectArea(null)` path (sets
`activeProjectAreaId = null`). Leaving it null is already the editor's "top of the decision tree"
state, which the map turns into the regional overview because the existing focus effect flies to
`REGIONAL_CENTER` when `focusedProjectAreaId` is falsy.

**Rationale**: Reuses the selection-clearing already written for leaving a project area, so the map,
the pins, and the editor card all reset consistently. No new focus-reset code (FR-006).

**Alternatives considered**:
- *Auto-select the first project area in the new set* — rejected: implicit selection is exactly the
  "ended up in the wrong project area" failure the feature exists to prevent.
- *Bias toward keeping selection if it happens to be in both sets* — impossible: a project area is
  in exactly one set by its archive flag.

## R4. Preserving unsaved work across a switch

**Decision**: Do not touch `draftLots`, `pendingBoundaryUpdates`,
`pendingProjectAreaBoundaryUpdates`, `activeDraft`, or `readjustProjectArea` in the switch handler;
only replace the visible set and clear an out-of-set selection.

**Rationale**: Drafts are keyed by `projectAreaId` in localStorage
(`lib/storage/map-draft-storage.ts`) and the restore effect runs on `activeProjectAreaId` change, so
clearing selection parks the work and reselecting that project area brings it back. The existing
`hasPendingChanges()` guard already covers leaving and exiting the editor; the switch is not leaving,
so it does not need that guard — and because the switch is unreachable mid-gesture (R1), no draft can
be half-plotted while switching.

**Alternatives considered**:
- *Confirm dialog on switch when drafts exist* — rejected: the spec's edge case says switching must
  not discard work; since it does not discard anything, a confirmation would be noise for staff doing
  three jobs.
- *Store drafts per view* — rejected: adds a storage-key dimension for no user-visible benefit.

## R5. Control primitive and appearance

**Decision**: Compose `Tabs` / `TabsList` / `TabsTrigger` from `components/ui/tabs.tsx` with the
default variant, showing labels `Active (n)` and `Archived (n)`.

**Rationale**: `tabs.tsx` is the project's existing segmented-control primitive (Radix tabs already
used, e.g. `components/dashboard-billing/billing-account-dialog.tsx`); the project's UI rules forbid
hand-rolling a segmented control when a primitive exists and forbid long inline utility chains
repeated across elements (Rule of 2). Radix gives roving focus and `aria-selected` for free, which
covers the accessibility side of FR-001/FR-008. Counts in the label satisfy FR-008 without a second
widget.

Caveat: the editor card is narrow (inside a `max-w-[calc(100vw-2rem)]` floating panel). Label length
must be verified in a real render per `.agents/skills/layout-verification/SKILL.md` before asserting
it fits; if it wraps, shorten to `Active` / `Archived` and render the counts as badges beside the
list heading.

**Alternatives considered**:
- *Button pair with `variant={selected ? 'default' : 'outline'}`* — rejected: that is the hand-rolled
  segmented control the UI rules disallow across 2+ places.
- *Dropdown menu* — rejected: hides current state, which Story 3 requires to be visible at a glance.

## R6. Testing strategy

**Decision**:
- `lib/project-area-views.ts` holds the pure predicate and count helpers; Vitest covers it in
  `scripts/tests/properties/map-project-area-view.test.ts` (no DB, no DOM).
- Playwright spec `e2e/map-editor-archive-view.spec.ts` drives the real editor: enter the editor,
  read project-area features from `window.__fdmMap`'s `project-areas-data` source (published by
  `useMapLibreMap` as `__fdmMap`, per `e2e/helpers/map.ts`), switch views, and assert the feature set
  is disjoint and matches the archive flag.

**Rationale**: Vitest here is a DB-backed harness; a pure filter needs none of it and runs instantly.
The map is WebGL, so the Playwright helper pattern already established in `e2e/helpers/map.ts` is the
only way to observe what is drawn. Asserting on `project-areas-data` features is behavioural (what
the map actually holds) rather than on a React prop, so it catches a filter applied in the wrong
place.

**Alternatives considered**:
- *React Testing Library component test* — no RTL harness exists in this repo; introducing one is a
  new dependency, barred by YAGNI.
- *DB-backed Vitest hitting `getAllProjectAreasWithLots`* — adds nothing: the feature adds no server
  behaviour.

## R7. Where the archive-state predicate comes from

**Decision**: `Boolean(projectArea.is_archived)` — the field already on `ProjectArea` /
`ProjectAreaWithLots` (`lib/types/property.ts:68`).

**Rationale**: `getAllProjectAreasWithLots` selects `*`, so the flag is already on the payload the
page passes to the unified view; no query, type, or migration change is needed. `archived_at` is only
for the hold-period eligibility rule (`lib/utils/archive-rules.ts`) and is not needed to decide set
membership.

**Alternatives considered**:
- *Derive from `archived_at != null`* — rejected: `is_archived` is the canonical flag the archive
  action writes and the rest of the app reads.
