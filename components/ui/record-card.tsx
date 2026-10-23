'use client';

import * as React from 'react';

import { Card } from '@/components/ui/card';
import { StatusBar } from '@/components/ui/status-bar';
import { cn } from '@/lib/utils';
import type { CallingCardStatus } from '@/lib/types/calling-card';

export interface RecordCardProps {
  /**
   * The card's accessible name. Required rather than derived, because the body
   * is a row of calling cards whose own labels describe the parts — only the
   * caller knows what the whole record is.
   */
  label: string;
  onClick: () => void;
  /** The footer band. See `StatusBar` for what each field renders. */
  status: CallingCardStatus;
  className?: string;
  children: React.ReactNode;
}

/**
 * A record as a card: a row of calling cards for the record's subjects, and a
 * banded footer saying where the record stands.
 *
 * The calling cards carry the record's identity and the footer is the only
 * place the status appears. That is deliberate — showing the status twice, once
 * as a badge and once as a timestamp line, spends two rows saying one thing and
 * still misses the number that makes the status actionable. The bar says the
 * status *and* that number, in the same slot, and it is the same component the
 * Billing, Legal and Property grids use, which is what makes a billing card and
 * a legal card read as one family.
 *
 * The body is a `flex-wrap` row rather than a fixed pair of columns so a narrow
 * grid cell stacks its cards instead of clipping them, and the footer is a
 * sibling of the padded body rather than a row inside it, so it reaches the
 * card's full width and sits flush against the bottom edge — the same reason
 * `StatusBar` is built that way.
 *
 * Children that want their own line — a co-buyer list, an actions row — take
 * `w-full` and the wrap gives it to them.
 */
export function RecordCard({ label, onClick, status, className, children }: RecordCardProps) {
  return (
    <Card
      variant="interactive"
      padding="none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group flex flex-col overflow-hidden transition-all duration-150 hover:border-primary',
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-start gap-2 p-3">{children}</div>
      <StatusBar
        tone={status.tone}
        status={status.label}
        detail={status.detail}
        progress={status.progress}
        trailing={status.trailing}
      />
    </Card>
  );
}
