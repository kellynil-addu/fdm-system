# Phase 1 Data Model: Archived Project Area View Switch

No persistent data model changes. This feature adds one transient UI value and one derived
collection. Everything below already exists in the schema.

## Existing entities (unchanged)

### Project Area (`project_area`)

| Attribute | Type | Relevance |
|---|---|---|
| `project_area_id` | uuid | Identity; used as the selection key and draft storage key |
| `name` | text | Pick list label |
| `boundary` | `[lng, lat][]` | Drawn on the map; unchanged |
| `is_archived` | boolean | **Set membership discriminator** |
| `archived_at` | timestamptz \| null | Used only by the existing hold-period eligibility rule; not used for set membership |

### Property Lot / Subdivision

Lots and subdivisions belong to a project area and are drawn per project area. They are filtered
implicitly: a lot is drawn only if its project area is in the visible set. No lot field changes.

## New transient values (client memory only)

### Editor View Selection

| Attribute | Type | Values |
|---|---|---|
| `editorProjectAreaView` | union | `'active' \| 'archived'` |
| default | `'active'` | Applied every time the editor is entered; not persisted |

- Lifecycle: created when the editor is entered, destroyed when the editor is left. Leaving the
  editor resets it to `'active'`, matching FR-004 and FR-009 (the everyday map has no such state).
- Not stored in the URL, localStorage, or the database.

### Visible Project Area Set (derived)

`filterProjectAreasByView(projectAreas, view)` — pure. Rules:

1. `view === 'active'` → keep `!projectArea.is_archived`
2. `view === 'archived'` → keep `projectArea.is_archived`
3. Order preserved from the input (already sorted by name from `getAllProjectAreasWithLots`).
4. Input array is never mutated.

`countProjectAreasByView(projectAreas)` → `{ active: number, archived: number }` for the switch
labels.

## State transitions

| Trigger | Selection (`activeProjectAreaId`) | Visible set | Drafts / pending updates |
|---|---|---|---|
| Enter editor | → `null` (existing behaviour) | Set by `editorProjectAreaView` (`'active'`) | untouched |
| Switch to other view | → `null` if the selected project area is not in the new set | Recomputed | untouched and retained in localStorage per project area |
| Select a project area | → that id | unchanged | Restored from localStorage by the existing effect |
| Leave editor | → `null` | Everyday rule applies (`non-archived` only) | Cleared as today |
| Archive/restore the selected project area | → `null` (it leaves the current set after refresh) | Recomputed | Cleared for that project area by the existing flow |

## Validation rules

- View values are a closed union; no free-form input.
- A project area is in exactly one set, so no project area can be both drawn and hidden at once
  (SC-001) and switching never yields an empty intersection.
- An empty set is a legal value, rendered as an empty-state message, never as an error.
