# Feature Specification: Archived Project Area View Switch

**Feature Branch**: `001-archived-project-area-view`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Add option to switch the view between strictly archived and non-archived project areas in the project area. No longer are both visible at the same time." — clarified: "This behavior is applied only when editor mode is enabled."

## Clarifications

### Session 2026-11-08

- Q: Should the archived/active switch affect the everyday map view, or only the map editor? → A: Only when editor mode is enabled; the everyday (non-editor) map view and its surrounding panels keep their current behavior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch the map editor between active and archived project areas (Priority: P1)

A staff member enters the map editor to plot lots or adjust boundaries. Inside the editor, they see one kind of project area at a time — active by default — and can switch to an archived view when they need to work on a retired subdivision. Archived and active project areas are never drawn together in the editor.

**Why this priority**: The map editor is where geometry work happens, and today it draws every project area, archived and active alike. Staff can mistake a retired project area for an active one and plot or readjust geometry against the wrong record. Separating the two sets inside the editor is the entire request.

**Independent Test**: Enter the map editor with at least one archived and one active project area present. Confirm the active set is drawn with no archived outline. Switch to archived and confirm only archived outlines are drawn. Switch back and confirm the reverse. No other feature depends on this.

**Acceptance Scenarios**:

1. **Given** the staff member has entered the map editor, **When** the editor opens, **Then** only non-archived project areas are drawn on the map and listed in the editor's project area picker.
2. **Given** the map editor is showing the active view, **When** the staff member switches to the archived view, **Then** only archived project areas are drawn and listed.
3. **Given** the map editor is showing the archived view, **When** the staff member switches to the active view, **Then** only non-archived project areas are drawn and listed.
4. **Given** the archived view is selected in the editor, **When** the staff member opens an archived project area, **Then** it is recognizably marked as archived and the actions unavailable for archived project areas (plotting, boundary readjustment, deletion before the hold period) remain unavailable.
5. **Given** a project area is selected or focused in the editor, **When** the staff member switches to a view that does not contain it, **Then** the selection and focus clear and the map returns to the regional overview.

---

### User Story 2 - The editor's project area picker follows the switch (Priority: P2)

The list of project areas the editor offers for selection matches the set currently drawn on the map, so the staff member never has to scan a list that includes project areas they cannot see.

**Why this priority**: A picker that still lists the hidden set would let staff select a project area the map is not showing, reintroducing the confusion the switch is meant to remove. It is a direct consequence of Story 1.

**Independent Test**: In the map editor on the active view, confirm the picker lists no archived project area. Switch to archived and confirm only archived project areas are listed.

**Acceptance Scenarios**:

1. **Given** the editor is on the active view, **When** the staff member opens the project area picker, **Then** only non-archived project areas are listed.
2. **Given** the editor is on the archived view, **When** the staff member opens the project area picker, **Then** only archived project areas are listed.

---

### User Story 3 - The switch is visible and unambiguous (Priority: P3)

The staff member can tell at a glance which set the editor is showing, and how much is in the other set, without opening a menu or reading a legend.

**Why this priority**: A switch that does not show its current state will be left in the wrong mode, which brings back the discarded-project-area risk. It improves Story 1 without being required for it.

**Independent Test**: Enter the editor, confirm the switch shows the active view as selected and the archived count; switch and confirm the labels swap.

**Acceptance Scenarios**:

1. **Given** the editor opens, **When** the switch renders, **Then** the active view is shown as selected.
2. **Given** either view is selected, **When** the staff member reads the switch, **Then** each option carries the count of project areas it contains (including zero).

---

### Edge Cases

- **One of the two sets is empty**: the switch remains usable and the empty set, when selected, shows an empty-state message in the picker and an unbroken regional-overview map — not an error or a blank canvas.
- **The last project area in the selected set is archived or restored inside the editor**: after the change is saved, the project area moves to the other set, so it disappears from the current view; the selection and focus clear as in Story 1 scenario 5.
- **Unsaved editor work**: switching views is a display change only and MUST NOT discard drafts, pending plot changes, or pending boundary readjustments.
- **Leaving the editor**: returning to the everyday map view restores that view's existing behavior (archived project areas not drawn); the switch does not carry over or alter it.
- **Deep link naming a hidden project area**: the editor opens on the active view and does not focus a project area outside it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The map editor MUST provide a visible control to switch between the active (non-archived) and archived sets of project areas.
- **FR-002**: While the map editor is active, the map MUST render only project areas belonging to the currently selected set; archived and non-archived project areas MUST NOT appear together.
- **FR-003**: The map editor's project area picker MUST list only project areas belonging to the currently selected set.
- **FR-004**: The active view MUST be the default when the editor is entered.
- **FR-005**: Archived project areas MUST keep their existing archive marking and treatment inside the archived view, and actions unavailable for archived project areas MUST remain unavailable.
- **FR-006**: Switching views MUST clear any project area selection and map focus that do not belong to the newly selected set, returning the map to the regional overview.
- **FR-007**: Switching views MUST NOT discard unsaved editor work — draft lots, pending plot changes, and pending boundary readjustments survive the switch.
- **FR-008**: Each view option MUST show the count of project areas it contains, and a view with none MUST show an empty state rather than a silent blank map.
- **FR-009**: The switch MUST be confined to editor mode: the everyday map view, its properties side panel, and every other screen MUST keep their current behavior and MUST NOT change which project areas they show.
- **FR-010**: The switch MUST be available to every staff member who can currently use the map editor; it MUST NOT introduce a new permission.

### Key Entities *(include if feature involves data)*

- **Project Area**: a subdivision or project boundary record; each belongs to exactly one set — archived or active — based on its archive state.
- **Editor View Selection**: which of the two sets the map editor currently draws and lists; a transient choice made when entering and using the editor.
- **Property Lot**: a lot inside a project area; the editor's lots and subdivisions follow whichever set is selected because they are drawn per project area.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a data set containing both archived and non-archived project areas, zero archived project areas are drawn or listed in the editor's active view, and zero non-archived project areas are drawn or listed in the editor's archived view — verified on the map canvas and in the picker.
- **SC-002**: A staff member can switch sets within the editor in a single action and sees the updated map in under 2 seconds on the firm's usual connection.
- **SC-003**: Switching sets never discards editor work: zero lost drafts or pending geometry changes across a run of at least ten switches with unsaved work present.
- **SC-004**: Outside editor mode, nothing changes: the everyday map view and the properties side panel show exactly the same project areas as before the feature.
- **SC-005**: Staff report zero incidents of plotting or readjusting geometry against a retired project area during a one-week trial after release.

## Assumptions

- The switch applies to the Project Area map page while its map editor is active; the everyday map view, the properties side panel filter, the archive/restore actions, the archive-hold deletion rule, and data storage are unchanged. The everyday map already hides archived project areas and the side-panel filter already excludes them.
- "Archived" means the project area's existing archive state; no new status values are introduced.
- The active set is the default because daily editor work (plotting new lots, readjusting active boundaries) concerns current project areas.
- Archiving or restoring a project area continues to be restricted to the roles that can do it today (system administrators); this feature only changes what the editor displays.
- Which of the two jobs this serves: **collect payments** — it prevents geometry work and lot data from being recorded against a closed subdivision, keeping the lot records that billing depends on accurate.
