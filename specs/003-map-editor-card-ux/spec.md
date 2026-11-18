# Feature Specification: Map Editor Card Layout Stability and UX Refinement

**Feature Branch**: `003-map-editor-card-ux`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Improve map editor card to resolve issues regarding element shifts, sizing inconsistencies, and user experience. Navigation is untouched"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stable, predictable card dimensions across editor states (Priority: P1)

A staff member operates the map editor to manage subdivision boundaries and plot property lots. As they transition between choosing a project area, focusing on a selected project area, activating lot plotting, placing points, undoing points, and completing shapes, the floating editor card maintains a stable, bounded width and anchored positioning without sudden expansion, shrinkage, or visual jitter.

**Why this priority**: Eliminating cumulative layout shifts and sudden width jumps is the primary operational need. Unpredictable resizing causes misclicks, visual disorientation, and accidental cancellations while staff are placing precise geospatial points on the map canvas.

**Independent Test**: Enter the map editor, select a project area, initiate plotting, add vertices, undo, cancel plotting, and return to chooser. Confirm the card container remains stable and anchored without jumpy width fluctuations.

**Acceptance Scenarios**:

1. **Given** the staff member enters the map editor, **When** the project area chooser renders, **Then** the card presents a stable, fixed width that comfortably accommodates subdivision names, view switch tabs, and action buttons.
2. **Given** the staff member selects a project area from the chooser, **When** the card transitions to the focused project area state, **Then** the card retains the exact same container width, outer padding, and corner radius.
3. **Given** the editor is focused on a project area, **When** the staff member clicks "+ Plot Lot", **Then** the card transitions into the active plotting state within the same stable container footprint rather than collapsing into a narrow toolbar.
4. **Given** active plotting is underway, **When** points are added, undone, or when the "Outside Boundary" alert triggers, **Then** the counter badge and warning render in pre-allocated or inline space without pushing action buttons into new rows or shifting their click targets.

---

### User Story 2 - Consistent sizing and visual hierarchy across controls (Priority: P1)

A staff member interacts with buttons, badges, typography, and lists across the different states of the editor card. All elements follow a consistent sizing scale and token hierarchy so controls feel cohesive, readable, and easy to target.

**Why this priority**: Inconsistent button heights, icon sizes, and mismatched text treatments make the editor feel unpolished and physically awkward to click. Harmonizing heights, typography, and spacing delivers immediate ergonomic value.

**Independent Test**: Measure interactive controls across chooser, focused, and plotting states to verify matching control heights, touch targets, and typography tokens.

**Acceptance Scenarios**:

1. **Given** any state of the editor card, **When** action buttons render (e.g. Leave Editor, + New Project Area, + Plot Lot, Readjust Boundary, Undo, Cancel, Finish Shape), **Then** interactive heights, font sizes, and paddings conform to standard component height tokens.
2. **Given** the project area chooser list with varying name lengths and status badges, **When** project area items render, **Then** item heights, typography, archive badges, and trailing chevrons align symmetrically.
3. **Given** a scrollable project area list, **When** items exceed the viewport height, **Then** scrolling does not cause horizontal reflow, content truncation, or container width change.

---

### User Story 3 - Ergonomic lot details entry and boundary adjustment transitions (Priority: P2)

When completing a lot outline or adjusting an existing boundary, the detail entry form opens in an anchored, appropriately proportioned view that does not abruptly expand into an oversized modal dialog across the map canvas.

**Why this priority**: Abrupt transitions to oversized dialogs obscure the drawn lot geometry that staff just finished placing. Keeping the panel proportioned and anchored preserves map context while recording block and lot numbers.

**Independent Test**: Complete plotting a lot polygon with "Finish Shape"; confirm the lot details panel displays smoothly, cleanly fits the viewport, and keeps the drawn shape visible.

**Acceptance Scenarios**:

