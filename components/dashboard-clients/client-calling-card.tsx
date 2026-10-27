'use client';

import {
  UserRound,
  Phone,
  Mail,
  HelpCircle,
  ExternalLink,
  FileText,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
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
import { primaryContactOf } from '@/lib/utils/contact-ranking';
import { getInitials } from '@/lib/utils/initials';
import type { ContactInfo } from '@/lib/types/client';
import type { CallingCardStatus } from '@/lib/types/calling-card';

export interface ClientCallingCardData {
  client_id?: string | null;
  full_name: string;
  status?: string | null;
  address?: string | null;
  tin_number?: string | null;
  civil_status?: string | null;
  spouse_name?: string | null;
  contact_info?: ContactInfo[] | null;
  primary_contact?: { type: string; value: string } | null;
}

export type CallingCardTier = 'compact' | 'default' | 'lg';

export interface ClientCallingCardProps {
  client: ClientCallingCardData;
  /**
   * `lg` for a directory grid, `default` for a standalone block, `compact` for
   * the header of a dialog or panel where the surrounding record already
   * supplies context.
   */
  tier?: CallingCardTier;
  /**
   * Renders the card as a low-key section of a parent record rather than as a
   * card in its own right: no border, no rounding, no shadow, and — the part
   * that matters — no hover reveal and no focus stop, so it cannot be mistaken
   * for something to click. Use it when a parent card is already the click
   * target and a nested bordered card would advertise a second one.
   */
  embedded?: boolean;
  /**
   * Enables the hover/focus reveal panel. Defaults to on for `compact`, where
   * the card keeps only the essentials and the rest is one hover away. Forced
   * off by `embedded`.
   */
  revealOnHover?: boolean;
  /**
   * Overrides the background watermark style. The icon watermark is the
   * confirmed default at every tier; `motif` selects the drawn alternative and
   * exists so the two can still be compared like for like in the preview.
   */
  watermark?: 'icon' | 'motif' | 'none';
  /**
   * Resolved status for the bottom bar. Optional and explicit: with no
   * descriptor there is no bar, so the dialog header does not grow one. Callers
   * in the grids pass `{ label: client.status, tone: ... }`; Billing and Legal
   * pass a descriptor carrying a balance or a document count.
   */
  status?: CallingCardStatus;
  /**
   * Where the card links. Left unset it derives the client's own profile from
   * `client.client_id`; pass `null` for a card that must stay inert even though
   * the client is known. `embedded` always wins — a card inside a parent that
   * is already the click target is never a link of its own.
   *
   * Deriving rather than requiring it is what makes "a client card opens the
   * client" a property of the family instead of a line every caller has to
   * remember. `ClientChip`, which this replaces, derived the same route from
   * the same field.
   */
  href?: string | null;
  /** Custom click handler, for a card that does something other than navigate. */
  onClick?: (event: React.MouseEvent) => void;
  /**
   * Replaces the open affordance in the header's trailing slot — the corner a
   * caller-owned control goes in when the card needs one of its own, such as
   * the client directory's actions menu.
   *
   * Only the non-compact tiers have a header row to put it in; compact drops
   * the header and this is ignored. A caller that supplies one takes over the
   * affordance, so the `ExternalLink` glyph is not also drawn.
   */
  trailing?: React.ReactNode;
  /**
   * Domain-specific detail to append below the field list, separated by the
   * same rule the fields use. For a grid that shows something about a client
   * the card does not model — the client directory's list of every contact,
   * with a copy button on each — so that the grid can standardise its card
   * without deleting a working feature.
   *
   * Only the non-compact tiers have a field list to append to; compact ignores
   * it, and `embedded` callers should prefer putting the detail in the parent.
   */
  children?: React.ReactNode;
  /**
   * Drops the monogram, for a card nested inside another as a secondary
   * subject. The parent has already established the record's identity, so a
   * second box of initials reads as a second record rather than as one.
   */
  hideMonogram?: boolean;
  /**
   * Drops the eyebrow label, for a card whose subject the parent has already
   * named — a "Client" label under a header that says the same thing is noise.
   */
  hideEyebrow?: boolean;
  className?: string;
}

/** Prefer the phone; a client card that leads with an email is useless to staff. */
function contactIcon(type?: string) {
  if (!type) return HelpCircle;
  const lowered = type.toLowerCase();
  if (lowered.includes('phone') || lowered.includes('mobile')) return Phone;
  if (lowered.includes('email')) return Mail;
  return HelpCircle;
}

/**
 * A client's identity as a document: monogram, name, and the facts staff look
 * up. The property counterpart is `PropertyCallingCard`, and the two share a
 * shell so they read as one family — while differing in rail colour, motif, and
 * the eyebrow label, so they are never mistaken for each other.
 *
 * `compact` is not a scale of the larger tiers but a different trade: it keeps
 * only what the surrounding record cannot already tell you (a way to make
 * contact) and moves the rest into the reveal panel.
 */
export function ClientCallingCard({
  client,
  tier = 'default',
  embedded = false,
  revealOnHover,
  watermark,
  status: statusProp,
  href: hrefProp,
  onClick,
  trailing: trailingProp,
  children,
  hideMonogram = false,
  hideEyebrow = false,
  className,
}: ClientCallingCardProps) {
  const initials = getInitials(client.full_name || '');
  const primaryContact = client.primary_contact ?? primaryContactOf(client.contact_info);
  const ContactIcon = contactIcon(primaryContact?.type);

  const isCompact = tier === 'compact';
  const isLarge = tier === 'lg';
  /** See `hideMonogram`: nesting is what those props are for. */
  const isNested = hideMonogram || hideEyebrow;
  // `embedded` wins over both: a card inside a parent that is already the click
  // target must not open a panel of its own or take a focus stop.
  const showReveal = !embedded && (revealOnHover ?? isCompact);
  const href = embedded
    ? null
    : hrefProp !== undefined
      ? hrefProp
      : // A caller that supplies its own handler has taken the interaction over,
        // so the card does not also navigate behind it — the precedence
        // `ClientChip.handleClick` already uses.
        onClick
        ? null
        : client.client_id
          ? `/dashboard/clients/${client.client_id}`
          : null;
  const isInteractive = Boolean(href || onClick) && !embedded;
  const motifVariant: 'icon' | 'corner-seal' | 'none' =
    watermark === 'none' ? 'none' : watermark === 'motif' ? 'corner-seal' : 'icon';
  /**
   * Keyed to the motif rather than the tier, because a solid filled glyph lays
   * down far more ink than 1px strokes: at a shared opacity the icon overwhelms
   * the text while the drawn motif is invisible. Keying it to the motif also
   * means an explicit `watermark` override looks the same at every tier.
   */
  const motifIntensity = motifVariant === 'icon' ? 0.1 : 0.22;

  const monogram = (
    <IconBox
      variant="canvas"
      size={isCompact ? 'xs' : isLarge ? 'lg' : 'md'}
      shape={isCompact ? 'rounded-md' : 'rounded-xl'}
      className={cn('shrink-0 font-semibold tracking-wide', isLarge && 'text-sm')}
    >
      {initials || (
        <UserRound className={isCompact ? 'h-3 w-3' : isLarge ? 'h-5 w-5' : 'h-4 w-4'} />
      )}
    </IconBox>
  );

  /** The full field set, shared by the expanded card and the reveal panel. */
  const fields = (
    <>
      <CallingCardField
        icon={<ContactIcon className="h-3.5 w-3.5" />}
        label={primaryContact?.type ?? 'Contact'}
        value={primaryContact?.value}
        fallback="Not on file"
      />
      <CallingCardField
        icon={<MapPin className="h-3.5 w-3.5" />}
        label="Address"
        value={client.address}
        fallback="Not on file"
      />
      <CallingCardField
        icon={<FileText className="h-3.5 w-3.5" />}
        label="TIN"
        value={client.tin_number}
        fallback="Not on file"
        mono
      />
    </>
  );

  const body = (
    <>
      {/* Rail width is deliberately not reduced for compact. Compact drops the
          eyebrow and shrinks the watermark, so the rail is the only domain cue
          left in this tier and has to carry more weight here, not less. */}
      <CardCallingRail />

      <div
        className={cn(
          'relative flex-1 flex flex-col',
          isCompact ? 'px-3 py-2' : isLarge ? 'p-4 pl-6' : 'p-3 pl-5',
        )}
      >
        <CardMotif
          variant={motifVariant}
          icon={<UserRound />}
          iconSize={isCompact ? 'sm' : 'default'}
          intensity={motifIntensity}
          // Strongest at the bottom-right corner, fading out toward the text.
          className={cn(
            'text-accent-gold-foreground',
            isCompact || motifVariant === 'icon'
              ? '[mask-image:linear-gradient(to_left,black,transparent_60%)]'
              : '[mask-image:linear-gradient(to_bottom_right,transparent_5%,black_70%)]',
          )}
        />
        {isCompact ? (
          // Two rows, deliberately. Trading vertical space to stay narrow is the
          // whole point of this tier: the alternative was a single wide row that
          // wrapped the dialog header onto a second line anyway. Row one is the
          // subject; row two is the one fact the surrounding dialog cannot tell
          // you on its own, a way to reach them.
          //
          // Row two always renders, printing its fallback when there is no
          // contact. Hiding it would make the card's height depend on the data,
          // so two cards sitting side by side in a header would misalign — and
          // staff would lose the signal that the record they are looking at has
          // no phone number on it.
          isNested ? (
            // Nested as a secondary subject, the two rows collapse into one:
            // name and contact side by side. The card below knows what kind of
            // fact this is, so the label goes and the icon carries it, which is
            // the trade `CallingCardFieldCompact` already makes elsewhere.
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                {client.full_name}
              </span>
              <CallingCardFieldCompact
                icon={<ContactIcon className="h-3 w-3" />}
                label={primaryContact?.type ?? 'Contact'}
                value={primaryContact?.value}
                fallback="Not on file"
                className="shrink-0"
              />
            </div>
          ) : (
            <div className="min-w-0 space-y-1">
              <CallingCardInline monogram={monogram} title={client.full_name} />
              <div className="min-w-0 pl-[1.75rem]">
                <CallingCardFieldCompact
                  icon={<ContactIcon className="h-3 w-3" />}
                  label={primaryContact?.type ?? 'Contact'}
                  value={primaryContact?.value}
                  fallback="Not on file"
                />
              </div>
            </div>
          )
        ) : (
          <>
            <CallingCardHeader
              monogram={hideMonogram ? undefined : monogram}
              title={client.full_name}
              eyebrow={hideEyebrow ? undefined : 'Client'}
              size={isLarge ? 'lg' : 'default'}
              trailing={
                trailingProp ??
                (isInteractive ? (
                  <ExternalLink
                    className={cn(
                      'shrink-0 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100',
                      isLarge ? 'h-4 w-4' : 'h-3.5 w-3.5',
                    )}
                  />
                ) : undefined)
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
          className="mt-auto shrink-0"
        />
      )}
    </>
  );

  const card = (
    <Card
      // A card that links has to *be* the anchor. Wrapping one would put an
      // extra element in the flex row the compact tier's `flex-1` and
      // `self-stretch` were measured against.
      asChild={Boolean(href)}
      variant="calling-card"
      padding="none"
      onClick={href ? undefined : embedded ? undefined : onClick}
      // Two reasons to be focusable, and both matter.
      //
      // The reveal panel is the only place the address, TIN and TCT appear in
      // the compact tier, so when it is enabled the card has to be reachable
      // without a mouse — Radix opens the hover card on focus, but only if the
      // trigger can take focus at all.
      //
      // The second is a card driven by `onClick` rather than a link: with no
      // anchor to inherit focus from, an unfocusable div means the card's own
      // action is mouse-only, which is how the client directory's card behaved
      // before this. An anchor needs neither, but `0` is its natural order, so
      // the branches stay identical.
      tabIndex={
        (showReveal && isCompact) || (isInteractive && !href) ? 0 : undefined
      }
      // A label without a role is noise to assistive tech, so an embedded card
      // announces itself as a named group inside the record that owns it. An
      // anchor needs no role — it already announces as a link.
      role={embedded ? 'group' : href ? undefined : onClick ? 'button' : undefined}
      // Enter and Space are the anchor's own business, so this only covers the
      // handler-driven case.
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
      aria-label={`Client ${client.full_name}`}
      className={cn(
        'group overflow-hidden text-left transition-shadow flex flex-col h-full',
        // The lift follows the affordance, not the tier: a card that does
        // something on hover — opens a panel or takes a click — rises, and one
        // that does nothing stays flat. Before, this was gated on `onClick`
        // alone, so a compact card with a reveal panel hovered dead.
        (isInteractive || showReveal) && 'hover:shadow-md',
        isInteractive && 'cursor-pointer',
        showReveal &&
          isCompact &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        // A floor, not a refusal to shrink, and it is load-bearing in the title
        // dialog: it is what decides whether that header's status badge sits
        // inline or wraps. Measured there, this floor is the active constraint —
        // forcing `minWidth: 0` collapses the cards from 257px to 139px and pulls
        // the badge back onto the same line.
        //
        // It is kept at 11rem because of what it protects: swept on the
        // worst-case record, 10.5rem and below put the badge inline but start
        // clipping the TCT (`T-121212121` loses 6px at 10rem), and a title number
        // staff read out loud is worth more than one stage's badge staying on the
        // first line.
        //
        // The cost is confined to xl and up, and it is close. Two cards at this
        // floor plus two 8px gaps plus the widest badge (169px, "Document
        // Preparation") need 537px; the column there is 522px, because that is
        // where the workflow strip starts showing its step labels. Fifteen pixels
        // short, so that one badge drops to its own line and the header is 119px
        // against 89px — on 3 of the 10 real records, all the same stage. Below
        // xl those labels hide, the column grows to 537px, and the badge fits
        // with nothing to spare.
        //
        // `flex-1` lets a row of compact cards divide the available width evenly
        // instead of each taking its own intrinsic width, which is what makes
        // two cards in a dialog header come out equal rather than 240px and
        // 176px. `self-stretch` then equalises their heights, since a property
        // card carries one more compact row than a client card.
        isCompact && 'min-w-[11rem] max-w-full flex-1 self-stretch rounded-lg',
        // Last, so it wins the `twMerge` against the compact tier's rounding and
        // against the variant's border, surface and shadow. The parent supplies
        // all three; a second set here is what made the legal grid read as
        // cards inside a card.
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
          {/* No badge: the card's status bar stays visible while this panel is
              open, so repeating the status would state the same fact twice. */}
          <CallingCardHeader
            monogram={monogram}
            title={client.full_name}
            eyebrow="Client"
          />
          <CallingCardRule />
          <CallingCardFieldList>{fields}</CallingCardFieldList>
          {(client.civil_status || client.spouse_name) && (
            <>
              <CallingCardRule />
              <p className="text-[11px] text-muted-foreground">
                {client.civil_status}
                {client.spouse_name ? ` · Spouse: ${client.spouse_name}` : ''}
              </p>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
