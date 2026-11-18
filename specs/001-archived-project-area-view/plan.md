# Implementation Plan: Archived Project Area View Switch

**Branch**: `001-archived-project-area-view` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-archived-project-area-view/spec.md`

## Summary

Give the map editor a two-way switch (Active | Archived) so it draws and lists one set of project
areas at a time. The switch lives in the editor's existing top-left control card, holds view state in
the unified view component, filters the project area list once at the top, and passes the already
filtered list to both the map and the editor picker. Outside editor mode nothing changes: the map's
current `isEditorMode ? all : non-archived` rule stays as the everyday behaviour. Filtering is
extracted into a pure helper in `lib/` so it is unit-testable without a DOM.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19 (Next.js App Router)

**Primary Dependencies**: Next.js, shadcn/ui primitives (`components/ui/tabs`), MapLibre GL via
`useMapLibreMap`, lucide-react icons

**Storage**: No schema change. Project area archive state already exists (`project_area.is_archived`,
`archived_at`); the view choice is transient UI state, held in React state for the editor session.

**Testing**: Vitest (`scripts/tests/properties/`) for the pure filtering helper; Playwright
(`e2e/`) for the editor flow against the real map, reading `project-areas-data` from
`window.__fdmMap`

**Target Platform**: Web dashboard, desktop widths (editor card is already constrained to
`max-w-[calc(100vw-2rem)]`)

**Project Type**: Web application (single Next.js project)

**Performance Goals**: View switch re-renders in under 2 s (SC-002); it is a client-side filter over
an already-loaded project area list — no refetch

**Constraints**: No new dependency, no new permission, no server action change. Must preserve unsaved
editor work across a switch (FR-007) by leaving `draftLots` / `pendingBoundaryUpdates` /
`pendingProjectAreaBoundaryUpdates` untouched — they are already persisted per project area in
localStorage and restored on reselection.

**Scale/Scope**: One page (`/dashboard/properties/map`), four touched files plus one new `lib/`
helper and one Playwright spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict |
|---|---|
| I. Internal-only, employee-operated | Pass — no new public surface |
| II. Customers are viewers only | Pass — switch is an employee control; no new mutable input exposed to a presented screen beyond what already exists |
| III. Data integrity over convenience | Pass — display-only change; no mutation path added, no direct DB write |
| IV. Least privilege by role | Pass — no new permission; switch follows existing `properties.read` page access |
| V. One source of truth | Pass — plan references `.agents/skills/ui-components` (primitives, Rule of 2) and `.agents/skills/maplibre-gl`; no restated skill content |
| VI. Simplicity and YAGNI | Pass — deletes a mode special-case rather than adding one; no new abstraction beyond one pure helper |
| VII. Test-first for domain logic | Pass — no billing/title/forfeiture rule touched; helper is covered by Vitest, flow by Playwright |
| VIII. Realism over ambition | Pass — pure UI change, no infrastructure |
| Dev workflow: job served | Pass — spec names **collect payments** |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-archived-project-area-view/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── view-switch.md   # Phase 1 output (UI contract)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
lib/
├── project-area-views.ts              # NEW: pure view filter + counts
components/dashboard-properties/
├── map-project-area-unified-view.tsx  # EDIT: view state, filtered list, switch handler
├── map-project-area-editor.tsx        # EDIT: switch control in the top-left card
└── map-project-area.tsx               # EDIT: comment only — editor branch now receives a filtered list
scripts/tests/properties/
└── map-project-area-view.test.ts      # NEW: helper unit tests
e2e/
└── map-editor-archive-view.spec.ts    # NEW: editor switch end-to-end
```

**Structure Decision**: Single Next.js project. The switch is a local subcomponent inside
`map-project-area-editor.tsx` (one component folder level; no new folder), composed from the existing
`components/ui/tabs` primitive rather than a hand-rolled segmented control. Domain filtering goes in
`lib/` per the three-tier separation.

## Phase 0: Outline & Research

See [research.md](./research.md). Resolved: where the control lives, how the filter flows, what
happens to selection and drafts on switch, how the switch is tested.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) — entities, view predicate, state transitions
- [contracts/view-switch.md](./contracts/view-switch.md) — props and behaviour contract
- [quickstart.md](./quickstart.md) — how to run and verify