1. **Given** a lot polygon has been closed with "Finish Shape", **When** the lot detail form renders, **Then** it maintains an anchored width proportional to the editor workspace rather than abruptly expanding into an oversized container.
2. **Given** the readjust boundary mode is active, **When** vertex adjustment instructions and counters render, **Then** the card provides clear, concise metrics (sqm, corners) with aligned action buttons (Reset, Discard, Queue Update).
3. **Given** the presence of pending drafts or local storage recovery prompts, **When** secondary banners render, **Then** they stack neatly with matching width constraints and aligned edges.

---

### Edge Cases

- **Long project area names (> 40 characters)**: Names truncate cleanly with an ellipsis without pushing header action buttons, badges, or controls off-screen.
- **Constrained viewports (compact laptops or narrow windows)**: The card max-width adjusts gracefully to avoid overflowing the map viewport while maintaining internal spacing.
- **Empty project area sets**: When either active or archived sets contain zero project areas, the empty-state message maintains the exact same card width and padding as a populated list.
- **Rapid toggle between plotting and viewing**: Repeatedly starting and cancelling plotting does not cause visual flickering or stuck transition classes.
- **Unsaved draft badges and save bar**: Bottom-anchored draft badges remain neatly positioned and do not overlap basemap controls, map attribution, or scale bars.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The floating map editor card MUST maintain a consistent, stable width across chooser, focused, and plotting states.
- **FR-002**: Transitions between editor states (Chooser → Focused → Active Plotting → Detail Entry) MUST NOT produce horizontal layout shifts or jarring jumps in card container dimensions.
- **FR-003**: All primary and secondary interactive buttons within the editor card MUST utilize standardized component height tokens and consistent typography.
- **FR-004**: Plotting feedback elements (point counters, "Outside Boundary" alert pills) MUST render within allocated header space so that the Undo, Cancel, and Finish Shape buttons remain in stable, predictable positions.
- **FR-005**: Project area list items in the chooser MUST exhibit uniform vertical rhythm, consistent padding, and aligned trailing metadata regardless of whether an "Archived" badge is present.
- **FR-006**: The lot detail entry form presented upon finishing a shape MUST be proportioned to fit the card workspace comfortably without obscuring the drawn lot geometry on the map canvas.
- **FR-007**: Session recovery banners and pending draft status bars MUST align with the width and margin boundaries of the main editor card.
- **FR-008**: All existing navigation flows, including entering the editor, leaving the editor, returning to property views, and map basemap pan/zoom interactions, MUST remain untouched and functional.

### Key Entities *(include if feature involves data)*

- **Map Editor Card**: The floating, anchored UI panel rendered above the map canvas that houses the step-by-step tools for subdivision boundary adjustments and property lot plotting.
- **Editor State**: The operational mode of the editor card, progressing from Project Area Chooser to Project Area Focused, Active Plotting, Lot Detail Entry, and Boundary Readjustment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero horizontal width jumps or cumulative layout shifts observed during transitions between Chooser, Focused, and Active Plotting states.
- **SC-002**: 100% of interactive buttons in the editor card share standardized height tokens (`h-8` for primary actions, `h-7` for compact secondary controls) with matching typography.
- **SC-003**: Staff can plot lot polygons and complete Block/Lot number submission without the card obscuring more than 380px of horizontal canvas space on standard 1080p desktop displays.
- **SC-004**: Zero regressions or changes to navigation: 100% backward compatibility for entering/leaving the editor, switching map layers, and navigating to lot records.

## Assumptions

- Map editor users are internal staff members accessing the tool on desktop or laptop viewports (minimum width 1024px).
- Navigation controls (the top bar, property sidebar toggle, basemap selector, and route links) remain untouched per user request.
- The feature serves the core job of **collecting payments** by ensuring property lot records and boundaries are accurate, clean, and error-free.
- No database migrations, API changes, or new backend permissions are required; this feature focuses exclusively on client-side layout stability, sizing consistency, and UX ergonomics.
