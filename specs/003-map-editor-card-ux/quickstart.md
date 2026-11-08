# Quickstart & Verification Guide: Map Editor Card Layout Stability

This guide outlines runnable scenarios to validate that the map editor card remains dimensionally stable, free of layout shifts, and uniformly styled across all state transitions.

## Prerequisites

1. Dev server running on `http://localhost:3000`:
   ```bash
   npm run dev
   ```
2. User authenticated as staff or admin with access to the property map.

## Validation Scenarios

### Scenario 1: Dimensional Stability Across States (Automated via Playwright)

Run the Playwright editor tests to assert container width constancy:
```bash
npx playwright test e2e/map-editor-archive-view.spec.ts
```

**Steps tested**:
1. Enter Map Editor.
2. Verify card width is exactly `340px` in Chooser state.
3. Select an active project area.
4. Verify card width remains `340px` in Focused state.
5. Click "+ Plot Lot" to start active plotting.
6. Verify card width remains `340px` in Active Plotting state (no collapse).
7. Cancel plotting.
8. Verify card returns to Focused state without horizontal shift.

**Expected Outcome**:
- Card bounding client width remains within ±2px of `340px` across all states.
- Zero horizontal layout shift (CLS = 0).

---

### Scenario 2: Lot Detail Entry Stability

**Steps**:
1. In Focused state on an active project area, click `+ Plot Lot`.
2. Click 4 points on the map canvas to draw a polygon.
3. Verify the "Finish Shape" button is enabled without displacing "Undo" or "Cancel".
4. Click `Finish Shape`.
5. Observe the lot detail entry card.

**Expected Outcome**:
- The lot detail form renders in an anchored, proportional container (`w-[340px]`) rather than blowing up to a 576px wide dialog.
- The drawn polygon remains visible on the canvas and is not obscured.
- Block No. and Lot No. fields are focused and editable.
- Clicking `Discard` returns cleanly to Focused state.

---

### Scenario 3: Navigation Intact

**Steps**:
1. Click `Leave Project Area`. Verify return to Chooser.
2. Click `Leave Editor`. Verify return to regular Property Lots map view.
3. Confirm sidebar toggle, basemap switcher, and navigation header function identically.

**Expected Outcome**:
- Navigation flows operate with 100% backward compatibility.
