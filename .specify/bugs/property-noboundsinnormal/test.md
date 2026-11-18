# Bug Verification: Pan limit not enforced in normal (vector) basemap mode

- **Slug**: property-noboundsinnormal
- **Tested**: 2026-11-08
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The assessment's reproduction steps were exercised in a live dev-server browser session and the
symptom no longer occurs: with normal mode active, real mouse drags and a programmatic jump far
outside Samal Island both leave the camera clamped inside `SAMAL_ISLAND_BOUNDS`. The fix's
Playwright spec passes, and no regression was introduced — the only failing suites fail identically
on a clean tree.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Browser session: load `/dashboard/properties/map` in satellite, click "Switch to Normal view", drag 6× west/north, then `jumpTo([128.6, 8.47])` | pass | Camera stayed at `[125.8715, 7.3007]` — inside both bounds; `getStyle().projection` reported `mercator` |
| Reproduction, reload path | Reload the page with `fdm_map_mode=normal` in localStorage, then `jumpTo([128.6, 8.47])` | pass | Same clamp; projection `mercator` |
| New tests | `npx playwright test e2e/map-pan-bounds.spec.ts` | pass | 3 passed |
| Regression suite (map) | `npm run test:e2e:map` | fail (pre-existing) | 2 failed \| 4 passed, identical on a clean tree — seed drift in fixture counts, not caused by this fix |
| Regression suite (arcgis) | `npm run test:e2e:arcgis` | pass | 9 passed |
| Lint | `npx eslint e2e/map-pan-bounds.spec.ts components/dashboard-properties/map-project-area.tsx` | pass | exit 0 |
| Type-check | `npx tsc --noEmit` | pass (no new errors) | 4 errors at `map-project-area.tsx:577-578` (`p.areaSize`/`p.pricePerSqm` nullability), present on a clean tree |

## Output Excerpts

Post-fix manual reproduction:

```
"projectionAfterToggle": "mercator",
"afterDrag":  { "c": [125.87151361983342, 7.300686258648611], "z": 10.2 },
"afterJump":  [125.87151361983342, 7.300686258648611],
"reloadNormal": { "proj": "mercator", "c": [125.87151361983342, 7.300686258648611] }
```

Pre-fix, the same drag sequence reached `[128.60023003974356, 8.472203558719759]` in normal mode
(recorded during the fix) — outside the bounds and past the edge of the style's valid area.

Playwright:

```
3 passed (28.2s)
```

Map vitest suite — identical on clean tree:

```
FAIL  ... > verifies 48 subdivisions are seeded with partial registration (3-5 property lots per projectArea)
      AssertionError: expected 24 to be 16
FAIL  ... > verifies getAllProjectAreasWithLots returns all projectAreas with populated subdivisions and lots
      AssertionError: expected 12 to be less than or equal to 5
      Tests  2 failed | 4 passed (6)
```

## Residual Risks

- Verification ran against the remote dev environment (`localhost:3000`) with the ArcGIS token live,
  so the satellite path exercised the real ArcGIS hybrid style. A token failure would route to the
  fallback style, which was observed to behave correctly during the fix but was not re-tested here.
- The globe-projection behaviour is a MapLibre/upstream style property. If the VersaTiles style is
  later served without a `projection` key the fix becomes a no-op (harmless), and if ArcGIS hybrid
  starts declaring a globe projection the same bug would reappear on that path only. The Playwright
  spec covers both load paths and would catch it.
- The two pre-existing `test:e2e:map` failures flap between "24 to be 16" and "12 to be ≤5" because
  the suite reseeds on demand and the fixture counts no longer match `seed-sample-project-area`.
  Worth fixing separately; it does not mask this bug, whose checks are behavioural.

## Recommendation

Close the bug — the fix is verified end-to-end against the assessment's own reproduction steps in
both load paths (fresh normal load and satellite→normal toggle), with a behavioural regression test
that fails without the fix. File the `test:e2e:map` seed-drift failures as a separate item.
