import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Measures the title dialog at the four widths the redesign was specified
 * against and prints the numbers.
 *
 * It asserts only the one thing that is a contract — no horizontal overflow at
 * 390px, which `dashboard-workflow.spec.ts` also asserts. Everything else is
 * printed rather than asserted, because a number that moves is a fact to read,
 * not a test to fail. Run it with `--reporter=list` to see the output.
 *
 * Per `.agents/skills/layout-verification/SKILL.md`: one fresh page load per
 * viewport, `deviceScaleFactor: 2`, the cursor parked so no hover inflates a
 * measurement, and wrapping detected by vertical-span overlap rather than by
 * comparing `top` values.
 */
const WIDTHS = [1536, 1280, 768, 390];

async function measure(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/dashboard/legal');
  const card = page.locator('[role="button"][aria-label^="Open title record"]').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.mouse.move(0, 0);

  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };

    const dialogEl = document.querySelector('[role="dialog"]');
    const header = dialogEl?.firstElementChild?.firstElementChild ?? null;
    const rail = document.querySelector('nav[aria-label="Title lifecycle"]');
    const railColumn = rail?.closest('div[class*="col-span"]') ?? rail;

    /*
      Wrapping, for a flex row, is the row being taller than its tallest child.
      Comparing `top` values would not do it: siblings on one line differ in
      `top` by their alignment, and checking span overlap is worse still — on a
      single line every sibling overlaps every other by definition.
    */
    const identityRow = header?.querySelector('div[class*="flex-wrap"]') ?? null;
    const childHeights = Array.from(identityRow?.children ?? []).map(
      (k) => k.getBoundingClientRect().height
    );
    const rowHeight = identityRow?.getBoundingClientRect().height ?? 0;
    const tallestChild = childHeights.length ? Math.max(...childHeights) : 0;
    const wrapped = rowHeight > tallestChild + 1;

    return {
      dialog: box(dialogEl),
      header: box(header),
      railColumn: box(railColumn),
      railRows: rail ? rail.children.length : 0,
      identityWrapped: wrapped,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    };
  });
}

test.describe('Title dialog measurements', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const width of WIDTHS) {
    test(`measures at ${width}px`, async ({ page }) => {
      const m = await measure(page, width);
      console.log(
        `[measure] ${String(width).padStart(4)}px  dialog ${m.dialog?.w}x${m.dialog?.h}  ` +
          `header h=${m.header?.h}  rail w=${m.railColumn?.w} rows=${m.railRows}  ` +
          `identityWrapped=${m.identityWrapped}  ` +
          `overflow=${m.scrollW > m.innerW ? `${m.scrollW}>${m.innerW}` : 'none'}`
      );
      expect(m.scrollW).toBeLessThanOrEqual(m.innerW);
    });
  }
});
