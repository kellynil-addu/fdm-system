'use client';

import { FileText, MapPin, Ruler, Tag, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardCallingRail, CardTitle } from '@/components/ui/card';
import { IconBox } from '@/components/ui/icon-box';
import { StatusBar } from '@/components/ui/status-bar';
import {
  CallingCardField,
  CallingCardFieldList,
  CallingCardRule,
} from '@/components/ui/card-calling-parts';
import { ClientCallingCard } from '@/components/dashboard-clients/client-calling-card';
import {
  PropertyCallingCard,
  formatPriceAbbreviated,
  formatPricePerSqm,
} from '@/components/dashboard-properties/property-calling-card';
import { cn } from '@/lib/utils';
import type { ContactInfo } from '@/lib/types/client';

/**
 * Design exploration of the split-band combo.
 *
 * The layout is settled: the lot and its buyer sit side by side in one band,
 * divided by a rule, with the shared facts below and one status bar at the
 * bottom. What is not settled is how much design the band can carry, so every
 * variation below is that same band with a different treatment layered on.
 *
 * The buyer side shows the buyer's *address*, not a contact number. Two
 * addresses now sit side by side — the lot's project area and the buyer's
 * address — which is the single biggest risk in this layout and the thing to
 * watch as the treatments get heavier. C1 is the plain control; C3 and C6 are
 * the two that address that risk directly, by labelling the columns.
 *
 * Each variation renders the same three records at the same measured width:
 *
 *   billing   a delinquent account with a notice out
 *   legal     a title mid document-preparation
 *   stress    the worst case — unassigned, no address, no TCT, long project area
 *
 * Every claim about a measurement here was taken with Playwright against this
 * page, not derived from the class names.
 *
 * **C5 is the one that shipped.** It lives in `components/ui/subject-split-card.tsx`
 * and is rendered by both `BillingAccountCard` and `TitleRecordCard`; the other
 * six are kept as the record of what was considered and rejected. The shipped
 * version adds back the buyer's monogram, which none of the seven below have.
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CONTACTS: ContactInfo[] = [
  {
    contact_id: 'c1',
    client_id: 'client-1',
    type: 'Mobile',
    value: '+63 917 555 0144',
    is_primary: true,
    last_updated: '2026-01-04T00:00:00Z',
  },
];

type Tone = 'success' | 'warning' | 'info' | 'muted' | 'destructive';

/** One status bar descriptor, shaped for `CallingCardStatus`. */
type ConceptStatus = {
  label: string;
  tone: Tone;
  detail: string;
  progress?: number;
  trailing?: string;
};

type ConceptRecord = {
  /** Who this card is for — drives the label above it in the grid. */
  kind: 'billing' | 'legal' | 'stress';
  lot: {
    block: number;
    lot: number;
    projectArea: string | null;
    area: number | null;
    pricePerSqm: number | null;
    tct: string | null;
  };
  buyer: { name: string | null; address: string | null };
  money: { tcp: number; remaining: number; monthly: number; receipts: number };
  legal: { stage: string; docsDone: number; docsTotal: number; legacy: boolean };
  coBuyers: string[];
  status: ConceptStatus;
};

const BILLING: ConceptRecord = {
  kind: 'billing',
  lot: {
    block: 4,
    lot: 12,
    projectArea: 'Brgy. Talomo, Davao City',
    area: 150,
    pricePerSqm: 6500,
    tct: '12-3456',
  },
  buyer: {
    name: 'Maria Santos',
    address: '12 Rizal Street, Brgy. Talomo, Davao City',
  },
  money: { tcp: 1_200_000, remaining: 720_000, monthly: 14_500, receipts: 6 },
  legal: { stage: 'Document Preparation', docsDone: 3, docsTotal: 7, legacy: false },
  coBuyers: [],
  status: {
    label: 'Delinquent',
    tone: 'warning',
    detail: 'Final Notice (Sent)',
    progress: 40,
    trailing: '₱720,000',
  },
};

const LEGAL: ConceptRecord = {
  kind: 'legal',
  lot: {
    block: 2,
    lot: 8,
    projectArea: 'Brgy. Calinan, Davao City',
    area: 210,
    pricePerSqm: 7500,
    tct: null,
  },
  buyer: {
    name: 'Ana Reyes',
    address: '88 Mabini Extension, Brgy. Calinan, Davao City',
  },
  money: { tcp: 1_575_000, remaining: 0, monthly: 0, receipts: 21 },
  legal: { stage: 'Document Preparation', docsDone: 3, docsTotal: 7, legacy: false },
  coBuyers: [],
  status: {
    label: 'Document Preparation',
    tone: 'info',
    detail: '3 of 7 documents',
    progress: 43,
    trailing: '3/7',
  },
};

