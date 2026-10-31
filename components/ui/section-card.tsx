import * as React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * A titled section inside a record's page.
 *
 * This archetype — a bordered panel with a small uppercase heading — was
 * hand-rolled 25 times across the title dialog's five stage pages, in three
 * different surfaces (`bg-card`, `bg-row-hover`, and a bare border with no
 * background) and two corner radii. None of them agreed, and none of them
 * looked like a deliberate choice, because none of them were one.
 *
 * It composes `Card` rather than restating its classes, so a section inherits
 * the same radius, border and surface as every other card in the app. The
 * header is a subcomponent because the heading and the trailing counter are
 * always in the same relationship — the counter belongs on the heading's line,
 * not floating in the body.
 */

const sectionPadding = {
  none: '',
  sm: 'p-3',
  default: 'p-4',
} as const;

export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `none` when the body is a list whose rows carry their own padding. */
  padding?: keyof typeof sectionPadding;
}

export function SectionCard({ className, padding = 'default', ...props }: SectionCardProps) {
  return (
    <Card
      variant="section"
      padding="none"
      className={cn(sectionPadding[padding], className)}
      {...props}
    />
  );
}

export interface SectionHeaderProps {
  /** The section's name, rendered in the small-caps heading style. */
  title: string;
  /** One line of context under the title, where the title alone is not enough. */
  description?: string;
  /**
   * Right-hand content on the heading's line — a counter ("4 of 6 uploaded"),
   * a badge, a button. Kept out of the body so it reads as part of the heading.
   */
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    /*
      The action wraps below the title on a narrow card rather than sharing its
      line. A long action — "Current: Document Preparation" is 214px — leaves the
      title's box too narrow to hold its own text at 390px, and because the title
      block is `min-w-0` the heading does not wrap into the box: it overflows it
      and runs underneath the action. Measured at 390px: the box collapsed to
      56px while the text painted 185px wide, straight through the badge. Wrapping
      the row removes the competition instead of tuning it.
    */
    <div className={cn('flex flex-wrap items-start justify-between gap-x-3 gap-y-2', className)}>
      <div className="min-w-0 flex-1 basis-1/2 space-y-0.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
