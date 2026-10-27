'use client';

import { FileText, MapPin, Ruler, Tag, UserRound } from 'lucide-react';

import { Card, CardCallingRail } from '@/components/ui/card';
import { CallingCardRule } from '@/components/ui/card-calling-parts';
import { IconBox } from '@/components/ui/icon-box';
import { StatusBar } from '@/components/ui/status-bar';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils/initials';
import {
  deriveLotPrice,
  formatArea,
  formatLotRef,
  formatPriceAbbreviated,
  formatPricePerSqm,
} from '@/lib/utils/lot-pricing';
import type { CallingCardStatus } from '@/lib/types/calling-card';

/**
 * A record that is two subjects at once: a lot and its buyer.
 *
 * The billing and legal grids both show a ledger account or a land title, and
 * each of those is a lot *and* the person buying it, plus a workflow status that
 * belongs to neither. Every layout the grids have tried is an answer to how
 * those three sit together; this is the one that was chosen.
 *
 * The two subjects sit side by side in one band, divided by a hairline rule,
 * with a short accent bar over each column — blue over the lot, gold over the
 * buyer, echoing the blue and gold rails the calling cards already use. Those
 * bars are the whole visual device: they separate land from person at a glance,
 * before any text is read, and they cost no height and no width.
 *
 * The buyer keeps their monogram. An earlier version of this layout dropped it
 * to save space, which made the buyer's column read as a second address rather
 * than as a person — the initials are what say "this side is a human being".
 *
 * It is a separate component from `PropertyCallingCard` and `ClientCallingCard`
 * rather than a composition of them, because the nested arrangement those cards
 * support gives the buyer no column, no monogram and no accent of their own —
 * see the comparison in `app/demo/calling-cards` for what that looked like.
 */

/** A lot's identity and pricing, as the grids select them. */
export interface SplitCardLot {
  block_number: number;
  lot_number: number;
  /** The project area. The card's title — staff identify a lot by where it is. */
  location?: string | null;
  area_size?: number | null;
  price_per_sqm?: number | null;
  title_number?: string | null;
  /**
   * A total that overrides the derived one. A billing account carries its own
   * contract price, which is the figure the account is actually billed on and
   * can differ from area × rate; where it exists it wins.
   */
  total_price?: number | null;
}

/** The buyer, as the grids select them. */
export interface SplitCardBuyer {
  full_name: string;
  address?: string | null;
}

export interface SubjectSplitCardProps {
  lot: SplitCardLot;
  /** `null` when the record has no buyer linked yet — see `buyerFallback`. */
  buyer?: SplitCardBuyer | null;
  /** Printed in the buyer column when there is no buyer. */
  buyerFallback?: string;
  status: CallingCardStatus;
  onClick?: () => void;
  /** The card's accessible name. Required: only the caller knows the whole record. */
  label: string;
  /**
   * Rendered between the band and the status bar — the billing card's
   * amortization line and Pay/Ledger buttons. Takes the full width, and is
   * responsible for stopping propagation on any control of its own.
   */
  children?: React.ReactNode;
  /** Rendered under the buyer's address — co-buyers, a legacy-title badge. */
  buyerNote?: React.ReactNode;
  className?: string;
}

function LotColumn({ lot }: { lot: SplitCardLot }) {
  const lotLabel = formatLotRef(lot.block_number, lot.lot_number);
  const projectArea = lot.location?.trim() || null;
  const hasTct = Boolean(lot.title_number?.trim());

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* The accent bar: blue is "the land" everywhere else in the app, so the
          lot's side of the family uses it and the buyer's takes gold. */}
      <div className="mb-2 h-0.5 w-4 rounded-full bg-[color-mix(in_srgb,var(--primary)_70%,black)]" aria-hidden="true" />

      {/* The full text on `title`, the same treatment the buyer's address gets:
          the column is half the card, so the project area can lose its last few
          characters at the widths the grids actually produce, and a truncated
          title should still be readable on hover. */}
      <p
        className="truncate text-xs font-semibold text-foreground"
        title={projectArea ?? lotLabel}
      >
        {projectArea ?? lotLabel}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {projectArea ? lotLabel : 'Property'}
      </p>

      <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
        <FileText className="h-3 w-3 shrink-0" />
        {hasTct ? (
          <span className="font-mono text-foreground">{lot.title_number}</span>
        ) : (
          <span className="italic">No TCT</span>
        )}
      </p>
    </div>
  );
}