/** The worst case: nothing on file but the lot number. */
const STRESS: ConceptRecord = {
  kind: 'stress',
  lot: {
    block: 104,
    lot: 127,
    projectArea: 'Brgy. Sto. Niño, Phase 2 Extension, Davao del Sur',
    area: null,
    pricePerSqm: null,
    tct: null,
  },
  buyer: { name: null, address: null },
  money: { tcp: 0, remaining: 0, monthly: 0, receipts: 0 },
  legal: { stage: 'Cleared by Billing', docsDone: 0, docsTotal: 7, legacy: true },
  coBuyers: ['Ramon Santos', 'Lourdes Santos'],
  status: {
    label: 'Cleared by Billing',
    tone: 'muted',
    detail: 'Awaiting title intake',
  },
};

const RECORDS = [BILLING, LEGAL, STRESS] as const;

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/**
 * Mirrors the billing and legal grids' `grid grid-cols-1 gap-4 sm:grid-cols-2
 * lg:grid-cols-3`, so the widths here are the real ones.
 *
 * Measured on this page (`getBoundingClientRect` on the track): at a 1280px
 * viewport the `max-w-6xl` container is 1180px, so a card gets
 * (1180 − 48 gutters − 32 gaps) / 3 = 357px at `lg`. At 1024px it is 298px,
 * which is the tightest a card gets in a real grid — below `lg` the grid drops
 * to one or two columns and cards get wider, not narrower.
 */
const GRID_CELL = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

function lotRef(record: ConceptRecord): string {
  return `Block ${record.lot.block} Lot ${record.lot.lot}`;
}

function initialsOf(name: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The two domain accents, as the calling cards already use them: cool blue is
 * "the land" and warm gold is "the buyer". Keeping the same pairing means a
 * treatment here cannot accidentally invent a third colour meaning.
 */
const LOT_RAIL = 'bg-[color-mix(in_srgb,var(--primary)_70%,black)]';
const BUYER_RAIL = 'bg-[color-mix(in_srgb,var(--row-accent)_78%,black)]';

/**
 * Pale panel fills, mixed against `--card` rather than white so they invert
 * with the theme instead of glowing in dark mode.
 */
const LOT_TINT = 'bg-[color-mix(in_srgb,var(--sidebar-accent)_60%,var(--card))]';
const BUYER_TINT = 'bg-[color-mix(in_srgb,var(--row-active)_60%,var(--card))]';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="canvas" padding="default" className="space-y-4">
      <div className="space-y-1">
        <CardTitle size="sm">{title}</CardTitle>
        <p className="max-w-3xl text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  );
}

/**
 * One variation: a label, its three records at the real cell width, and the
 * note on what the treatment costs.
 */
