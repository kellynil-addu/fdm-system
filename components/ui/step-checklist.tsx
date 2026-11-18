'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * A vertical list of steps, each with a state marker, a title, a line of detail
 * and a trailing status pill.
 *
 * Three copies of this row existed: the packet tab's four-step preparation
 * workflow, the rail's nested preparation checklist, and the rail's own
 * per-stage cards. They had drifted — one used `CheckCircle2`, another a bare
 * `Check`, a third a filled dot; two showed a timestamp in the detail line and
 * one in a separate column. Consolidating them is what makes a "done" step look
 * the same wherever it appears.
 *
 * The state is derived from the item rather than passed as a fifth field, so a
 * caller cannot mark a step `done` and hand it a `Pending` badge: the marker,
 * the badge and the emphasis all read from one value.
 *
 * The **marker is a 16px box, not a 16px glyph**, and that is the whole point of
 * drawing it here rather than importing an icon. `lucide-react`'s `Circle` at
 * `h-4 w-4` strokes a 1px ring inside a 2px-inset circle, so the ink is a
 * 16×16 box holding a 12px circle at the `--muted-foreground` weight — which
 * measured as the faintest thing on the page and read as decoration rather than
 * as a control. A bordered box in the same shape as the `Checkbox` primitive
 * gives the state a full-strength edge at the size a checkbox is expected to be.
 */

export type StepState = 'done' | 'current' | 'pending' | 'skipped';

export interface StepItem {
  /** Stable identity for React, and the accessible name of the row. */
  id: string;
  /** Shown once the step is done: what happened. */
  title: string;
  /**
   * Shown while the step is still ahead: what has to happen.
   *
   * Without this a list of unstarted work reads as a list of finished work —
   * "Submitted for Review" is a claim the step has happened, and saying it about
   * a step nobody has started is worse than saying nothing. Falls back to
   * `title`, for a caller whose step has no meaningful imperative form.
   */
  pendingTitle?: string;
  /** The line under the title — usually the number that makes the step actionable. */
  detail?: string;
  state: StepState;
  /** Trailing pill text. Omitted for a step that needs no label. */
  badge?: string;
  /** Right-aligned date, for a step whose completion has a timestamp. */
  timestamp?: string | null;
}

const badgeVariantFor: Record<StepState, 'success' | 'default' | 'outline' | 'muted'> = {
  done: 'success',
  current: 'default',
  pending: 'outline',
  skipped: 'muted',
};

function StateMarker({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-success text-success-foreground">
        <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border-2 border-primary">
        <span className="h-1.5 w-1.5 rounded-[1px] bg-primary" aria-hidden="true" />
      </span>
    );
  }
  if (state === 'skipped') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-border bg-muted text-muted-foreground">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  /*
    `flex` is load-bearing, not decoration. This span is the only marker with no
    icon inside it, and `h-4 w-4` on an inline element sets nothing at all —
    width and height do not apply to `display: inline`. The three states above
    are `flex` and so measured 15.1x15.1; this one measured **1.9x21.7**, a
    sliver of its own border stretched to the line height, which is what "the
    checkboxes are barely visible" was looking at.

    The border is `border-muted-foreground`, not `border-muted-foreground/60`.
    Tokens in `globals.css` are hex, so Tailwind's slash-opacity compiles to
    `rgb(#526474 / 0.6)` and the browser drops it — the declaration reached
    nothing, and the border fell back to the `--border` default at #E2E7EC, the
    palest colour in the palette.
  */
  return (
    <span className="flex h-4 w-4 rounded-[4px] border border-muted-foreground bg-card" />
  );
}

export interface StepChecklistProps {
  items: StepItem[];
  /** Renders each marker as a button, for a list the user is working through. */
  onToggle?: (id: string) => void;
  className?: string;
  /** Accessible name for the list. */
  ariaLabel?: string;
}

export function StepChecklist({ items, onToggle, className, ariaLabel }: StepChecklistProps) {
  return (
    <ul aria-label={ariaLabel} className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isDone = item.state === 'done';
        const title = isDone ? item.title : (item.pendingTitle ?? item.title);

        return (
          <li
            key={item.id}
            className={cn(
              'flex items-start justify-between gap-3 rounded-lg border p-3',
              item.state === 'current' ? 'border-primary bg-sidebar-accent' : 'border-border bg-card'
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {onToggle ? (
                  <button
                    type="button"
                    onClick={() => onToggle(item.id)}
                    aria-pressed={isDone}
                    aria-label={`Mark ${title} ${isDone ? 'incomplete' : 'complete'}`}
                    className="rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <StateMarker state={item.state} />
                  </button>
                ) : (
                  <StateMarker state={item.state} />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {item.detail ? (
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {item.timestamp ? (
                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
              ) : null}
              {item.badge ? (
                <Badge variant={badgeVariantFor[item.state]} shape="pill">
                  {item.badge}
                </Badge>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
