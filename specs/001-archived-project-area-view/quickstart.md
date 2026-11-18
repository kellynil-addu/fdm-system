# Quickstart: Archived Project Area View Switch

Validation guide. Contracts live in [contracts/view-switch.md](./contracts/view-switch.md); entity
and state rules in [data-model.md](./data-model.md).

## Prerequisites

- `.env.local` configured (see `.env.example`)
- At least one archived and one non-archived project area in the database
  (`npm run seed:sample-project-area` seeds four active ones; archive one from the editor to get the
  other side)

## Unit: pure view filter

```bash
npx vitest run scripts/tests/properties/map-project-area-view.test.ts
```

Expected: the active and archived results are disjoint, together cover the input, preserve order,
treat a missing `is_archived` as active, and do not mutate the input.

## End-to-end: the editor switch

```bash
npm run test:playwright -- e2e/map-editor-archive-view.spec.ts
```

Expected, in order:

1. With the editor entered, the map's `project-areas-data` features contain no feature whose
   `properties.isProjectAreaArchived` is `true`, and the picker lists the same names.
2. After switching to Archived, every drawn feature has `isProjectAreaArchived === true`, and no
   active one is drawn.
3. The two feature sets are disjoint across a switch in either direction.
4. Switching back to Active restores the original set exactly.

## Manual check (the parts Playwright cannot see)

Requires a logged-in browser session.

1. `/dashboard/properties/map` → click **Map Editor** → confirm the switch shows `Active (n)`.
2. Select an active project area, plot two lot corners but do not finish, then switch to Archived.
   The map redraws and the half-plotted draft is still there when you switch back and reselect the
   project area.
3. Archive the selected project area from its options menu; after the refresh it is no longer in the
   Active set, and the switch count moved by one.
4. Leave the editor: the everyday view still hides archived project areas and the property-lots
   side panel's project area filter still offers only active ones.
5. Narrow the window to ~1024 px wide and confirm the switch labels do not wrap out of the card
   (measure with `getBoundingClientRect`, per `.agents/skills/layout-verification/SKILL.md`; if they
   do, fall back to `Active` / `Archived` labels with counts as badges).

## Lint and type check

```bash
npm run lint
npx tsc --noEmit
```
