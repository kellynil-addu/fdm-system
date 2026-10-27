'use client';

import Link from 'next/link';
import { MapPin, ExternalLink, FileText, Ruler } from 'lucide-react';
import { Card, CardCallingRail } from '@/components/ui/card';
import { CardMotif } from '@/components/ui/card-motif';
import { IconBox } from '@/components/ui/icon-box';
import { StatusBar } from '@/components/ui/status-bar';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import {
  CallingCardHeader,
  CallingCardInline,
  CallingCardRule,
  CallingCardField,
  CallingCardFieldCompact,
  CallingCardFieldList,
} from '@/components/ui/card-calling-parts';
import { cn } from '@/lib/utils';
import type { PropertyStatus, SubdivisionDisplayStatus } from '@/lib/types/property';
import type { CallingCardStatus } from '@/lib/types/calling-card';
import type { CallingCardTier } from '@/components/dashboard-clients/client-calling-card';

export interface PropertyCallingCardData {
  property_id?: string | null;
  block_number: number;
  lot_number: number;
  location?: string | null;
  status?: PropertyStatus | SubdivisionDisplayStatus | string | null;
  title_number?: string | null;
  area_size?: number | null;
}

export interface PropertyCallingCardProps {
  property: PropertyCallingCardData;
  tier?: CallingCardTier;
  /** See `ClientCallingCardProps.embedded`. */
  embedded?: boolean;
  revealOnHover?: boolean;
  /** See `ClientCallingCardProps.watermark`. */
  watermark?: 'icon' | 'motif' | 'none';
  /**
   * Resolved status for the bottom bar. Optional and explicit: with no
   * descriptor there is no bar, so a card in the title dialog's header does not
   * grow one. The properties grid passes `{ label, tone }` from
   * `PROPERTY_STATUS_VARIANT`; Billing and Legal pass a descriptor carrying a
   * balance or a document count. The dialog passes the same object it gives the
   * status badge, so the two can never disagree.
   */
  status?: CallingCardStatus;
  /**
   * Where the card links. Left unset it derives the lot's own view from
   * `property.property_id`; pass `null` for a card that must stay inert even
   * though the lot is known. `embedded` always wins. See
   * `ClientCallingCardProps.href`.
   */
  href?: string | null;
  /** Custom click handler, for a card that does something other than navigate. */
  onClick?: (event: React.MouseEvent) => void;
  /**
   * Detail to append below the field list, separated by the same rule the
   * fields use. Mirrors `ClientCallingCardProps.children`.
   *
   * Its reason for existing is the billing and legal grids, where a lot and its
   * buyer are two subjects with equal claim on the card. Nesting the buyer here
   * makes the lot the card and the buyer a fact about it, which is one card
   * instead of two sharing a wrapper — see the comparison in
   * `app/demo/calling-cards`.
   *
   * Only the non-compact tiers have a field list to append to; compact ignores
   * it, and `embedded` callers should prefer putting the detail in the parent.
   */
  children?: React.ReactNode;
  className?: string;
}

export function formatLotRef(block: number, lot: number): string {
  return `Block ${block} Lot ${lot}`;
}

/**
 * The property counterpart to `ClientCallingCard`.
 *
 * Shares the document shell (rail, monogram slot, ruled field list) so the two
 * read as one family, and differs in every other cue: a cool blue accent
 * instead of a warm gold one, an angular plat grid instead of a document seal,
 * and a lot reference in the position where a client shows a name.
 *
 * The monogram slot holds a pin glyph rather than initials: "Block 4 Lot 12"
 * collapses to "B1", which is both meaningless and easy to misread.
 */
