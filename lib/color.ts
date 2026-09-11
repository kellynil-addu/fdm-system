/**
 * Returns a CSS color-mix() string from a CSS variable token.
 * amount (0–1): mix with white — 0.15 = 15% color, light tint.
 * amount (negative): mix with black — -0.15 = 85% color, slightly darker.
 */
export function deriveColor(token: string, amount: number): string {
  if (amount >= 0) {
    return `color-mix(in srgb, var(--${token}) ${Math.round(amount * 100)}%, white)`;
  }
  return `color-mix(in srgb, var(--${token}) ${Math.round((1 + amount) * 100)}%, black)`;
}
