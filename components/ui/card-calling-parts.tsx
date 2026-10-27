import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared innards of the calling cards.
 *
 * The client and property cards are the same document with a different subject,
 * so their header row, ruled field list, and value formatting live here rather
 * than being written twice. What stays in each domain component is only what
 * actually differs: the monogram, the status badge, the navigation target, and
 * which fields are shown.
 */

/**
 * Header row: monogram slot, title line, and an open affordance on the right.
 *
 * `eyebrow` is the domain label ("Client" / "Property") — it is what stops the
 * two cards from being mistaken for each other when the title text alone is
 * ambiguous, so it is not decorative and should not be dropped to save space.
 */
export function CallingCardHeader({
  monogram,
  title,
  eyebrow,
  eyebrowTitle,
  badge,
  trailing,
  size = 'default',
}: {
  /**
   * Optional so a card nested as a secondary subject can drop it — the parent
   * has already established the record's identity, and a second box of initials
   * inside it reads as a second record.
   */
  monogram?: React.ReactNode;
  title: React.ReactNode;
  /** Optional for the mirror reason: a label the parent has already stated. */
  eyebrow?: string;
  /**
   * The eyebrow's full text, when it is long enough to be truncated on screen.
   * A client card puts the address here, and an address that ellipsizes without
   * a way to read the rest is worse than no address at all.
   */
  eyebrowTitle?: string;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  size?: 'default' | 'lg';
}) {
  const isLarge = size === 'lg';
  return (
    <div className="flex items-start gap-3">
      {monogram}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'truncate font-semibold text-foreground transition-colors group-hover:text-accent-blue-foreground',
              isLarge ? 'text-base' : 'text-sm',
            )}
          >
            {title}
          </span>
          {badge}
        </div>
        {eyebrow && (
          // Truncated rather than wrapped: the eyebrow is a supporting label,
          // and letting a long address run to three lines would push the card's
          // field list down for every row in a grid. `eyebrowTitle` carries the
          // full text for the case where it does not fit.
          <p
            className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            title={eyebrowTitle}
          >
            {eyebrow}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );
}

/**
 * Identity row of the `compact` tier: monogram and title, nothing else.
 *
 * Drops the eyebrow and the badge. In the contexts compact is meant for — a
 * dialog or panel header — the surrounding record already states the domain and
 * the status, and repeating them is what made an earlier single-row attempt wrap
 * the title dialog's header onto a second line and double its height. The rest of
 * the compact card's content belongs on the row below, not beside the title.
 */
export function CallingCardInline({
  monogram,
  title,
  titleClassName,
}: {
  monogram: React.ReactNode;
  title: React.ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {monogram}
      <span
        className={cn(
          'min-w-0 truncate text-xs font-semibold text-foreground transition-colors group-hover:text-accent-blue-foreground',
          titleClassName,
        )}
      >
        {title}
      </span>
    </div>
  );
}

/**
 * A second subject inside a card, below the field list.
 *
 * Its reason to exist is the billing and legal grids, where one record holds
 * both a lot and the buyer of that lot. Two side-by-side compact cards gave
 * that record two identities, two monograms and two rails for one thing; this
 * renders the buyer as a subject line inside the lot's card instead, which is
 * what the data actually says.
 *
 * Deliberately not interactive and not able to be: it sits inside a card that
 * is already the click target, and an anchor inside an anchor is invalid
 * markup. `trailing` is for a fact, not a control.
 */
export function CallingCardSubject({
  monogram,
  title,
  eyebrow,
  trailing,
  className,
}: {
  monogram: React.ReactNode;
  title: React.ReactNode;
  eyebrow: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {monogram}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        </div>
        {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
      </div>
    </div>
  );
}

/** The rule under the header, echoing a form's field divider. */
export function CallingCardRule() {
  return <div className="my-2.5 border-t border-border-warm-subtle" />;
}

/**
 * One labelled field.
 *
 * A missing value prints `fallback` rather than collapsing the row. A card that
 * silently drops empty rows makes an absent field indistinguishable from a
 * broken query, which is exactly how the missing `contact_info` join went
 * unnoticed — so the gap is made visible on purpose.
 */
export function CallingCardField({
  icon,
  label,
  value,
  fallback,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  fallback: string;
  mono?: boolean;
}) {
  const hasValue = Boolean(value && value.trim());
  return (
    <div className="flex items-baseline gap-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <dt className="sr-only">{label}</dt>
      <dd
        className={cn(
          'min-w-0 flex-1 truncate text-xs',
          hasValue ? 'text-foreground' : 'italic text-muted-foreground',
          hasValue && 'font-medium',
          hasValue && mono && 'font-mono',
        )}
      >
        {hasValue ? value : fallback}
      </dd>
    </div>
  );
}

/**
 * Compact form: icon and value on one line, label demoted to a tooltip.
 *
 * This is the tier for cards that sit inside another record — a client on a map
 * lot, or in the title dialog's header — where the surrounding page already
 * supplies the context the label would have restated.
 */
export function CallingCardFieldCompact({
  icon,
  label,
  value,
  fallback,
  mono,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  fallback: string;
  mono?: boolean;
  className?: string;
}) {
  const hasValue = Boolean(value && value.trim());
  return (
    <div
      className={cn('flex items-baseline gap-2', className)}
      title={`${label}: ${hasValue ? value : fallback}`}
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <dt className="sr-only">{label}</dt>
      <dd
        className={cn(
          'min-w-0 flex-1 truncate text-[11px]',
          hasValue ? 'text-foreground' : 'italic text-muted-foreground',
          hasValue && 'font-medium',
          hasValue && mono && 'font-mono',
        )}
      >
        {hasValue ? value : fallback}
      </dd>
    </div>
  );
}

/** The full field list of a card when revealed on hover. */
export function CallingCardFieldList({ children }: { children: React.ReactNode }) {
  return <dl className="space-y-1.5">{children}</dl>;
}
