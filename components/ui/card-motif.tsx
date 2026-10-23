import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Decorative background textures for cards.
 *
 * These carry no meaning. They exist so a card of one domain is recognisable
 * from across the screen without reading its text — a subtle visual signature
 * rather than information. Each motif therefore renders at very low opacity and
 * is hidden from assistive tech; if a motif ever has to be *read* to understand
 * the card, that is a bug in the card, not a cue to raise the opacity.
 *
 * Two families, and they are different tools rather than variations of one:
 *
 * - `icon` scales a single glyph up as a watermark. It is legible as a shape at
 *   a glance and needs no explanation, which makes it the lowest-risk option —
 *   but it can only ever say what one icon can say.
 * - `parcel-grid` and `corner-seal` are drawn textures. They carry more
 *   character (a surveyed plan, a document seal) and so distinguish two domains
 *   more strongly than two glyphs do, at the cost of being noticeable only when
 *   you look.
 *
 * Layers multiply: `intensity` scales the whole motif and each drawn layer
 * carries its own opacity within that, so a focal shape can read while the
 * surrounding texture stays background. Keep effective opacity behind text
 * under ~0.10.
 *
 * Colour comes from the parent's text colour, except for the focal shape in
 * `parcel-grid`, which uses a CSS variable. SVG presentation attributes take
 * CSS values rather than Tailwind classes, the same reasoning as
 * `lib/status-colors.ts`.
 */
const motifVariants = cva(
  "pointer-events-none absolute inset-0 select-none overflow-hidden",
  {
    variants: {
      variant: {
        none: "hidden",
        /** A single oversized glyph, anchored to the bottom-right corner. */
        icon: "",
        /**
         * A surveyed parcel grid with one lot picked out. Deliberately angular
         * and orthogonal — the opposite of an organic texture — so it reads as
         * land rather than as a pattern.
         */
        "parcel-grid": "",
        /**
         * Loose concentric arcs anchored in a corner, like the embossed seal on
         * a document. The curve counterpart to `parcel-grid`.
         */
        "corner-seal": "",
      },
    },
    defaultVariants: {
      variant: "parcel-grid",
    },
  },
);

export interface CardMotifProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof motifVariants> {
  /**
   * Opacity of the motif as a whole. Tuned so the texture survives a white card
   * surface without ever competing with the text on top; raise it only with a
   * legibility check against that text.
   */
  intensity?: number;
  /**
   * The glyph to render when `variant="icon"`. Size is set by the component
   * rather than inherited, so a watermark reads identically across cards of the
   * same tier.
   */
  icon?: React.ReactNode;
  /**
   * Watermark glyph size. `sm` is for the compact tier, where a 40px glyph in a
   * ~15rem card reads as competing with the text rather than sitting behind it.
   */
  iconSize?: 'default' | 'sm';
}

/**
 * Watermark glyph size, paired with the bleed offset so the glyph leaves the
 * card at a consistent proportion rather than a consistent pixel amount.
 */
const WATERMARK_GLYPH = {
  default: 'h-40 w-40 -bottom-6 -right-4',
  sm: 'h-20 w-20 -bottom-3 -right-2',
} as const;

const CardMotif = React.forwardRef<HTMLDivElement, CardMotifProps>(
  (
    { className, variant, intensity = 0.16, icon, iconSize = 'default', style, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(motifVariants({ variant, className }))}
      style={{ opacity: intensity, ...style }}
      {...props}
    >
      {variant === "icon" && icon && (
        // Bleeding off two edges keeps the glyph from reading as a centred
        // illustration, which would look like deliberate content.
        <div
          className={cn(
            "absolute [&_svg]:h-full [&_svg]:w-full",
            WATERMARK_GLYPH[iconSize],
          )}
        >
          {icon}
        </div>
      )}

      {variant === "parcel-grid" && (
        <svg
          className="h-full w-full"
          viewBox="0 0 240 160"
          preserveAspectRatio="none"
          fill="none"
        >
          {/* Lattice: held well below the focal parcel so the grid reads as
              paper and the outlined lot reads as the subject. */}
          <g stroke="currentColor" strokeWidth="1" opacity="0.3">
            <path d="M40 0V160M80 0V160M120 0V160M160 0V160M200 0V160" />
            <path d="M0 40H240M0 80H240M0 120H240" />
          </g>
          {/* The one lot that matters, placed in the empty lower-right region
              so it sits clear of the text column. */}
          <rect
            x="164"
            y="92"
            width="56"
            height="56"
            fill="var(--primary)"
            fillOpacity="0.2"
            stroke="var(--primary)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {variant === "corner-seal" && (
        <svg
          className="h-full w-full"
          viewBox="0 0 240 160"
          preserveAspectRatio="none"
          fill="none"
        >
          <g stroke="currentColor" strokeWidth="1" opacity="0.5">
            {/* Radii sized to sweep into the card rather than sit off-frame,
                which is what a corner-anchored ring set gets wrong. */}
            <ellipse cx="240" cy="160" rx="60" ry="52" />
            <ellipse cx="240" cy="160" rx="105" ry="90" />
            <ellipse cx="240" cy="160" rx="155" ry="132" />
            <ellipse cx="240" cy="160" rx="210" ry="180" />
          </g>
        </svg>
      )}
    </div>
  ),
);
CardMotif.displayName = "CardMotif";

export { CardMotif, motifVariants };
