# UI Contract: Editor Project Area View Switch

Internal application UI contract (no HTTP surface). It fixes the module boundary and prop shapes so
implementation and tests agree without an implementation file existing yet.

## `lib/project-area-views.ts` (new)

```ts
export type ProjectAreaView = 'active' | 'archived';

/** Keeps only the project areas belonging to `view`; never mutates its input. */
export function filterProjectAreasByView<T extends { is_archived?: boolean | null }>(
  projectAreas: T[],
  view: ProjectAreaView
): T[];

/** Counts each set for the switch labels; `active + archived === projectAreas.length`. */
export function countProjectAreasByView(
  projectAreas: { is_archived?: boolean | null }[]
): Record<ProjectAreaView, number>;

/** The view a project area belongs to. Exactly one. */
export function projectAreaViewOf(projectArea: { is_archived?: boolean | null }): ProjectAreaView;
```

Invariants:
- `filterProjectAreasByView(xs, 'active')` and `filterProjectAreasByView(xs, 'archived')` are
  disjoint and their concatenation is a permutation of `xs`.
- `is_archived` missing or `null` is treated as active.
- Input array identity is preserved for the empty case semantics: returns a new array always.

## `ProjectAreaMapUnifiedView`

Adds:

```ts
const [editorProjectAreaView, setEditorProjectAreaView] =
  useState<ProjectAreaView>('active');

const editorProjectAreas = useMemo(
  () => filterProjectAreasByView(projectAreas, editorProjectAreaView),
  [projectAreas, editorProjectAreaView]
);

function handleChangeEditorView(next: ProjectAreaView): void; // clears out-of-set selection
```

Behaviour:
- `<ProjectAreaMap projectAreas={isEditorActive ? editorProjectAreas : projectAreas}>`
- `<MapProjectAreaEditor projectAreas={editorProjectAreas} view={editorProjectAreaView} onViewChange={handleChangeEditorView}>`
- `handleConfirmEditorEntry` resets `editorProjectAreaView` to `'active'`.
- `handleChangeEditorView` only sets the view and, when `activeProjectAreaId` is not in the new set,
  clears it via the existing `handleSelectProjectArea(null)` path. It must not touch `draftLots`,
  `pendingBoundaryUpdates`, or `pendingProjectAreaBoundaryUpdates`.

## `MapProjectAreaEditor` (new props)

```ts
// Project area view (editor mode only)
view: ProjectAreaView;
onViewChange: (view: ProjectAreaView) => void;
```

- Renders a `Tabs` control (`components/ui/tabs`, default variant) with `Active (n)` /
  `Archived (n)` in the project-area-chooser state and in the selected-project-area header.
- `projectAreas` received by this component is already filtered; the component MUST NOT filter
  again.
- Empty filtered list renders the existing "No project areas yet" empty-state message with wording
  adjusted to name the view (e.g. "No archived project areas.").

## `ProjectAreaMap`

No prop changes. Its `isEditorMode` branch
(`isEditorMode ? allProjectAreas : allProjectAreas.filter(s => !s.is_archived)`) is now fed an
already-filtered list in editor mode; add a comment recording that invariant. The non-editor branch
is unchanged (FR-009).

## Observability for tests

The map already publishes its source data at `window.__fdmMap` (`useMapLibreMap`,
`E2E_MAP_HANDLE`). Tests read `getSource('project-areas-data').serialize().data.features` and
`properties.isProjectAreaArchived` from each feature — both pre-existing.