/**
 * The lot's two numbers, on their own row under the band rather than inside the
 * lot's column.
 *
 * They were in the column first, and that was wrong twice over. The row belongs
 * to the *record*, not to the lot: area and price describe the same lot the
 * buyer's column is about, and putting them under one column reads as though
 * they were that column's facts and the other column had none. And the column is
 * half the card, so the price — two numbers in brackets that cannot compress —
 * squeezed the area down to a stub. Full width, the two fit side by side at
 * every grid width the cards are used at.
 */
function LotFacts({ lot }: { lot: SplitCardLot }) {
  const area = formatArea(lot.area_size);
  const pricePerSqm = lot.price_per_sqm ?? null;
  const total = lot.total_price ?? deriveLotPrice(lot.area_size, pricePerSqm);

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px]">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Ruler className="h-3 w-3 shrink-0" />
        <span className={area ? 'text-foreground' : 'italic'}>{area ?? 'No area'}</span>
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Tag className="h-3 w-3 shrink-0" />
        {total && pricePerSqm ? (
          <>
            <span className="text-foreground">{formatPriceAbbreviated(total)}</span>
            <span>({formatPricePerSqm(pricePerSqm)})</span>
          </>
        ) : (
          <span className="italic">No price</span>
        )}
      </span>
    </div>
  );
}

function BuyerColumn({
  buyer,
  fallback,
  note,
}: {
  buyer?: SplitCardBuyer | null;
  fallback: string;
  note?: React.ReactNode;
}) {
  const name = buyer?.full_name?.trim() || null;
  const address = buyer?.address?.trim() || null;
  const initials = name ? getInitials(name) : '';

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-2 h-0.5 w-4 rounded-full bg-[color-mix(in_srgb,var(--row-accent)_78%,black)]" aria-hidden="true" />

      <div className="flex min-w-0 items-center gap-1.5">
        {/* The monogram is the one cue that says this column is a person rather
            than a second address, so it stays even when the column is tight. */}
        <IconBox
          variant="canvas"
          size="xs"
          shape="rounded-md"
          className="shrink-0 font-semibold tracking-wide"
        >
          {initials || <UserRound className="h-3 w-3" />}
        </IconBox>
        <span className="min-w-0 truncate text-xs font-semibold text-foreground">
          {name ?? fallback}
        </span>
      </div>

      {address ? (
        <p
          className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground"
          // The full address, because two lines is not always enough for one.
          title={address}
        >
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{address}</span>
        </p>
      ) : (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] italic text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          No address on file
        </p>
      )}

      {note && <div className="mt-1.5 min-w-0">{note}</div>}
    </div>
  );
}

export function SubjectSplitCard({
  lot,
  buyer,
  buyerFallback = 'Unassigned',
  status,
  onClick,
  label,
  children,
  buyerNote,
  className,
}: SubjectSplitCardProps) {
  return (
    <Card
      variant="calling-card"
      padding="none"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onKeyDown={
        onClick
          ? (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'group flex h-full flex-col overflow-hidden text-left transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md',
        className,
      )}
    >
      {/* One rail for the whole record. The per-column bars above are a second,
          smaller echo of it rather than a second rail. */}
      <CardCallingRail className="bg-[color-mix(in_srgb,var(--primary)_70%,black)]" />

      <div className="relative flex flex-1 flex-col p-3 pl-5">
        <div className="flex items-stretch gap-3">
          <LotColumn lot={lot} />
          <div className="w-px shrink-0 bg-border-warm-subtle" aria-hidden="true" />
          <BuyerColumn buyer={buyer} fallback={buyerFallback} note={buyerNote} />
        </div>

        {/* The record's shared facts, below the band and above the caller's own
            row — the same order C5 uses. */}
        <CallingCardRule />
        <LotFacts lot={lot} />
      </div>

      {children}

      <StatusBar
        tone={status.tone}
        status={status.label}
        detail={status.detail}
        progress={status.progress}
        trailing={status.trailing}
        className="mt-auto shrink-0"
      />
    </Card>
  );
}