function Variation({
  label,
  axis,
  note,
  children,
}: {
  label: string;
  axis: string;
  note: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {label}
        </p>
        <Badge variant="outline-warm" shape="pill" className="text-[10px]">
          {axis}
        </Badge>
      </div>
      <div className={GRID_CELL}>{children}</div>
      <p className="max-w-3xl text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

/** Renders one record's label above its card, so the three stay legible. */
function Cell({
  record,
  children,
}: {
  record: ConceptRecord;
  children: React.ReactNode;
}) {
  return (
    // `min-w-0` is load-bearing: a grid item defaults to `min-width: auto`, so
    // without it the cell refuses to shrink below its content and pushes the
    // track past the container — measured at 417px in a 322px track before this
    // was added, which scrolled the page sideways at a 420px viewport.
    <div className="min-w-0 space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {record.kind === 'billing'
          ? 'Billing — delinquent'
          : record.kind === 'legal'
            ? 'Legal — in preparation'
            : 'Stress — unassigned'}
      </p>
      {children}
    </div>
  );
}

/**
 * The buyer's address, as it appears in the band's right column.
 *
 * Clamped to two lines rather than one, because one line is not enough: at the
 * real 357px cell a single line shows roughly "12 Rizal Street, Brgy. Talo…" and
 * hides the city. Two lines shows the whole billing address at 1280px.
 *
 * Measured, though, two lines is not a guarantee. At the 298px cell a 1024px
 * viewport produces, the longer legal address still loses "Calinan, Davao City",
 * and in C4's narrower column it loses more than that. The full text is on the
 * `title` attribute in every case, so nothing is unreachable — but a treatment
 * that starves this column is trading the buyer's address for whatever it adds.
 */
function BuyerAddress({
  address,
  className,
}: {
  address: string | null;
  className?: string;
}) {
  if (!address) {
    return (
      <p className={cn('flex items-center gap-1 text-[11px] italic text-muted-foreground', className)}>
        <MapPin className="h-3 w-3 shrink-0" />
        No address on file
      </p>
    );
  }
  return (
    <p
      className={cn('flex items-start gap-1 text-[11px] text-muted-foreground', className)}
      title={address}
    >
      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="line-clamp-2">{address}</span>
    </p>
  );
}

/**
 * The shared facts, on one line: area at the left, the total with its rate in
 * brackets at the right. Every variation renders this, so the six differ only in
 * the band's treatment and not in what they say — a comparison where one card
 * carries the area and another does not is not a comparison.
 */
function SharedFacts({ record }: { record: ConceptRecord }) {
  const hasArea = Boolean(record.lot.area);
  const total =
    hasArea && record.lot.pricePerSqm
      ? (record.lot.area as number) * record.lot.pricePerSqm
      : null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px]">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Ruler className="h-3 w-3 shrink-0" />
        <span className={hasArea ? 'text-foreground' : 'italic'}>
          {hasArea ? `${record.lot.area} sqm` : 'No area'}
        </span>
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Tag className="h-3 w-3 shrink-0" />
        {total && record.lot.pricePerSqm ? (
          <>
            <span className="text-foreground">{formatPriceAbbreviated(total)}</span>
            <span>({formatPricePerSqm(record.lot.pricePerSqm)})</span>
          </>
        ) : (
          <span className="italic">No price</span>
        )}
      </span>
    </div>
  );
}

