/**
 * How a lot's size and price are quoted.
 *
 * These lived in `PropertyCallingCard` until the billing and legal record cards
 * needed the same numbers in the same format. A card that quotes ₱6,500/sqm and
 * a card that quotes ₱6,500.00 per square metre are describing the same lot
 * differently, and staff comparing two screens should not have to notice that.
 */

const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

/** Square metres as staff quote them — no trailing `.0` on a whole number. */
const AREA = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });

/** `Block 4 Lot 12`. Deliberately not abbreviated: "B4L12" is not what anyone says. */
export function formatLotRef(block: number, lot: number): string {
  return `Block ${block} Lot ${lot}`;
}

/**
 * A peso figure abbreviated to the nearest whole unit — `₱3.2M`, `₱480k`.
 *
 * A card prints the lot's total and its per-square-metre rate on one line, and
 * the total is much the longer of the two, so the total is what gets shortened.
 * Anything under a thousand keeps its exact value: `₱850k` would be a lie about
 * a number small enough to print in full.
 */
export function formatPriceAbbreviated(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₱${trimTrailingZero(value / 1_000_000)}M`;
  if (abs >= 1_000) return `₱${trimTrailingZero(value / 1_000)}k`;
  return PESO.format(value);
}

function trimTrailingZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

/** The rate stays in full: it is the number buyers compare between lots. */
export function formatPricePerSqm(value: number): string {
  return `${PESO.format(value)}/sqm`;
}

/** Square metres, or `null` when the lot has no recorded area. */
export function formatArea(value?: number | null): string | null {
  return value ? `${AREA.format(value)} sqm` : null;
}

/**
 * A lot's total price, derived from its area and its rate.
 *
 * Returns `null` unless both are present: a total without an area would be a
 * number with no basis, and the card prints "Price not recorded" instead of
 * inventing one. Callers that have a total directly — a billing account carries
 * its own contract price — should use that rather than deriving it.
 */
export function deriveLotPrice(
  area?: number | null,
  pricePerSqm?: number | null,
): number | null {
  return area && pricePerSqm ? area * pricePerSqm : null;
}
