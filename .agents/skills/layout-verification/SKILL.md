---
name: layout-verification
description: How to verify layout and fit claims in this repo — measuring real components with Playwright against the dev server, and the specific traps that make a confident-looking mock or measurement wrong. Use this skill when claiming that something fits, wraps, stacks, truncates, or overflows, when changing a width, min-width, padding, or gap in a dense layout, or when writing prose or a demo page that asserts geometry.
---

# Layout Verification

A layout claim is a factual claim, and this repo has a habit of stating them in
prose with specific numbers. Numbers that look measured are more persuasive than
vague ones and therefore more dangerous when wrong — a wrong figure written
confidently survives review precisely because it reads like it was checked.

The rule: **if you are about to write a number about how something renders, go
get that number from a real render.**

---

## The Harness

The dashboard is auth-gated, so most real components need a session. The loop
that works:

1. `npx next dev` running (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/demo/...`).
2. Have the **user** log in once in a headed browser; save `ctx.storageState({ path })`.
   Reuse that file for every later headless run. **Never read credentials or
   `.env.test` to authenticate yourself** — ask for a login, not a password.
   Note `/tmp` is wiped by a reboot, so re-establish the state file when a run
   starts failing with a redirect to `/login`.
3. One **fresh page load per viewport**. See "Sweep hygiene" below.
4. Write the probe as a scratch `.mjs` at the repo root, run it, then **delete
   it** — these are not meant to be committed.

```js
const ctx = await b.newContext({
  storageState: '/tmp/state.json',
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,          // for screenshots you intend to read
});
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);  // let fonts settle; text width is the measurement
await page.mouse.move(4, 4);     // park the cursor — see "Cursor state"
```

`deviceScaleFactor: 2` matters if you are going to *look* at the screenshot: at
1× the text is too coarse to judge truncation or misalignment.

---

## Trap 1 — A mock is not a reproduction

The most expensive error of this kind: a preview component reproduced the target's
padding and gap exactly, and still reported the wrong answer, because it had
**two children where the real row had three**. With `flex-1`, two children divide
the space in half; three children leave less for each. Every downstream number —
card width, column width, shortfall, whether the badge wrapped — was wrong, and
all of it was presented as measured.

Before trusting a mock, check it matches the real element on **all** of:

- child **count** and order
- padding, gap, border widths
- the width of the actual container
- any responsive classes inside it (see Trap 2)

If you cannot match all of them, **do not render a mock — describe the behaviour
in prose instead**, and say why it cannot be shown. A prose caveat is honest; a
misleading mock is not.

## Trap 2 — Tailwind responsive classes key off the viewport, not the container

`hidden xl:inline`, `lg:flex-row` and friends evaluate against the **window**, not
the element's parent. So a mock that fakes a narrow container with `maxWidth` or a
`w-[400px]` wrapper still renders its `xl:` branches at a 1600px window. It will
confidently show behaviour that only happens on a narrow *screen*.

This is why the fix in Trap 1 was to delete the mock rather than shrink it.
Non-responsive classes *are* reproduced honestly by a fixed-width wrapper — the
`min-w-[11rem] flex-1` compact card responds correctly to a `w-[351px]` parent.
Check each class inside the thing you are mocking.

## Trap 3 — `top` comparison does not detect wrapping

With `items-center`, a short item centred in a tall row has a **larger** `top`
than its taller siblings without being on a new line. Comparing `top` values
reported "wrapped: 10, inline: 0" for a header that was visibly all on one line.

Compare **vertical span overlap** instead:

```js
const sameLine = a.top < b.bottom - 1 && a.bottom > b.top + 1;
```

## Trap 4 — find which constraint is actually binding

When something wraps or overflows, there is usually one constraint doing the
work, and it is often not the one the arithmetic suggests. Prove it by neutralising
candidates in the live page and re-measuring:

```js
el.style.minWidth = '0';   // does the layout change?
```

In the title dialog, forcing `minWidth: 0` collapsed the cards 257px → 139px and
pulled the badge back onto one line — which proved the card's `min-w-[11rem]`
floor, not the dialog's geometry, was the binding constraint. Without that test
the natural conclusion ("the column is too narrow") would have been wrong.

A `min-width` floor in a `flex-1` row is a common culprit: the items look
flexible but refuse to shrink past it, so a row that "should" fit by arithmetic
wraps by a few pixels. **Check the margin of error against the floor**, not
against the computed width — the legal grid's cards miss fitting side by side by
**exactly 1px** (a 385px cell leaves 359px of content; two 176px cards plus an
8px gap need 360px).

## Trap 5 — sweep hygiene

Reusing one page across repeated `setViewportSize` calls produced results that
contradicted a clean run at the same width (cards reported inline at 1440 when a
fresh load reported them wrapped). Suspected mid-transition or stale layout state.

- **One fresh page load per viewport.** Slower, reproducible.
- Wait for `networkidle` **and** a settle timeout before measuring.
- Park the cursor off-canvas: a pointer left hovering a card keeps a hover panel
  open and can change the geometry you are measuring.
- Sweep enough widths to bracket the crossover, then report the crossover
  itself — "side by side at ≥1600, stacked at ≤1440" is more useful than a table.

## Trap 6 — `sr-only` and other false positives

Truncation checks that walk every element report `sr-only` nodes as overflowing:
they are clipped to a 1×1 box, so `scrollWidth` far exceeds `clientWidth`. Skip
anything with a bounding box under a few pixels, or check the computed
`position`/`clip`. Confirm a suspected truncation by looking at the screenshot,
not only at the numbers.

---

## Reporting

When you write a layout finding, include:

- the **exact numbers** and what they were measured on (viewport, element, sample size)
- the **crossover point** where behaviour changes, if there is one
- the **constraint** that causes it, and the evidence that it is the cause
- the **sample**: "3 of 10 real records" is a finding; "this can happen" is not
- what you **did not** measure, and why

Corrections are part of the record. If a number you previously wrote turns out to
be wrong, fix it at the source — the demo page, the code comment, the memory
file — rather than only mentioning it in chat. Stale confident numbers in three
places are three future mistakes.

## Where claims live in this repo

| Claim | Lives in |
|---|---|
| Design intent, side-by-side comparison | `app/demo/calling-cards/page.tsx` |
| Why a class or floor exists | a comment on the class, in the component |
| Cross-session findings | the memory directory |

`app/demo/calling-cards/page.tsx` is the design surface — **render options, do
not describe them.** But note its `MockDialogHeader` carries an explicit caveat
about Trap 2, and its below-xl behaviour is prose for that reason. Keep that
distinction: render what the mock can honestly reproduce, describe what it cannot.
