# Bug Assessment: Active-Archive Filter Visible in Map Editor Focused State

- **Slug**: property-archivefilter
- **Created**: 2026-11-08
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

"Bug on spec 001 where active-archive filter buttons are still shown even after a project area is selected in map editor"

## Symptom

When a user selects a project area in the map editor, the active/archived toggle switch (`ProjectAreaViewSwitch`) remains rendered in the editor panel directly below the project area header and above the lot plotting action buttons. Expected behavior: the active/archived view switch should only appear at the project area chooser level (when no project area is selected) to determine which set is shown for selection; once a project area is selected/focused, editing is scoped to that single project area and the filter buttons must be hidden.

## Reproduction

1. Navigate to `/dashboard/properties/map`.
2. Click "Map Editor" and confirm entry into the interactive editor mode.
3. Observe the "Active" and "Archived" toggle buttons rendered above the list of project areas.
4. Click on any project area from the list to enter focused editing mode for that project area.
5. Observe that the "Active" and "Archived" toggle buttons are still displayed beneath the header card and above "+ Plot Lot".

## Suspected Code Paths

- `components/dashboard-properties/map-project-area-editor.tsx:524-529` — In the `activeProjectArea` branch (Project Area Focused state), `<ProjectAreaViewSwitch>` is rendered redundantly.

## Root Cause Hypothesis

During the implementation of Spec 001 (Archived Project Area View Switch), `<ProjectAreaViewSwitch>` was placed both in the Project Area Chooser block (line 374, where `!activeProjectArea` holds) and duplicated into the Project Area Focused block (lines 524-529). The focused view is strictly scoped to operations within that specific project area; retaining the filter buttons there violates the hierarchical decision tree and can cause unintended deselections or state resets. Confidence: high.

## Proposed Remediation

**Preferred**: Remove the redundant `<ProjectAreaViewSwitch>` component invocation (lines 524-529) from the `activeProjectArea` focused state in `components/dashboard-properties/map-project-area-editor.tsx`. The switch should only render in the project area chooser state (line 374).

**Files likely to change**:
- `components/dashboard-properties/map-project-area-editor.tsx`
- `e2e/map-editor-archive-view.spec.ts`

**Tests to add or update**:
- Add an E2E test case in `e2e/map-editor-archive-view.spec.ts` asserting that selecting a project area causes `tablist[aria-label="Project area view"]` to become hidden/unmounted, and clicking "Leave Project Area" restores its visibility.

## Risks & Considerations

- Low risk. The change is purely presentational within the editor card and aligns with Spec 001 requirements.
- No database migrations, server action updates, or permission changes required.

## Open Questions

- None.
