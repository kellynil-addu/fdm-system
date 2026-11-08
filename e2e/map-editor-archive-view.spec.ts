import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { waitForMap } from './helpers/map';

/**
 * The map editor draws one set of project areas at a time — active or archived — and the switch in
 * the editor card is the only thing that changes which. Assertions go through the map's own
 * `project-areas-data` source rather than a React prop, so a filter applied in the wrong place
 * (or not at all) fails here.
 */

const MAP_URL = '/dashboard/properties/map';

interface DrawnArea {
  name: string;
  isArchived: boolean;
}

/** Project areas actually in the map source right now. */
async function readDrawnProjectAreas(page: Page): Promise<DrawnArea[]> {
  return page.evaluate(() => {
    const map = (window as unknown as Record<string, unknown>).__fdmMap as {
      getSource: (id: string) => {
        serialize: () => {
          data: {
            features: {
              properties: { name: string; isProjectAreaArchived: boolean };
            }[];
          };
        };
      };
    };
    const source = map.getSource('project-areas-data');
    if (!source) throw new Error('project-areas-data source is missing');
    return source
      .serialize()
      .data.features.map((f) => ({
        name: f.properties.name,
        isArchived: Boolean(f.properties.isProjectAreaArchived),
      }));
  });
}

async function enterEditor(page: Page) {
  await page.goto(MAP_URL);
  await waitForMap(page);
  await page.getByRole('button', { name: 'Map Editor' }).click();
  await page.getByRole('button', { name: /Enter Editor/i }).click();
  await expect(page.getByRole('tablist', { name: 'Project area view' })).toBeVisible();
}

/** Tab labels carry the set sizes: "Active (3)", "Archived (1)". */
async function readViewCounts(page: Page): Promise<{ active: number; archived: number }> {
  const list = page.getByRole('tablist', { name: 'Project area view' });
  const activeLabel = await list.getByRole('tab', { name: /^Active/ }).innerText();
  const archivedLabel = await list.getByRole('tab', { name: /^Archived/ }).innerText();
  return {
    active: Number(activeLabel.match(/\((\d+)\)/)?.[1] ?? -1),
    archived: Number(archivedLabel.match(/\((\d+)\)/)?.[1] ?? -1),
  };
}

test.describe('Map editor: active vs archived project areas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('the editor opens on the active set and draws no archived project area', async ({ page }) => {
    await enterEditor(page);

    await expect(
      page.getByRole('tablist', { name: 'Project area view' }).getByRole('tab', { name: /^Active/ })
    ).toHaveAttribute('aria-selected', 'true');

    const drawn = await readDrawnProjectAreas(page);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.filter((a) => a.isArchived)).toEqual([]);
  });

  test('switching to archived draws only archived project areas, and back restores the active set', async ({
    page,
  }) => {
    await enterEditor(page);

    const counts = await readViewCounts(page);
    test.skip(counts.archived === 0, 'No archived project area in this database to switch to');

    const activeNames = (await readDrawnProjectAreas(page)).map((a) => a.name).sort();

    await page.getByRole('tab', { name: /^Archived/ }).click();
    await expect
      .poll(async () => (await readDrawnProjectAreas(page)).every((a) => a.isArchived))
      .toBe(true);

    const archivedDrawn = await readDrawnProjectAreas(page);
    expect(archivedDrawn).toHaveLength(counts.archived);
    expect(archivedDrawn.length).toBeGreaterThan(0);

    const archivedNames = archivedDrawn.map((a) => a.name).sort();
    expect(archivedNames.filter((n) => activeNames.includes(n))).toEqual([]);

    await page.getByRole('tab', { name: /^Active/ }).click();
    await expect
      .poll(async () => (await readDrawnProjectAreas(page)).map((a) => a.name).sort())
      .toEqual(activeNames);
  });

  test('the picker lists exactly the project areas the map is drawing', async ({ page }) => {
    await enterEditor(page);

    const drawn = (await readDrawnProjectAreas(page)).map((a) => a.name).sort();
    const picker = page.getByRole('group', { name: 'Project areas to edit' }).getByRole('button');
    await expect
      .poll(async () => (await picker.allInnerTexts()).map((t) => t.split('\n')[0].trim()).sort())
      .toEqual(drawn);

    const counts = await readViewCounts(page);
    if (counts.archived === 0) return;

    await page.getByRole('tab', { name: /^Archived/ }).click();
    await expect
      .poll(async () => (await picker.allInnerTexts()).map((t) => t.split('\n')[0].trim()).sort())
      .toEqual((await readDrawnProjectAreas(page)).map((a) => a.name).sort());
  });

  test('both view options show how many project areas they hold', async ({ page }) => {
    await enterEditor(page);

    const counts = await readViewCounts(page);
    expect(counts.active).toBeGreaterThanOrEqual(0);
    expect(counts.archived).toBeGreaterThanOrEqual(0);

    const drawn = await readDrawnProjectAreas(page);
    expect(drawn).toHaveLength(counts.active);

    await page.getByRole('tab', { name: /^Archived/ }).click();
    await expect(page.getByRole('tab', { name: /^Archived/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