/** The card shell every variation shares: rail, column, status bar. */
function BandCard({
  record,
  children,
  className,
}: {
  record: ConceptRecord;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      variant="calling-card"
      padding="none"
      className={cn(
        'group flex h-full cursor-pointer flex-col overflow-hidden text-left transition-shadow hover:shadow-md',
        className,
      )}
    >
      <CardCallingRail className={LOT_RAIL} />
      <div className="relative flex flex-1 flex-col">{children}</div>
      <StatusBar
        tone={record.status.tone}
        status={record.status.label}
        detail={record.status.detail}
        progress={record.status.progress}
        trailing={record.status.trailing}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// C1 — The control: two plain columns, a hairline between them
// ---------------------------------------------------------------------------

/**
 * The baseline every other treatment is measured against. Nothing is added: two
 * columns of text, a 1px rule, the shared facts on one line below.
 *
 * Its job is to stay boring. The band's own structure is doing the work — the
 * buyer is at full strength with their own initials and their own address, which
 * the shipped nested card reduces to a line of grey text — and every treatment
 * below has to justify itself against this.
 *
 * The risk it does not solve: the lot's project area and the buyer's address are
 * both addresses, in the same type, at the same size, one column apart. Nothing
 * on the card says which is which.
 */
function C1({ record }: { record: ConceptRecord }) {
  const hasTct = Boolean(record.lot.tct);

  return (
    <BandCard record={record}>
      <div className="flex flex-1 flex-col p-3 pl-5">
        <div className="flex items-stretch gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {record.lot.projectArea ?? lotRef(record)}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {record.lot.projectArea ? lotRef(record) : 'Property'}
            </p>
            <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              {hasTct ? (
                <span className="font-mono text-foreground">{record.lot.tct}</span>
              ) : (
                <span className="italic">No TCT</span>
              )}
            </p>
          </div>

          <div className="w-px shrink-0 bg-border-warm-subtle" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <IconBox variant="canvas" size="xs" shape="rounded-md" className="shrink-0 font-semibold">
                {initialsOf(record.buyer.name) || <UserRound className="h-3 w-3" />}
              </IconBox>
              <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                {record.buyer.name ?? 'Unassigned'}
              </span>
            </div>
            <BuyerAddress address={record.buyer.address} className="mt-1.5" />
          </div>
        </div>

        <CallingCardRule />

        <SharedFacts record={record} />
      </div>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// C2 — Two tinted panels
// ---------------------------------------------------------------------------

/**
 * The rule becomes a gap: each subject gets its own pale panel, cool for the lot
 * and warm for the buyer, matching the blue and gold rails the family already
 * uses.
 *
 * This is the cheapest way to make the band read as *two* things rather than one
 * column of text with a line through it, and it separates the two addresses by
 * putting them on different surfaces. It also gives the buyer visibly equal
 * weight for the first time — in every other treatment the buyer is a second
 * column that happens to be there; here they own a panel.
 *
 * The cost is that the card now has three surfaces stacked (two panels, then the
 * status bar), and the status bar's own tint has to coexist with them. In the
 * stress case the buyer panel is a pale empty rectangle, which draws the eye to
 * exactly the record that has nothing to show.
 */
function C2({ record }: { record: ConceptRecord }) {
  const hasTct = Boolean(record.lot.tct);

  return (
    <BandCard record={record}>
      <div className="flex flex-1 flex-col gap-3 p-3 pl-5">
        <div className="flex items-stretch gap-2">
          <div className={cn('min-w-0 flex-1 rounded-lg p-2.5', LOT_TINT)}>
            <p className="truncate text-xs font-semibold text-foreground">
              {record.lot.projectArea ?? lotRef(record)}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {record.lot.projectArea ? lotRef(record) : 'Property'}
            </p>
            <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              {hasTct ? (
                <span className="font-mono text-foreground">{record.lot.tct}</span>
              ) : (
                <span className="italic">No TCT</span>
              )}
            </p>
          </div>

          <div className={cn('min-w-0 flex-1 rounded-lg p-2.5', BUYER_TINT)}>
            <div className="flex min-w-0 items-center gap-1.5">
              <IconBox variant="canvas" size="xs" shape="rounded-md" className="shrink-0 font-semibold">
                {initialsOf(record.buyer.name) || <UserRound className="h-3 w-3" />}
              </IconBox>
              <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                {record.buyer.name ?? 'Unassigned'}
              </span>
            </div>
            <BuyerAddress address={record.buyer.address} className="mt-1.5" />
          </div>
        </div>

        <SharedFacts record={record} />
      </div>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// C3 — Labelled columns
// ---------------------------------------------------------------------------

/**
 * The band gets a header row: LOT over the left column, BUYER over the right,
 * with the rule running through both so it reads as one table.
 *
 * This is the direct answer to the two-addresses problem. Once the columns are
 * labelled, the reader knows before reading a word of content that the left
 * address belongs to the land and the right one to the person — which is the
 * ambiguity every other treatment leaves open. It also makes the grid scannable
 * down a column: project areas line up under LOT, names under BUYER, and a clerk
 * looking for one field can read straight down instead of across.
 *
 * The cost is 14px of height for a row that carries two words, and a set of
 * labels that repeat on every card in the grid. On a card the reader already
 * knows, the header is noise.
 */
function C3({ record }: { record: ConceptRecord }) {
  const hasTct = Boolean(record.lot.tct);

  return (
    <BandCard record={record}>
      <div className="flex flex-1 flex-col p-3 pl-5">
        {/* Header row. The rule runs through it so the two columns read as one
            table rather than as two stacked blocks. */}
        <div className="flex items-stretch gap-3">
          <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Lot
          </p>
          <div className="w-px shrink-0 bg-border-warm-subtle" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Buyer
          </p>
        </div>

        <div className="my-2 border-t border-border-warm-subtle" aria-hidden="true" />

        <div className="flex items-stretch gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {record.lot.projectArea ?? lotRef(record)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {record.lot.projectArea ? lotRef(record) : 'Property'}
            </p>
            <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              {hasTct ? (
                <span className="font-mono text-foreground">{record.lot.tct}</span>
              ) : (
                <span className="italic">No TCT</span>
              )}
            </p>
          </div>

          <div className="w-px shrink-0 bg-border-warm-subtle" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {record.buyer.name ?? 'Unassigned'}
            </p>
            <BuyerAddress address={record.buyer.address} className="mt-1.5" />
          </div>
        </div>

        <CallingCardRule />
        <SharedFacts record={record} />
      </div>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// C4 — Monogram-forward
// ---------------------------------------------------------------------------

/**
 * Both subjects get a real monogram at header scale — a pin for the lot,
 * initials for the buyer — and the band becomes two identity headers rather than
 * two blocks of text.
 *
 * The buyer's initials in a box are the single strongest signal that this column
 * is a *person*, which is the job the nested card was failing at: it rendered
 * the buyer as a name with no mark of their own. Here the buyer and the lot are
 * introduced the same way, at the same size, and the reader gets "two subjects"
 * before reading either one.
 *
 * The cost is height — measured at 168px against C1's 141px in the same 357px
 * cell, a 27px increase, most of it the larger monograms. It also spends the
 * buyer's first line on initials that repeat on every card for the same person,
 * which is worth less in a grid than it is in a dialog header.
 */
function C4({ record }: { record: ConceptRecord }) {
  const hasTct = Boolean(record.lot.tct);

  return (
    <BandCard record={record}>
      <div className="flex flex-1 flex-col p-3 pl-5">
        <div className="flex items-stretch gap-3">
          <div className="flex min-w-0 flex-1 gap-2">
            <IconBox variant="canvas" size="sm" shape="rounded-md" className="shrink-0">
              <MapPin className="h-3.5 w-3.5" />
            </IconBox>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {record.lot.projectArea ?? lotRef(record)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {record.lot.projectArea ? lotRef(record) : 'Property'}
              </p>
              <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <FileText className="h-3 w-3 shrink-0" />
                {hasTct ? (
                  <span className="font-mono text-foreground">{record.lot.tct}</span>
                ) : (
                  <span className="italic">No TCT</span>
                )}
              </p>
            </div>
          </div>

          <div className="w-px shrink-0 bg-border-warm-subtle" aria-hidden="true" />

          <div className="flex min-w-0 flex-1 gap-2">
            <IconBox variant="canvas" size="sm" shape="rounded-md" className="shrink-0 font-semibold">
              {initialsOf(record.buyer.name) || <UserRound className="h-3.5 w-3.5" />}
            </IconBox>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {record.buyer.name ?? 'Unassigned'}
              </p>
              <BuyerAddress address={record.buyer.address} className="mt-1" />
            </div>
          </div>
        </div>

        <CallingCardRule />
        <SharedFacts record={record} />
      </div>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// C5 — Per-column accent bars
// ---------------------------------------------------------------------------

/**
 * Each column opens with a short accent rule — blue over the lot, gold over the
 * buyer — echoing the card's own rail language at column scale.
 *
 * The rail tells you a card's domain from across the screen; these do the same
 * job one level down, so the split between "land" and "person" is legible before
 * any text is read. It is also the lightest treatment here: two 16px rules and
 * nothing else, so it costs no height and no width.
 *
 * The risk is that it competes with the rail itself. The card already has a blue
 * rail down its left edge; adding a gold bar inside it means the card carries
 * two domain colours at once, and at a glance the gold bar reads as strongly as
 * the rail. If the two are ever different lengths or the card's domain ever
 * changes, this is the treatment that breaks first.
 */
function C5({ record }: { record: ConceptRecord }) {
  const hasTct = Boolean(record.lot.tct);

  return (
    <BandCard record={record}>
      <div className="flex flex-1 flex-col p-3 pl-5">
        <div className="flex items-stretch gap-3">
          <div className="min-w-0 flex-1">
            <div className={cn('mb-2 h-0.5 w-4 rounded-full', LOT_RAIL)} aria-hidden="true" />
            <p className="truncate text-xs font-semibold text-foreground">
              {record.lot.projectArea ?? lotRef(record)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {record.lot.projectArea ? lotRef(record) : 'Property'}
            </p>
            <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              {hasTct ? (
                <span className="font-mono text-foreground">{record.lot.tct}</span>
              ) : (
                <span className="italic">No TCT</span>
              )}
            </p>
          </div>

          <div className="w-px shrink-0 bg-border-warm-subtle" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <div className={cn('mb-2 h-0.5 w-4 rounded-full', BUYER_RAIL)} aria-hidden="true" />
            <p className="truncate text-xs font-semibold text-foreground">
              {record.buyer.name ?? 'Unassigned'}
            </p>
            <BuyerAddress address={record.buyer.address} className="mt-1.5" />
          </div>
        </div>

        <CallingCardRule />
        <SharedFacts record={record} />
      </div>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// C6 — Banded header, structured body
// ---------------------------------------------------------------------------

/**
 * The band becomes a distinct header strip on a tinted surface, and the facts
 * move into a proper ruled field list below it: area and price on one row, TCT
 * on the next, each with the icon the shipped card uses.
 *
 * This is the treatment that adds the most. The tinted band does the labelling
 * work that C3 does with words — a header that is visibly a header needs no LOT
 * and BUYER captions — and the field list gives the shared facts the same shape
 * they have on the base cards, so a reader moving between a plain property card
 * and this one finds area, price and TCT in the same place and the same form.
 *
 * The cost is the tallest of the six: measured at 186px against C1's 141px in
 * the same 357px cell, a 45px increase, because the tinted band plus a two-row
 * field list is simply more card. Worth it only if the shared facts are things
 * staff actually read here — in a grid sorted by status they may not be.
 */
function C6({ record }: { record: ConceptRecord }) {
  const hasTct = Boolean(record.lot.tct);
  const hasArea = Boolean(record.lot.area);
  const total =
    hasArea && record.lot.pricePerSqm
      ? (record.lot.area as number) * record.lot.pricePerSqm
      : null;

  return (
    <BandCard record={record}>
      {/* The band, as a header strip on its own surface. */}
      <div
        className={cn(
          'flex items-stretch gap-3 border-b border-border-warm-subtle px-3 py-2.5 pl-5',
          LOT_TINT,
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {record.lot.projectArea ?? lotRef(record)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {record.lot.projectArea ? lotRef(record) : 'Property'}
          </p>
        </div>

        <div className="w-px shrink-0 bg-border-warm" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {record.buyer.name ?? 'Unassigned'}
          </p>
          <BuyerAddress address={record.buyer.address} className="mt-0.5" />
        </div>
      </div>

      {/* The facts, in the same ruled form the base cards use. */}
      <div className="flex flex-1 flex-col p-3 pl-5">
        <CallingCardFieldList>
          <div className="flex items-baseline gap-2">
            <span className="mt-0.5 shrink-0 text-muted-foreground">
              <Ruler className="h-3.5 w-3.5" />
            </span>
            <dt className="sr-only">Area and price</dt>
            <dd className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
              <span className={cn('shrink-0', hasArea ? 'font-medium text-foreground' : 'italic text-muted-foreground')}>
                {hasArea ? `${record.lot.area} sqm` : 'Area not recorded'}
              </span>
              <span className="ml-auto flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                </span>
                {total && record.lot.pricePerSqm ? (
                  <>
                    <span className="font-medium text-foreground">
                      {formatPriceAbbreviated(total)}
                    </span>
                    <span className="text-muted-foreground">
                      ({formatPricePerSqm(record.lot.pricePerSqm)})
                    </span>
                  </>
                ) : (
                  <span className="italic text-muted-foreground">Price not recorded</span>
                )}
              </span>
            </dd>
          </div>
          <CallingCardField
            icon={<FileText className="h-3.5 w-3.5" />}
            label="TCT"
            value={hasTct ? record.lot.tct : null}
            fallback="No TCT recorded"
            mono
          />
        </CallingCardFieldList>
      </div>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// C7 — Lot-weighted split, wrapping titles
// ---------------------------------------------------------------------------

/**
 * The columns stop being 50/50. The lot takes about 58% and the buyer 42%, and
 * the project area is allowed two lines instead of one.
 *
 * This is the answer to the measurement that condemns the other six: at 357px
 * the project area — the card's title, and the thing staff identify a lot by —
 * is truncated in every one of them, and at 1024px every variant cuts the city
 * off it. A 50/50 split gives the lot 149px, which is not enough for
 * "Brgy. Talomo, Davao City", let alone the stress case's four-line address.
 *
 * Weighting the split is defensible on the data, not just on taste: the lot is
 * the record both grids index and sort by, and the buyer is a fact about it. The
 * cost lands entirely on the buyer column, which drops to roughly 130px and
 * clamps its address harder than any other variant. If the buyer's address is
 * the thing you most need to read, this is the wrong trade — but then the split
 * should be weighted the other way, not left even.
 */
function C7({ record }: { record: ConceptRecord }) {
  const hasTct = Boolean(record.lot.tct);

  return (
    <BandCard record={record}>
      <div className="flex flex-1 flex-col p-3 pl-5">
        <div className="flex items-stretch gap-3">
          {/* Weighted toward the lot: the project area is the card's title. */}
          <div className="min-w-0 flex-[1.45]">
            <p className="line-clamp-2 text-xs font-semibold text-foreground">
              {record.lot.projectArea ?? lotRef(record)}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {record.lot.projectArea ? lotRef(record) : 'Property'}
            </p>
            <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              {hasTct ? (
                <span className="font-mono text-foreground">{record.lot.tct}</span>
              ) : (
                <span className="italic">No TCT</span>
              )}
            </p>
          </div>

          <div className="w-px shrink-0 bg-border-warm-subtle" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <IconBox variant="canvas" size="xs" shape="rounded-md" className="shrink-0 font-semibold">
                {initialsOf(record.buyer.name) || <UserRound className="h-3 w-3" />}
              </IconBox>
              <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                {record.buyer.name ?? 'Unassigned'}
              </span>
            </div>
            <BuyerAddress address={record.buyer.address} className="mt-1.5" />
          </div>
        </div>

        <CallingCardRule />
        <SharedFacts record={record} />
      </div>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * A thin reference for the two base cards, at the tier the grids use, so the
 * pieces the combos are built from stay visible without a section each.
 */
function BaseReference() {
  return (
    <Section
      title="The building blocks"
      description="The two cards the split band is assembled from, at the tier the grids use. Kept here only so the pieces stay legible."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ClientCallingCard
          client={{
            client_id: 'client-1',
            full_name: 'Maria Santos',
            address: '12 Rizal Street, Brgy. Talomo, Davao City',
            tin_number: '123-456-789',
            contact_info: CONTACTS,
          }}
          tier="default"
        />
        <PropertyCallingCard
          property={{
            property_id: 'prop-1',
            block_number: 4,
            lot_number: 12,
            location: 'Brgy. Talomo, Davao City',
            title_number: '12-3456',
            area_size: 150,
            price_per_sqm: 6500,
          }}
          tier="default"
        />
      </div>
    </Section>
  );
}

const VARIANTS = [
  {
    id: 'C1',
    title: 'C1 — The control',
    description: 'Two plain columns, a hairline between them, the shared facts on one line below. Nothing added.',
    axis: 'baseline',
    Component: C1,
    note: 'Every treatment below is measured against this, at 217px tall in the 357px cell. Its job is to stay boring — the band’s own structure does the work, since the buyer is already at full strength with their own initials and their own address. What it does not solve: the lot’s project area and the buyer’s address are both addresses, in the same type at the same size, one column apart, and nothing says which is which. It also shares a flaw with five of the others — at 149px the lot column cannot fit the project area, so the card’s own title is truncated at every width.',
  },
  {
    id: 'C2',
    title: 'C2 — Two tinted panels',
    description: 'The rule becomes a gap: each subject gets a pale panel, cool for the lot and warm for the buyer.',
    axis: 'surface',
    Component: C2,
    note: 'The cheapest way to make the band read as two things rather than one column of text with a line through it, and it separates the two addresses by putting them on different surfaces. The buyer owns a panel here for the first time. The cost: 11px of height from the panel padding, three surfaces stacked in one card, and in the stress case a pale empty rectangle that draws the eye to exactly the record with nothing to show.',
  },
  {
    id: 'C3',
    title: 'C3 — Labelled columns',
    description: 'A header row — LOT over the left, BUYER over the right — with the rule running through both so it reads as one table.',
    axis: 'labelling',
    Component: C3,
    note: 'The direct answer to the two-addresses problem: once the columns are labelled, the reader knows before reading a word that the left address belongs to the land and the right to the person. It also makes the grid scannable down a column. The cost is 26px — the tallest of the seven apart from C6 — for a row carrying two words, repeated on every card in the grid. On a card the reader already knows, it is noise.',
  },
  {
    id: 'C4',
    title: 'C4 — Monogram-forward',
    description: 'Both subjects get a real monogram at header scale: a pin for the lot, initials for the buyer.',
    axis: 'identity',
    Component: C4,
    note: 'The buyer’s initials in a box are the strongest available signal that this column is a person, which is exactly what the nested card failed at — it rendered the buyer as a name with no mark of their own. It is also the shortest of the seven, measured at 207px against C1’s 217px, because the monogram column is paid for out of text width rather than height. That is the catch: it costs 36px of column, and the project area loses more here than anywhere else — at 1024px the lot shows only “Brgy. Talomo,” and cuts the city. It is the only variant that gets shorter, and the only one that visibly mangles the card’s own title.',
  },
  {
    id: 'C5',
    title: 'C5 — Per-column accent bars',
    description: 'Each column opens with a short accent rule — blue over the lot, gold over the buyer — echoing the card’s rail at column scale.',
    axis: 'accent',
    Component: C5,
    note: 'The lightest treatment here: two 16px rules costing 4px of height and no width at all, and the land/person split is legible before any text is read. The risk is that it competes with the rail itself — the card already carries a blue rail down its left edge, so adding a gold bar inside means two domain colours at once, and at a glance the gold bar reads as strongly as the rail.',
  },
  {
    id: 'C7',
    title: 'C7 — Lot-weighted split, wrapping titles',
    description: 'The columns stop being 50/50 — the lot takes about 58% — and the project area gets two lines instead of one.',
    axis: 'proportion',
    Component: C7,
    note: 'The answer to the measurement that condemns the other six. Measured: at 1280px this is the only variant whose project area is whole for both the billing and the legal record, and at 1024px it is the only one that keeps it whole at all. It costs nothing in height at 1280px and 10px at 1024px. The cost lands entirely on the buyer column, which drops to about 130px — the billing address still fits, the longer legal one still loses its city, and the stress case’s long address loses its tail. The trade is a choice about which subject the card is for.',
  },
  {
    id: 'C6',
    title: 'C6 — Banded header, structured body',
    description: 'The band becomes a tinted header strip, and the facts move into a ruled field list below it: area and price, then TCT.',
    axis: 'structure',
    Component: C6,
    note: 'The treatment that adds the most. The tinted band does C3’s labelling work without words, and the field list gives the shared facts the same shape they have on the base cards, so area, price and TCT sit in the same place and the same form as on a plain property card. Cost: the tallest of the seven — measured at 235px against C1’s 217px in the same 357px cell, an 18px increase.',
  },
] as const;

export default function CallingCardsConceptPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Split-band combo — design variations
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            The layout is settled: lot and buyer side by side in one band, one
            rule between them, shared facts below, one status bar at the bottom.
            These are six treatments of that same band. The buyer side now shows
            the buyer&apos;s address rather than a contact number — which puts two
            addresses one column apart, and is the risk C3 and C6 are built to
            answer.
          </p>
        </header>

        <BaseReference />

        {VARIANTS.map(({ id, title, description, axis, Component, note }) => (
          <Section key={id} title={title} description={description}>
            <Variation label={id} axis={axis} note={note}>
              {RECORDS.map((record) => (
                <Cell key={record.kind} record={record}>
                  <Component record={record} />
                </Cell>
              ))}
            </Variation>
          </Section>
        ))}

        <Section
          title="What the choice comes down to"
          description="All seven are the same band. They differ in how much design is layered on it, and what that design costs."
        >
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">The finding that matters most:</strong>{' '}
              at the 357px cell the billing and legal grids actually produce, the
              project area is truncated in six of the seven variants, and at 1024px
              six of them cut the city off it. That is the card&apos;s own title —
              the thing staff identify a lot by — losing to a layout decision. C7
              is the only variant where it survives, because it is the only one
              that stops giving the lot and the buyer equal width.
            </p>
            <p>
              <strong className="text-foreground">On height:</strong> measured in
              the same 357px cell, C4 is 207px, C1 217px, C5 221px, C7 227px at
              1024px, C2 228px, C6 235px and C3 243px. The spread is 36px, and C4
              is shorter than the control — it pays for its monograms out of
              column width instead of height, which is why it also mangles the
              title worst.
            </p>
            <p>
              <strong className="text-foreground">On the two addresses:</strong>{' '}
              C3 labels the columns, C6 tints the band so it reads as a header,
              and the rest leave the ambiguity in place. C2 and C5 separate the
              columns by colour instead of words, which works only as long as the
              reader has learned that blue is land and gold is a person.
            </p>
            <p>
              <strong className="text-foreground">On the family:</strong> C2 and
              C5 push hardest against the existing rail. The card already carries
              a domain colour down its left edge; adding gold inside it means the
              card shows both domains at once, and the rail stops being a
              reliable signal.
            </p>
            <p>
              The buyer&apos;s address is clamped to two lines in every variant,
              with the full text on the <code>title</code> attribute. Two lines is
              enough for the billing address at 1280px but not for the longer
              legal one at 1024px — so whichever treatment is picked, the address
              column needs checking at 1024px specifically, not just at the
              widest layout.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
