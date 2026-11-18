# Bug Fix: Active-Archive Filter Visible in Map Editor Focused State

- **Slug**: property-archivefilter
- **Fixed**: 2026-11-08
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Removed the redundant `ProjectAreaViewSwitch` component from the `activeProjectArea` focused state in the map editor sidebar. The active-archive filter switch now only renders at the top-level project area chooser state where it belongs.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `components/dashboard-properties/map-project-area-editor.tsx` | modified | Removed duplicate `<ProjectAreaViewSwitch>` from focused project area state |
| `e2e/map-editor-archive-view.spec.ts` | modified | Added test asserting view switch tablist hides when a project area is focused and returns upon leaving |

## Diff Highlights (optional)

```diff
--- a/components/dashboard-properties/map-project-area-editor.tsx
+++ b/components/dashboard-properties/map-project-area-editor.tsx
@@ -521,13 +521,6 @@ export function MapProjectAreaEditor({
                 </div>
               </div>
 
-              <ProjectAreaViewSwitch
-                counts={viewCounts}
-                view={view}
-                onViewChange={onViewChange}
-                className="pt-0.5"
-              />
-
               <div className="space-y-1.5 pt-0.5">
                 <Button
                   size="sm"
```

## Tests Added or Updated

- `e2e/map-editor-archive-view.spec.ts::the view switch tablist is hidden when a project area is selected and returns when leaving` — Confirms that clicking a project area in the editor picker hides the `Project area view` tablist, and clicking "Leave Project Area" unhides it.

## Local Verification

- Commands run:
  - `npx vitest run scripts/tests/properties/map-project-area-view.test.ts` → Passed (7/7 tests passing).
  - Git diff verification → Verified exact removal of 7 lines in `map-project-area-editor.tsx` and addition of the regression test in `e2e/map-editor-archive-view.spec.ts`.

## Deviations from Assessment

None.

## Follow-ups

- Run `/speckit-bug-test slug=property-archivefilter` to validate the fix report against test assertions.
