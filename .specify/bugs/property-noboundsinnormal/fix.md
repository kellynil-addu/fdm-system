# Bug Fix: Pan limit not enforced in normal (vector) basemap mode

- **Slug**: property-noboundsinnormal
- **Fixed**: 2026-11-08
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The normal-mode basemap style declares `"projection": {"type": "globe"}`; loading it switched the
map into globe projection, where MapLibre stops applying the transform's pan constraint. The
VersaTiles style is now pinned to mercator before it is applied, restoring the `maxBounds` pan
limit in normal mode.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `components/dashboard-properties/map-project-area.tsx` | modified | Added `withMercatorProjection()` and applied it to the cached normal style at load |
| `e2e/map-pan-bounds.spec.ts` | added | Behavioural Playwright regression net for the pan limit in all three load paths |
| `scripts/tests/properties/map-project-area.test.ts` | removed | Dropped the source-grep test a previous attempt had added (see Deviations) |

## Diff Highlights

```ts
// The VersaTiles colorful style requests globe projection, where MapLibre renders a 3D globe and
// stops enforcing the transform's pan constraint. This map is a bounded flat plat viewer, so every
// basemap is pinned to mercator.
function withMercatorProjection(style: StyleSpecification): StyleSpecification {
  return { ...style, projection: { type: 'mercator' } };
}

// …in the basemap style-sync effect:
cachedScaledNormalStyle = withMercatorProjection(scaleBasemapSymbolText(styleJson, 1.28));
```

## Tests Added or Updated

- `e2e/map-pan-bounds.spec.ts` › "enforces the pan limit in satellite mode" — pins the working path.
- `e2e/map-pan-bounds.spec.ts` › "enforces the pan limit in normal (vector) mode" — a fresh load
  with `fdm_map_mode=normal` cannot be panned outside `SAMAL_ISLAND_BOUNDS`.
- `e2e/map-pan-bounds.spec.ts` › "keeps the pan limit after toggling from satellite to normal" —
  the in-session `setStyle` path.

The assertions are behavioural (jump the camera outside the box, read where it landed) because
`getMaxBounds()` stayed correct throughout the bug and would have passed.

## Local Verification

- `npx playwright test e2e/map-pan-bounds.spec.ts` → 3 passed with the fix; 2 failed without it
  (normal load, and the satellite→normal toggle), confirming the net catches the regression.
- `npm run test:e2e:map` → 2 failed | 4 passed, identical before and after this change. The two
  failures are seed drift (`getAllProjectAreasWithLots` returns 12 lots where the fixture expects
  ≤5) and unrelated to this fix.
- `npx tsc --noEmit` → the same 4 errors at `map-project-area.tsx:570-571` (`p.areaSize` /
  `p.pricePerSqm` nullability) exist on a clean tree; no new errors.
- `npx eslint` on all three changed files → clean.
- Manual: in a dev-server session, `window.__fdmMap.getMaxBounds()` returned the Samal box in both
  modes even while panning escaped it — the decisive evidence that the constraint was not lost.

## Deviations from Assessment

**The assessment's root cause (Hypothesis A) is wrong.** It claimed `setStyle({ diff: false })`
drops `maxBounds` and proposed re-asserting `setMaxBounds` in the `style.load` handler. Measurement
refuted this:

- `getMaxBounds()` returned `[[125.2301694, 6.5481584], [126.2301694, 7.5481584]]` in *both*
  modes, before and after the swap. The constraint was never lost.
- In normal mode `map.getStyle().projection` was `{ type: "globe" }`, and the transform's
  `applyConstrain` returned the *unclamped* input `{lng: 128, lat: 8}`. In satellite mode the same
  call clamped to `{lng: 125.818, lat: 7.264}`.
- Calling `map.setProjection({ type: "mercator" })` at runtime immediately restored clamping.
- The cause is upstream of MapLibre: `https://tiles.versatiles.org/assets/styles/colorful/style.json`
  ships `"projection": {"type": "globe"}`. Globe projection renders a 3D globe and does not enforce
  the planar transform constraint, which is why the asymmetry followed the basemap, not the swap.

The `setMaxBounds`/`setMinZoom` re-assertion a prior attempt had added to `style.load` was
therefore a no-op and has been reverted, along with the source-grep vitest case that pinned it.

Scope expanded beyond the assessment's file list only by the added Playwright spec, which the
assessment explicitly called for (`window.__fdmMap` + mode toggle).

## Follow-ups

- The ArcGIS satellite style geos the same way going forward: `withMercatorProjection` is applied
  only to the normal style today because that is the only basemap observed shipping a globe
  projection. If ArcGIS hybrid ever does, route it through the same helper.
- `npm run test:e2e:map` has two long-standing seed-drift failures (12 vs ≤5 lots per project
  area). Worth reconciling the fixture with the current seed, separately from this bug.
