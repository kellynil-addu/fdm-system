/**
 * Monogram initials for a person's name.
 *
 * First and last initial, except for a single-word name where the first two
 * letters read better than a lone letter. Extracted from `client-chip.tsx` and
 * `client-detail-sidebar.tsx`, which each had their own byte-identical copy.
 *
 * Deliberately not used for lot references — "Block 4 Lot 12" would collapse to
 * a meaningless "B1", which is why the property card shows a pin glyph instead.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
