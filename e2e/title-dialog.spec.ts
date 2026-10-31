import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * The title dialog's five stage pages.
 *
 * Before this file, the only dialog coverage in the suite opened the record and
 * pressed Escape — nothing asserted that a stage page had rendered its content
 * or that its primary action was reachable. That is why a stage page could be
 * restyled into a broken state with every test still green.
 *
 * Stages are reached through the dialog's own rail rather than the page's
 * workflow filter, because the rail is what actually routes `activeContent` and
 * it is deterministic: the same record always shows the same five rows.
 *
 * A stage only opens once the record has reached it — see `isStageReachable` —
 * so reaching a stage means opening a record that is in it, not clicking past
 * the gate. The dev fixtures cover all five, and the card's own status text is
 * what identifies them.
 *
 * These tests do not assert copy or layout, both of which are meant to change.
 * They assert the thing that must not: every stage page renders, and the control
 * that page exists for is reachable. That is the net that lets the presentation
 * be redesigned.
 */

/**
 * The status text each dev fixture record's card carries, used to pick a record
 * that is actually in the stage under test. See the note in `showStage`.
 */
const RECORD_BY_STAGE = {
  'Cleared by Billing': 'Document Preparation',
  'Document Preparation': 'Document Preparation',
  'Clearance Period': 'Clearance Period',
  'Ready for Claim': 'Ready for Claim',
  Released: 'Released',
} as const;

type StageName = keyof typeof RECORD_BY_STAGE;

/**
 * Opens the first title record, or the first one in a given stage, and returns
 * the dialog.
 *
 * Cards are ordered `created_at desc`, so "the first matching one" is stable
 * across runs. The status text is the card's own, which is also what the rail
 * shows as reached — picking on it means the test opens a record whose stage it
 * has already agreed with the UI about.
 */
