# Research: Map Editor Card Layout Stability and UX Refinement

## Decision 1: Fixed-Width Anchored Container for Floating Editor Card

### Decision
Establish a stable, explicit width (`w-[340px]` / `w-84` or `w-80`) with `max-w-[calc(100vw-2rem)]` across all top-left editor states: Project Area Chooser, Project Area Focused, Active Plotting, and Lot Detail Entry (`activeDraft`).

### Rationale
- Today, the floating card lacks a defined width class on its inner container (`<div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-xl transition-all">`).
- Consequently, each state transition causes dramatic width fluctuations:
  - Chooser state expands to fit the widest project area name (~300–350px).
  - Active Plotting collapses to the width of the button row (~220px).
  - Lot Detail Entry explodes to `max-w-xl` (576px).
- A unified width of 340px (`w-[340px]`) comfortably fits:
  - The tab triggers (`Active (XX)` and `Archived (XX)`) with generous padding.
  - Project area list items with lot count and "Archived" badge without truncating short/medium names.
  - Plotting action buttons (Undo, Cancel, Finish Shape) without wrapping.
  - Lot Detail input form (Block No. and Lot No.) side-by-side.
- Retains `max-w-[calc(100vw-2rem)]` so compact screens or split windows do not overflow horizontally.

### Alternatives Considered
- *Dynamic width with CSS transitions (`transition-all duration-300`)*: Animating width causes text reflow, jumpy map re-centering, and button movement during click actions. Rejected.
- *Full-height floating sidebar panel (`w-80 h-full`)*: Completely changes the spatial model of the map editor and conflicts with the user constraint that navigation must remain untouched. Rejected.

---

## Decision 2: Stable Plotting Action Bar Layout

### Decision
In the Active Plotting state:
1. Retain the stable 340px card container.
2. Structure the header as a dedicated status line with vertex count badge and an anchored space for the "Outside Boundary" warning.
3. Keep the action button row (Undo, Cancel, Finish Shape) aligned at the bottom with explicit widths/flex-grow so button hit targets do not jump when vertices or warnings toggle.

### Rationale
- Previously, the "Outside Boundary" alert pill appeared conditionally in the same flex header row as the title, pushing elements or wrapping into a second row.
- Reserving a clean two-row structure (status/feedback header row + action button row) ensures the "Finish Shape", "Undo", and "Cancel" buttons stay in fixed, muscle-memory positions.

### Alternatives Considered
- *Floating toolbar over the map center*: Disorients users who expect editor controls in the top-left card. Rejected.
- *Status overlay in map center*: Clutters geospatial drafting area. Rejected.

---

## Decision 3: Proportionate Lot Detail and Readjustment Panels

### Decision
1. **Lot Details (`activeDraft`)**: Transition the active draft form within the same anchored 340px container footprint (or compact `w-[360px]`) rather than expanding to 576px (`max-w-xl`).
2. **Readjust Boundary (`readjustProjectArea`)**: Keep the readjustment control panel capped at a compact, readable width (`w-[360px]` to `w-[380px]`) with vertical stacking of metrics, preserving maximum visibility of the perimeter polygon on the canvas.

### Rationale
- When staff finish plotting a polygon, they want to immediately confirm block/lot numbers while visually inspecting the shape they just drew.
- A 576px dialog covers almost half the screen on 1366x768 and 1440x900 laptop displays, frequently obscuring the very polygon being labelled.
- The form only contains two number inputs (Block and Lot) and an Area display; 340px is plenty of room for an elegant, readable layout.

### Alternatives Considered
- *Full modal dialog with backdrop (`<Dialog>`)*: Covers the map entirely, destroying visual continuity. Rejected.
- *Inline map popup*: Small polygon lots cannot accommodate form inputs. Rejected.

---

## Decision 4: Sizing & Design Token Standardization

### Decision
Align all controls in `MapProjectAreaEditor` to standard shadcn/ui and project Tailwind design tokens:
- **Button Heights**: `h-8` for primary actions (`+ Plot Lot`, `Finish Shape`, `Save New Project Area`, `Add to Drafts`); `h-7` for secondary/compact actions (`Leave Editor`, `Undo`, `Cancel`, `Redraw`, `Discard`).
- **Typography Tokens**:
  - Card titles: `text-xs font-semibold text-foreground`
  - Subheadings/instructions: `text-[11px] leading-relaxed text-muted-foreground`
  - Badges/pills: `text-[10px] font-semibold` or `text-[11px] font-mono`
  - Button text: `text-xs font-medium` (primary) / `text-xs` (secondary)
- **Icon Sizing**: `h-3.5 w-3.5` standardized across all button icons and leading symbols.
- **Card Padding & Corner Radii**: `rounded-2xl border border-border bg-card p-3 shadow-xl` standardized on all card variants.

### Rationale
- Eliminates visual friction caused by mismatched `h-7`, `h-8`, `text-[10px]`, `text-[11px]`, and `text-xs` combinations.
- Strictly adheres to the project rules in `AGENTS.md` and `.agents/skills/ui-components/SKILL.md`.

---

## Decision 5: Preserving Navigation Invariants

### Decision
Zero modifications to:
- Map view entry/exit button (`Map Editor` in `map-project-area-unified-view.tsx`).
- Project area selection and deselect handlers (`onSelectProjectArea`, `onLeaveProjectArea`).
- Router paths and URL query parameters.
- Basemap layer switcher, MapLibre navigation controls, and zoom levels.

### Rationale
- The prompt explicitly specified: *"Navigation is untouched"*.
- All improvements are strictly scoped to the internal geometry, layout stability, and control sizing of `MapProjectAreaEditor`.
