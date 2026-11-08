# Bug Verification: Active-Archive Filter Visible in Map Editor Focused State

- **Slug**: property-archivefilter
- **Tested**: 2026-11-08
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The fix successfully eliminates the redundant active-archive view switch tablist from the map editor when a project area is focused. End-to-end tests confirmed that the view switch is visible in the project area chooser, disappears upon selecting a project area, and reappears when clicking "Leave Project Area". No regressions were observed.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Automated via Playwright E2E: enter editor, select project area, check tablist hidden | pass | Tablist properly unmounted/hidden in focused state |
| New / updated tests | `npx playwright test e2e/map-editor-archive-view.spec.ts` | pass | 5/5 tests passing in 39s |
| Regression suite | `npx vitest run scripts/tests/properties/map-project-area-view.test.ts` | pass | 7/7 unit tests passing |

## Output Excerpts

### Playwright E2E Suite (`e2e/map-editor-archive-view.spec.ts`)
```text
Running 5 tests using 1 worker
  ✓  1 …editor opens on the active set and draws no archived project area (7.0s)
  ✓  2 …aws only archived project areas, and back restores the active set (7.7s)
  ✓  3 …s › the picker lists exactly the project areas the map is drawing (7.7s)
  ✓  4 …t areas › both view options show how many project areas they hold (7.4s)
  ✓  5 …blist is hidden when a project area is selected and returns when leaving (7.9s)
  5 passed (39.0s)
```

### Vitest Unit Tests (`scripts/tests/properties/map-project-area-view.test.ts`)
```text
Test Files  1 passed (1)
     Tests  7 passed (7)
```

## Residual Risks

None. The change strictly removes dead/redundant UI markup without altering any state machines, APIs, or database interactions.

## Recommendation

Close the bug — verified end-to-end.
