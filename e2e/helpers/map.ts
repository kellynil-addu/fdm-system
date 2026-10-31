import { Page, expect } from '@playwright/test';

/**
 * Helpers for driving the MapLibre canvas in end-to-end tests.
 *
 * Lots are WebGL polygons, so they have no DOM nodes and Playwright selectors cannot reach them.
 * These helpers go through the map instance published at `window.__fdmMap` by
 * `useMapLibreMap` (see `E2E_MAP_HANDLE`), which makes lots addressable by block/lot and
 * clickable at a computed pixel position.
 */

/** Minimal surface of the MapLibre instance these helpers rely on. */
interface MapHandle {
  jumpTo: (options: Record<string, unknown>) => void;
  project: (lngLat: [number, number]) => { x: number; y: number };
  getCanvas: () => HTMLCanvasElement;
  getZoom: () => number;
  querySourceFeatures: (sourceId: string) => RawFeature[];
  getSource: (id: string) => {
    serialize: () => { data: { features: RawFeature[] } };
  };
}

interface RawFeature {
  properties: Record<string, unknown>;
  geometry: { coordinates: number[][][] };
}

export interface LotHandle {
  block: number;
  lot: number;
  siteName: string;
  status: string;
  isRegistered: boolean;
  /** Screen position of the lot's centre, in page coordinates. */
  x: number;
  y: number;
  centerLng: number;
  centerLat: number;
}

/** Wait until the map instance is published and its sources have data. */
export async function waitForMap(page: Page): Promise<void> {
  await page.locator('.maplibregl-canvas').waitFor({ state: 'visible' });
  await page.waitForFunction(
    () => {
      const map = (window as unknown as Record<string, unknown>).__fdmMap as
        | { isSourceLoaded?: (id: string) => boolean }
        | undefined;
      return Boolean(map) && map?.isSourceLoaded?.('lots-data') !== false;
    },
    undefined,
    { timeout: 30000 }
  );
}

/** Read every lot currently in the map source, with its screen position. */
export async function readLots(page: Page): Promise<LotHandle[]> {
  return page.evaluate(() => {
    const map = (window as unknown as Record<string, unknown>).__fdmMap as unknown as MapHandle;
    if (!map) throw new Error('window.__fdmMap is not published — is the dev server running?');

    const rect = map.getCanvas().getBoundingClientRect();
    const features = map.getSource('lots-data').serialize().data.features;

    return features.map((f) => {
      const ring = f.geometry.coordinates[0];
      const lngs = ring.map((c) => c[0]);
      const lats = ring.map((c) => c[1]);
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const pt = map.project([centerLng, centerLat]);

      return {
        block: f.properties.block as number,
        lot: f.properties.lot as number,
        siteName: f.properties.siteName as string,
        status: f.properties.status as string,
        isRegistered: Boolean(f.properties.isRegistered),
        x: rect.x + pt.x,
        y: rect.y + pt.y,
        centerLng,
        centerLat,
      };
    });
  });
}

/**
 * Pan and zoom so `lot` sits in the middle of the visible canvas, clear of the floating
 * sidebar, then return its refreshed screen position.
 */
export async function focusLot(page: Page, lot: LotHandle): Promise<LotHandle> {
  await page.evaluate(
    ({ centerLng, centerLat }) => {
      const map = (window as unknown as Record<string, unknown>).__fdmMap as unknown as MapHandle;
      // Left padding keeps the lot clear of the property-lots sidebar overlay.
      map.jumpTo({ center: [centerLng, centerLat], zoom: 19, padding: { left: 260 } });
    },
    lot
  );

  await page.waitForTimeout(600);
  const refreshed = (await readLots(page)).find(
    (l) => l.block === lot.block && l.lot === lot.lot && l.siteName === lot.siteName
  );
  if (!refreshed) throw new Error(`Lot ${lot.block}-${lot.lot} vanished after focus`);
  return refreshed;
}

/**
 * Click a lot on the map and wait for its popup. Returns the popup locator.
 *
 * `openForSale: true` clicks "Open Lot for Sale" (unregistered lots only) and returns the
 * resulting create dialog instead.
 */
export async function clickLot(
  page: Page,
  lot: LotHandle
): Promise<ReturnType<Page['locator']>> {
  const focused = await focusLot(page, lot);
  await page.mouse.click(focused.x, focused.y);

  const popup = page.locator('.maplibregl-popup-content');
  await expect(popup).toBeVisible({ timeout: 10000 });
  return popup;
}

/** Focus and click a lot, then press its primary action button. */
export async function openLotForSale(
  page: Page,
  lot: LotHandle
): Promise<ReturnType<Page['locator']>> {
  const popup = await clickLot(page, lot);
  await popup.getByRole('button', { name: /Open Lot for Sale/ }).click();

  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'New Property Lot' });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  return dialog;
}