export function PropertyCallingCard({
  property,
  tier = 'default',
  embedded = false,
  revealOnHover,
  watermark,
  status: statusProp,
  href: hrefProp,
  onClick,
  children,
  className,
}: PropertyCallingCardProps) {
  const lotLabel = formatLotRef(property.block_number, property.lot_number);
  const hasTct = Boolean(property.title_number?.trim());

  const isCompact = tier === 'compact';
  const isLarge = tier === 'lg';
  /** See `ClientCallingCard` — `embedded` overrides both the tier and the prop. */
  const showReveal = !embedded && (revealOnHover ?? isCompact);
  /**
   * The lot's own view is the site map with the lot selected, not a detail
   * route: that is where `PropertyChip` sent people, and the map is the only
   * page that shows a lot in the context of its subdivision.
   */
  const href = embedded
    ? null
    : hrefProp !== undefined
      ? hrefProp
      : // See the note in `ClientCallingCard` on why a handler wins.
        onClick
        ? null
        : property.property_id
          ? `/dashboard/properties/map?lot=${encodeURIComponent(property.property_id)}`
          : null;
  const isInteractive = Boolean(href || onClick) && !embedded;
  const motifVariant: 'icon' | 'parcel-grid' | 'none' =
    watermark === 'none' ? 'none' : watermark === 'motif' ? 'parcel-grid' : 'icon';
  /** See the note in `ClientCallingCard` on why this keys off the motif. */
  const motifIntensity = motifVariant === 'icon' ? 0.13 : 0.22;

  const monogram = (
    <IconBox
      variant="canvas"
      size={isCompact ? 'xs' : isLarge ? 'lg' : 'md'}
      shape={isCompact ? 'rounded-md' : 'rounded-md'}
      className="shrink-0"
    >
      <MapPin className={isCompact ? 'h-3 w-3' : isLarge ? 'h-5 w-5' : 'h-4 w-4'} />
    </IconBox>
  );

  const fields = (
    <>
      <CallingCardField
        icon={<MapPin className="h-3.5 w-3.5" />}
        label="Project area"
        value={property.location}
        fallback="No project area recorded"
      />
      <CallingCardField
        icon={<Ruler className="h-3.5 w-3.5" />}
        label="Area"
        value={property.area_size ? `${property.area_size} sqm` : null}
        fallback="Area not recorded"
        mono
      />
      <CallingCardField
        icon={<FileText className="h-3.5 w-3.5" />}
        label="Title"
        value={hasTct ? `TCT ${property.title_number}` : null}
        fallback="No TCT recorded"
        mono
      />
    </>
  );

  const body = (
    <>
      {/* Blue rail: the primary accent is already "the land" colour elsewhere in
          the app (site map fills, Reserved status pills), so the property side
          of the family uses it and the client side takes gold. */}
      {/* Width kept at the full rail; see the note in `ClientCallingCard`. */}
      <CardCallingRail className="bg-[color-mix(in_srgb,var(--primary)_70%,black)]" />

      <div
        className={cn(
          'relative',
          isCompact ? 'px-3 py-2' : isLarge ? 'p-4 pl-6' : 'p-3 pl-5',
        )}
      >
        {/*
          Inside the content box rather than as a sibling spanning the whole
          card — see the note in `ClientCallingCard` on why the watermark has to
          sit behind the text rather than behind the status bar too.
        */}
        <CardMotif
          variant={motifVariant}
          icon={<MapPin />}
          iconSize={isCompact ? 'sm' : 'default'}
          intensity={motifIntensity}
          // Fades the lattice out toward the text at the top-left while leaving
          // the parcel at the bottom-right at full strength.
          className={cn(
            'text-accent-blue-foreground',
            isCompact || motifVariant === 'icon'
              ? '[mask-image:linear-gradient(to_left,black,transparent_60%)]'
              : '[mask-image:linear-gradient(to_bottom_right,transparent_5%,black_75%)]',
          )}
        />
        <div className="relative">
        {isCompact ? (
          // Three rows: the lot, its project area, its TCT. The TCT earns a
          // permanent row because it is the number staff cross-reference against
          // the physical certificate, and the reveal panel is a poor place to
          // hide a value people read out loud. The project area above it
          // truncates rather than wrapping — long ones are rare, and an ellipsis
          // costs nothing here because the full text is one hover away.
          <div className="min-w-0 space-y-1">
            <CallingCardInline monogram={monogram} title={lotLabel} />
            <div className="min-w-0 space-y-1 pl-[1.75rem]">
              <CallingCardFieldCompact
                icon={<MapPin className="h-3 w-3" />}
                label="Project area"
                value={property.location}
                fallback="No project area recorded"
              />
              <CallingCardFieldCompact
                icon={<FileText className="h-3 w-3" />}
                label="TCT"
                // Prefixed here, not just in the label: the number alone is
                // ambiguous with a lot or account number in a dense column.
                value={hasTct ? `TCT ${property.title_number}` : null}
                fallback="No TCT recorded"
                mono
              />
            </div>
          </div>
        ) : (
          <>
            <CallingCardHeader
              monogram={monogram}
              title={lotLabel}
              eyebrow="Property"
              size={isLarge ? 'lg' : 'default'}
              trailing={
                isInteractive ? (
                  <ExternalLink
                    className={cn(
                      'shrink-0 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100',
                      isLarge ? 'h-4 w-4' : 'h-3.5 w-3.5',
                    )}
                  />
                ) : undefined
              }
            />
            <CallingCardRule />
            <CallingCardFieldList>{fields}</CallingCardFieldList>
            {children && (
              <>
                <CallingCardRule />
                {children}
              </>
            )}
          </>
        )}
        </div>
      </div>

      {/* Sibling of the padded body, not a row inside it, so the strip reaches
          the card's full width and sits flush against its bottom edge. */}
      {statusProp && (
        <StatusBar
          tone={statusProp.tone}
          status={statusProp.label}
          detail={statusProp.detail}
          progress={statusProp.progress}
          trailing={statusProp.trailing}
        />
      )}
    </>
  );

  const card = (
    <Card
      /** See the note in `ClientCallingCard` on why a link must be the card itself. */
      asChild={Boolean(href)}
      variant="calling-card"
      padding="none"
      onClick={href ? undefined : embedded ? undefined : onClick}
      // See the note in `ClientCallingCard`: the reveal tier must be focusable
      // because the TCT and area live only in the reveal panel, and a card
      // driven by `onClick` rather than a link must be focusable because
      // otherwise its own action is mouse-only.
      tabIndex={
        (showReveal && isCompact) || (isInteractive && !href) ? 0 : undefined
      }
      role={embedded ? 'group' : href ? undefined : onClick ? 'button' : undefined}
      onKeyDown={
        !href && onClick
          ? (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(event as unknown as React.MouseEvent);
              }
            }
          : undefined
      }
      aria-label={`Property ${lotLabel}`}
      className={cn(
        'group overflow-hidden text-left transition-shadow',
        /** See the note in `ClientCallingCard` on why the lift follows the affordance. */
        (isInteractive || showReveal) && 'hover:shadow-md',
        isInteractive && 'cursor-pointer',
        showReveal &&
          isCompact &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        // See the note in `ClientCallingCard` for why this floor is 11rem and
        // why it, not the dialog's geometry, is what decides badge wrapping.
        // `self-stretch` matters here specifically: a property card has three
        // compact rows and a client card has two, so without it the two cards
        // in a dialog header come out 89px and 65px and look misaligned.
        isCompact && 'min-w-[11rem] max-w-full flex-1 self-stretch flex flex-col rounded-lg',
        /** See the note in `ClientCallingCard` — the parent supplies the chrome. */
        embedded && 'rounded-none border-0 bg-transparent shadow-none',
        className,
      )}
    >
      {href ? (
        <Link href={href} onClick={onClick}>
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );

  if (!showReveal || !isCompact) return card;

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>{card}</HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-2.5 p-3">
          {/* No badge here: the card's own status bar is visible while this
              panel is open, so repeating the status would state it twice. */}
          <CallingCardHeader
            monogram={monogram}
            title={lotLabel}
            eyebrow="Property"
          />
          <CallingCardRule />
          <CallingCardFieldList>{fields}</CallingCardFieldList>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
