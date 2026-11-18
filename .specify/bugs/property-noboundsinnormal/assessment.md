# Bug Assessment: View bounds not applied in normal (vector) map mode

- **Slug**: property-noboundsinnormal
- **Created**: 2026-11-08T11:09:23Z
- **Source**: pasted text
- **Verdict**: valid (confirmed by reporter: pan limit is lost in normal vector mode)
- **Severity**: low

## Report (verbatim or summarized)

> "In the map viewer (/dashboard/properties/map), view bounds are correctly applied in satellite mode. In normal vector mode, the view bound is not applied"

## Symptom

On `/dashboard/properties/map`, the map's view constraint ("view bounds") is honored when the basemap is in satellite mode, but appears not to be applied in normal (OSM vector) mode. Expected: the same bounds constraint in both basemap modes.

Ambiguity to resolve first: "view bounds" could mean either

1. the **pan limit** (`maxBounds` = `SAMAL_ISLAND_BOUNDS`, the user cannot drag the map beyond Samal Island), or
2. the **initial/focused view fit** (`fitBounds` to a project area boundary, or the regional overview view).

The code paths differ, so reproduction must disambiguate (see Reproduction).

## Reproduction

1. Open `/dashboard/properties/map`.
2. Note the view behavior in the default satellite mode (pan limit and/or view fitting).
3. Toggle to Normal (vector) view via the basemap switch button (top-right `Layers` icon).
4. Observe that the pan limit is gone: the map can be dragged past the Samal Island bounds.

Decisive disambiguation (dev build): the live map instance is exposed at `window.__fdmMap`. In the browser console, in each mode run:

```js
window.__fdmMap.getMaxBounds()      // is the pan constraint still set?
window.__fdmMap.getCenter(); window.__fdmMap.getZoom()
```

If `getMaxBounds()` returns `null` (or a different box) in normal mode but the Samal box in satellite mode, hypothesis A is confirmed. If maxBounds is intact but center/zoom diverge after a selection, hypothesis B is confirmed.

## Suspected Code Paths

- `components/dashboard-properties/map-project-area.tsx:90-94` — `SAMAL_ISLAND_BOUNDS` constant (the only "bounds" definition in the codebase).
- `components/dashboard-properties/map-project-area.tsx:399-406` — `useMapLibreMap(containerRef, { maxBounds: SAMAL_ISLAND_BOUNDS, ... })`; `maxBounds` is passed **only at map creation** and never re-applied afterwards.
- `lib/hooks/use-maplibre-map.ts:69-89` — `new Map({ maxBounds, ... })`; the options object is captured once via `optionsRef.current` at init.
- `components/dashboard-properties/map-project-area.tsx:1434-1513` — the basemap style-sync effect; the only code that differs between satellite and normal mode (`map.setStyle(..., { diff: false })` for the VersaTiles colorful style vs. the ArcGIS hybrid style).
- `components/dashboard-properties/map-project-area.tsx:594-613` — `focusProjectArea()` → `map.fitBounds(...)`; and `:620-639` — regional `flyTo`. Both are the "view fitting" paths if interpretation 2 is correct.

## Root Cause Hypothesis

Confidence: **high** (reporter confirmed the observable is the pan limit: panning past `SAMAL_ISLAND_BOUNDS` is possible in normal vector mode).

**Hypothesis A — `maxBounds` lost across a style swap (confirmed).** The pan limit comes from `maxBounds: SAMAL_ISLAND_BOUNDS` passed to the `Map` constructor once at creation (`lib/hooks/use-maplibre-map.ts:84`). The basemap style-sync effect (`components/dashboard-properties/map-project-area.tsx:1434-1513`) performs a full `map.setStyle(style, { diff: false })` reload, and nothing ever re-applies `setMaxBounds` afterwards. MapLibre 6.10 drops the transform constraint on a non-diff style replacement, so after any post-load style swap the pan limit is gone. The reported asymmetry matches the load path: when the session starts in satellite mode, the satellite ArcGIS style is already the applied key (or the initial minimal style is replaced once) and the reporter perceives the constraint as intact, while switching to normal mode performs the post-load swap that drops it.

## Confirmation Notes

- Reporter confirmed on 2026-11-08: "I meant the pan limit. I can pan past the bounds in normal vector mode."
- The developer-build console check (`window.__fdmMap.getMaxBounds()` per mode) can still be used during the fix to verify the constraint is restored after the style swap.

## Proposed Remediation

**Preferred** (after reproduction confirms Hypothesis A): re-assert the constraint whenever the basemap style changes — either add `map.setMaxBounds(SAMAL_ISLAND_BOUNDS)` (and `minZoom`) to the `style.load` handler in `map-project-area.tsx:409-419`, or pass a `transformStyle`-preserving options object to `setStyle`. This is a one-line defensive re-application at the single choke point every mode switch passes through, and it is correct even if the root cause is a MapLibre internal, since the constraint is a component-level invariant, not style data.

If Hypothesis B is confirmed instead: re-trigger or defer the pending camera action until after `style.load` (e.g. store the intended fit/fly target and replay it in the `styleRevision` effect), rather than letting `setStyle` cancel it.

**Alternatives**:
- Upgrade/investigate MapLibre 6.10 behavior first with a minimal repro against `setStyle({diff:false})` + `setMaxBounds` to confirm whether it is an upstream regression before patching application code.

**Files likely to change**:
- `components/dashboard-properties/map-project-area.tsx` (style.load handler and/or style-sync effect)
- `lib/hooks/use-maplibre-map.ts` (only if the fix belongs at hook level, e.g. re-applying options after style swaps)

**Tests to add or update**:
- An E2E test using `window.__fdmMap` that toggles basemap mode and asserts `getMaxBounds()` still equals `SAMAL_ISLAND_BOUNDS` (and, if Hypothesis B, that center/zoom after a project-area selection match the fit target in both modes). Extend `scripts/tests/properties/map-project-area.test.ts` or the basemap suite.

## Risks & Considerations

- Re-applying `setMaxBounds` on every `style.load` is idempotent and cheap, but must also cover the fallback satellite style path so all three style keys behave identically.
- If the real cause is an in-flight-animation cancellation (Hypothesis B), the fix touches the focus effect's interaction with `styleRevision`; a naive "replay last camera action" could fight the user's own panning if keyed incorrectly.

## Open Questions

- [NEEDS CLARIFICATION: does the bug occur on first load with saved 'normal' mode (localStorage `fdm_map_mode`), or only after toggling from satellite? The fix re-applies the constraint on every `style.load`, so it should cover both either way.]
