import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * The map's pan limit must hold in every basemap mode.
 *
 * Regression net for a bug where toggling to Normal (vector) view let the user drag past
 * Samal Island. The cause was not a lost constraint — `getMaxBounds()` stayed correct — but the
 * VersaTiles colorful style declaring `"projection": {"type": "globe"}`, which puts the map in
 * globe projection where MapLibre stops applying the transform's pan constraint.
 *
 * So the assertion is deliberately behavioural: ask the map to go somewhere outside the bounds
 * and check where it actually ended up. Asserting `getMaxBounds()` would have passed throughout
 * the bug.
 */

const OUTSIDE_SAMAL: [number, number] = [128.6, 8.47];

/** Pan limit as used by `map-project-area.tsx`; the map must clamp to somewhere inside it. */
const SAMAL_ISLAND_BOUNDS = {
  west: 125.2301694,
  south: 6.5481584,
  east: 126.2301694,
  north: 7.5481584,
};

const MAP_URL = '/dashboard/properties/map';

async function openMapInMode(page: Page, mode: 'satellite' | 'normal') {
  await page.addInitScript((m) => localStorage.setItem('fdm_map_mode', m), mode);
  await page.goto(MAP_URL);
  await page.waitForFunction(
    () => {
      const map = (window as unknown as Record<string, unknown>).__fdmMap as
        | { loaded: () => boolean }
        | undefined;
      return Boolean(map?.loaded());
    },
    undefined,
    { timeout: 60000 }
  );
  // Let the basemap style swap settle; the style effect runs after the map's first load.
  await page.waitForTimeout(4000);
}

/** Try to leave the bounds and report where the camera actually landed. */
async function jumpOutsideAndRead(page: Page) {
  return page.evaluate((target) => {
    const map = (window as unknown as Record<string, unknown>).__fdmMap as {
      jumpTo: (o: { center: [number, number] }) => void;
      getCenter: () => { lng: number; lat: number };
      getStyle: () => { projection?: { type?: unknown } } | undefined;
    };
    map.jumpTo({ center: target });
    const center = map.getCenter();
    return {
      lng: center.lng,
      lat: center.lat,
      projection: map.getStyle()?.projection?.type ?? 'mercator',
    };
  }, OUTSIDE_SAMAL);
}

function expectInsideBounds(camera: { lng: number; lat: number }) {
  expect(camera.lng).toBeGreaterThanOrEqual(SAMAL_ISLAND_BOUNDS.west);
  expect(camera.lng).toBeLessThanOrEqual(SAMAL_ISLAND_BOUNDS.east);
  expect(camera.lat).toBeGreaterThanOrEqual(SAMAL_ISLAND_BOUNDS.south);
  expect(camera.lat).toBeLessThanOrEqual(SAMAL_ISLAND_BOUNDS.north);
}

test.describe('Map pan bounds across basemap modes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('enforces the pan limit in satellite mode', async ({ page }) => {
    await openMapInMode(page, 'satellite');
    expectInsideBounds(await jumpOutsideAndRead(page));
  });

  test('enforces the pan limit in normal (vector) mode', async ({ page }) => {
    await openMapInMode(page, 'normal');
    expectInsideBounds(await jumpOutsideAndRead(page));
  });

  test('keeps the pan limit after toggling from satellite to normal', async ({ page }) => {
    await openMapInMode(page, 'satellite');

    await page.getByRole('button', { name: 'Switch to Normal view' }).click();
    await page.waitForFunction(
      () => {
        const map = (window as unknown as Record<string, unknown>).__fdmMap as
          | { getStyle: () => { name?: unknown } | undefined }
          | undefined;
        return map?.getStyle()?.name === 'versatiles-colorful';
      },
      undefined,
      { timeout: 30000 }
    );
    await page.waitForTimeout(1000);

    expectInsideBounds(await jumpOutsideAndRead(page));
  });
});