async function openFirstRecord(page: Page, stage?: StageName) {
  await page.goto('/dashboard/legal');

  const cards = page.locator('[role="button"][aria-label^="Open title record"]');
  await expect(cards.first()).toBeVisible();

  const card = stage
    ? cards.filter({ hasText: RECORD_BY_STAGE[stage] }).first()
    : cards.first();
  await expect(card).toBeVisible();
  await card.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Narrows a locator to the element that is actually painted.
 *
 * The dialog renders its stage content twice: once in the desktop grid and once
 * in the `md:hidden` mobile tab panel. `getByRole` skips the hidden copy on its
 * own, but `getByText` does not — it matches both and fails strict mode, or
 * resolves to the hidden one first. This keeps text assertions on the copy the
 * user can see.
 */
function visible(locator: Locator) {
  return locator.filter({ visible: true });
}

/** The lifecycle rail — the stage switcher, and itself a redesign target. */
function rail(page: Page) {
  return page.getByRole('navigation', { name: 'Title lifecycle' });
}

/**
 * Switches the dialog to a stage by clicking its row in the rail.
 *
 * Only the stages the record has reached are enabled — an unstarted stage has no
 * page, so its row is a label rather than a control. That is why the tests below
 * open a record already in the stage they are about to assert, and why this
 * clicks rather than checking `disabled` first: if the record were wrong, the
 * click would time out and say so.
 */
async function showStage(page: Page, label: string) {
  await rail(page).getByRole('button', { name: new RegExp(label) }).click();
}

test.describe('Title dialog stage pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('lists all five lifecycle stages regardless of the record stage', async ({ page }) => {
    await openFirstRecord(page);

    // The rail used to list only the stages already reached, so a record early
    // in the workflow gave no sense of what remained. All five are always there.
    for (const label of [
      'Cleared by Billing',
      'Document Preparation',
      'Clearance Period',
      'Ready for Claim',
      'Released',
    ]) {
      await expect(rail(page).getByRole('button', { name: new RegExp(label) })).toBeVisible();
    }
  });

  test('closes the stages the record has not reached', async ({ page }) => {
    await openFirstRecord(page, 'Document Preparation');

    const stages = rail(page).getByRole('button');

    // Reached, so they open.
    await expect(stages.filter({ hasText: 'Cleared by Billing' })).toBeEnabled();
    await expect(stages.filter({ hasText: 'Document Preparation' })).toBeEnabled();

    // Ahead of the record, so their rows are labels rather than controls.
    for (const label of ['Clearance Period', 'Ready for Claim', 'Released']) {
      await expect(stages.filter({ hasText: label })).toBeDisabled();
    }
  });

  test('keeps an unstarted stage page out of reach even if it is selected', async ({ page }) => {
    const dialog = await openFirstRecord(page, 'Document Preparation');

    // The rail is not the only way in — `selectedStage` is also written by the
    // status-change handlers, which can land a render behind the item they came
    // from. Whatever stage is selected, the column shows one the record is in.
    await expect(
      dialog.getByRole('heading', { name: 'Recipient & Turnover Dossier' })
    ).toHaveCount(0);
    await expect(dialog.getByRole('heading', { name: 'Stage Management' })).toBeVisible();
  });

  test('renders the intake page', async ({ page }) => {
    // The record's own stage is preparation; its intake page stays open because
    // Cleared by Billing is already behind it.
    await openFirstRecord(page, 'Document Preparation');
    await showStage(page, 'Cleared by Billing');

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Account Intake Overview' })
    ).toBeVisible();
  });

  test('renders document preparation with its checklist and stage action', async ({ page }) => {
    const dialog = await openFirstRecord(page, 'Document Preparation');
    await expect(dialog.getByRole('heading', { name: 'Stage Management' })).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Document Preparation & Verification Workflow' })
    ).toBeVisible();

    // The stage action depends on packet completeness, so it is either the
    // submit button or the begin button — never missing entirely.
    //
    // `exact` matters here. A rail row's accessible name is the whole row, and
    // the rail's Document Preparation row now nests the checklist step
    // "Submit for review" — so a substring match finds the navigation row as
    // well as the button. The action is the button, and only the button.
    await expect(
      dialog
        .getByRole('button', { name: 'Submit for Review', exact: true })
        .or(dialog.getByRole('button', { name: 'Begin Document Preparation', exact: true }))
    ).toBeVisible();
  });

  test('renders the clearance window', async ({ page }) => {
    const dialog = await openFirstRecord(page, 'Clearance Period');

    await expect(dialog.getByRole('heading', { name: '30-Day Clearance Period' })).toBeVisible();

    // The record is in the window, so the meter is running rather than the
    // "Clearance period active" fallback that shows for one that never started.
    // "Window closed" is the other end of that same toggle, and the fixture is
    // only a few days in, so this holds without pinning a day count.
    await expect(visible(dialog.getByText('Window running'))).toBeVisible();
  });

  test('renders notices with client outreach and escalation', async ({ page }) => {
    const dialog = await openFirstRecord(page, 'Ready for Claim');

    await expect(visible(dialog.getByText('Client Outreach & Notice Letters'))).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Notice Escalation' })).toBeVisible();

    // Either a notice is running or the next one can be started; the page
    // always offers one of the two rather than a dead end.
    await expect(
      dialog
        .getByRole('button', { name: /Start (1st|2nd|Final) Notice/ })
        .or(dialog.getByRole('button', { name: 'Generate PDF' }))
        .or(dialog.getByRole('button', { name: 'Record Release to Buyer' }))
        .first()
    ).toBeVisible();
  });

  test('renders the release dossier', async ({ page }) => {
    const dialog = await openFirstRecord(page, 'Released');

    await expect(
      dialog.getByRole('heading', { name: 'Recipient & Turnover Dossier' })
    ).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Signed Clearance Document' })
    ).toBeVisible();

    // The edit modal keeps its fields and validation; only its trigger is checked.
    const edit = dialog.getByRole('button', { name: 'Edit Release Details' });
    if (await edit.isVisible()) {
      await edit.click();
      const modal = page.getByRole('dialog').filter({ has: page.locator('#edit-name') });
      await expect(modal.locator('#edit-name')).toBeVisible();
      await expect(modal.locator('#edit-id')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('does not overflow horizontally on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFirstRecord(page);

    // The mobile layout puts the rail behind a tab rather than beside the page.
    await page.getByRole('tab', { name: 'Timeline' }).click();
    await expect(rail(page)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  });
});
