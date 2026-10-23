'use client';

import { useState } from 'react';
import { Check, ClipboardCheck, FileText, PenLine, Wallet } from 'lucide-react';
import { ClientCallingCard } from '@/components/dashboard-clients/client-calling-card';
import { PropertyCallingCard } from '@/components/dashboard-properties/property-calling-card';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { clientCardStatus } from '@/lib/utils/client-card-status';
import { TitleRecordCard } from '@/components/dashboard-titles/title-record-card';
import type { ContactInfo } from '@/lib/types/client';
import type { LandTitle } from '@/lib/types/title';

/**
 * Preview for the calling cards.
 *
 * The decisions this page records: the icon watermark is the one in use at
 * every tier, the compact tier fits the title dialog's header, and every card
 * carries a bottom status bar whose single contextual slot says whatever the
 * caller's domain considers actionable — a packet count, a balance, a clearance
 * deadline, or a client's latest activity. Every card is also a link to the
 * record it stands for, derived from the id it was handed.
 *
 * It also exists to show how each card degrades when optional fields are
 * absent, which is still the normal case in the app.
 */

const FULL_CONTACTS: ContactInfo[] = [
  {
    contact_id: 'c1',
    client_id: 'client-1',
    type: 'Email',
    value: 'maria.santos@example.com',
    is_primary: false,
    last_updated: '2026-01-04T00:00:00Z',
  },
  {
    contact_id: 'c2',
    client_id: 'client-1',
    type: 'Mobile',
    value: '+63 917 555 0144',
    is_primary: true,
    last_updated: '2026-01-04T00:00:00Z',
  },
];

const FULL_CLIENT = {
  client_id: 'client-1',
  full_name: 'Maria Santos',
  status: 'Active',
  address: '12 Rizal Street, Brgy. Talomo, Davao City',
  tin_number: '123-456-789',
  civil_status: 'Married',
  spouse_name: 'Ramon Santos',
  contact_info: FULL_CONTACTS,
};

const SPARSE_CLIENT = {
  client_id: 'client-2',
  full_name: 'Jose Dela Cruz',
  status: 'Active',
  address: null,
  tin_number: null,
  contact_info: [],
};

const ARCHIVED_CLIENT = {
  client_id: 'client-3',
  full_name: 'Ana Reyes',
  status: 'Archived',
  address: 'Brgy. Buhangin, Davao City',
  tin_number: '987-654-321',
  contact_info: [FULL_CONTACTS[1]],
};

const FULL_PROPERTY = {
  property_id: 'prop-1',
  block_number: 4,
  lot_number: 12,
  location: 'Brgy. Talomo, Davao City',
  status: 'Sold',
  title_number: '12-3456',
  area_size: 150,
};

const SPARSE_PROPERTY = {
  property_id: 'prop-2',
  block_number: 7,
  lot_number: 3,
  location: null,
  status: 'Open',
  title_number: null,
  area_size: null,
};

const RESERVED_PROPERTY = {
  property_id: 'prop-3',
  block_number: 2,
  lot_number: 8,
  location: 'Brgy. Calinan, Davao City',
  status: 'Reserved',
  title_number: null,
  area_size: 210,
};

/** The realistic worst case for the header: a long project area and a long name. */
const LONG_AREA_PROPERTY = {
  ...FULL_PROPERTY,
  property_id: 'prop-4',
  block_number: 14,
  lot_number: 27,
  location: 'Brgy. Sto. Niño, Phase 2 Extension, Davao del Sur',
};

const LONG_NAME_CLIENT = {
  ...FULL_CLIENT,
  client_id: 'client-4',
  full_name: 'Maria Concepcion Villanueva-Santos',
};

/**
 * The client card's contextual slot, resolved exactly the way the real grid
 * resolves it — through `clientCardStatus`, not by hand. If the mapping changes
 * these follow automatically, which is the point of rendering it here rather
 * than describing it.
 *
 * Timestamps are fixed rather than relative to now: the page is server-rendered
 * and then hydrated, and a `Date.now()` at module scope would render two
 * different strings and trip a hydration mismatch.
 */
const CLIENT_ACTIVITY_STATUS = clientCardStatus({
  missingProfile: [],
  missingDocuments: [],
  latestActivity: {
    description: 'Updated contact details',
    time: '2026-10-20T14:30:00Z',
    performer_name: 'Kelly Ang',
  },
});

const CLIENT_ATTENTION_STATUS = clientCardStatus({
  missingProfile: ['TIN number'],
  missingDocuments: ['Title Copy'],
  latestActivity: {
    description: 'Updated contact details',
    time: '2026-10-20T14:30:00Z',
    performer_name: 'Kelly Ang',
  },
});

const CLIENT_EMPTY_STATUS = clientCardStatus({
  missingProfile: [],
  missingDocuments: [],
  latestActivity: null,
});

/**
 * A legal record for the grid section. Deliberately a real `LandTitle` rather
 * than a trimmed object, so `TitleRecordCard` computes its packet progress and
 * status detail from the same inputs it gets in production.
 */
const TITLE_RECORD: { type: 'title'; data: LandTitle } = {
  type: 'title',
  data: {
    title_id: 'title-1',
    property_id: 'prop-1',
    client_id: 'client-1',
    status: 'Document Preparation',
    is_legacy_transferred: false,
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-10-18T00:00:00Z',
    client: {
      client_id: 'client-1',
      full_name: 'Maria Santos',
      status: 'Active',
      address: '12 Rizal Street, Brgy. Talomo, Davao City',
      tin_number: '123-456-789',
      contact_info: FULL_CONTACTS,
      documents: [
        { document_type: 'Valid ID', property_id: 'prop-1' },
        { document_type: 'Contract', property_id: 'prop-1' },
      ],
    },
    property: {
      property_id: 'prop-1',
      location: 'Brgy. Talomo, Davao City',
      block_number: 4,
      lot_number: 12,
      title_number: '12-3456',
      area_size: 150,
      status: 'Sold',
    },
  },
};

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

const WORKFLOW = [
  { short: 'Payment', Icon: Wallet },
  { short: 'Preparation', Icon: FileText },
  { short: 'Verification', Icon: ClipboardCheck },
  { short: 'Signature', Icon: PenLine },
  { short: 'Release', Icon: Check },
];

/**
 * A stand-in for the title dialog's header. Reproduces the real constraints:
 * the same max-widths, the same padding, and a workflow strip on the right that
 * does not yield space. If a card fits here, it fits in the dialog.
 *
 * The badge shares the same `flex flex-wrap` row as the cards, exactly as the
 * real dialog does it — no separate placement prop, because the row is what
 * moves it. At xl the strip's step labels take enough width that the widest
 * badge is 15px short of fitting and drops to its own line; below xl those
 * labels hide and it fits with nothing to spare. See the measured notes under
 * this section.
 *
 * Caveat: `maxWidth` fakes the container width but cannot fake the viewport, so
 * the responsive classes inside (`hidden xl:inline` on the workflow labels, the
 * `lg:` prefixes) still key off the real window. Only the 1152px case is
 * trustworthy here; the below-xl behaviour is described in prose instead.
 */
function MockDialogHeader({
  children,
  maxWidth,
}: {
  children: React.ReactNode;
  /**
   * Set to the real dialog's cap to prove the header at its widest. Passing this
   * also bleeds the mock out of the preview card's padding, because the section
   * it sits in is itself narrower than the dialog — 1102px against 1152px. That
   * 50px straddles the exact width where the cards stop wrapping, so measuring
   * without the bleed would show a two-row header where the real dialog shows
   * one, i.e. it would understate the fit.
   */
  maxWidth?: string;
}) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card', maxWidth && '-mx-6')}
      style={maxWidth ? { maxWidth } : undefined}
    >
      {/* Padding and gaps copied verbatim from `title-dialog.tsx`: DialogHeader
          is `px-5 py-3 pr-12 sm:px-6 sm:pr-14` and the row is `gap-2.5`. These
          few pixels decide whether the cards wrap, so approximating them would
          make the whole measurement meaningless. */}
      <div className="flex flex-col gap-2.5 px-5 py-3 pr-12 sm:px-6 sm:pr-14 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {children}
          <Badge variant="info" shape="pill" dot className="shrink-0 text-xs">
            Document Preparation
          </Badge>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 lg:items-end">
          <ol className="flex items-center gap-1.5">
            {WORKFLOW.map((step, i) => (
              <li key={step.short} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs',
                    i === 0 && 'bg-row-hover font-medium text-success',
                    i === 1 && 'bg-sidebar-accent font-semibold text-primary ring-1 ring-primary',
                    i > 1 && 'text-muted-foreground opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]',
                      i === 0 && 'bg-success text-success-foreground',
                      i === 1 && 'bg-primary font-bold text-primary-foreground',
                      i > 1 && 'border border-border text-muted-foreground',
                    )}
                  >
                    {i === 0 ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : i + 1}
                  </span>
                  <span className="hidden xl:inline">{step.short}</span>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <span className="select-none text-xs text-border">›</span>
                )}
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-muted-foreground">
            Legal compiling buyer file and turnover documents
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CallingCardsPage() {
  const [tier, setTier] = useState<'compact' | 'default' | 'lg'>('default');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Calling cards — preview
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Gold rail + seal = client. Blue rail + plat grid = property. Hover a
            compact card to reveal the fields it cannot show itself; click any
            card to open the record it stands for.
          </p>
        </header>

        <Section
          title="1. Watermark — decided: the icon"
          description="The icon watermark is now the default at every tier, so nothing below passes a `watermark` prop to get it. It won because it is legible as a shape at a glance and needs no explaining; the drawn textures carried more character but only registered when you already knew to look. Shown here at all three tiers so the scaling is on the record."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {(['compact', 'default', 'lg'] as const).map((tier) => (
              <div key={tier} className="min-w-0 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tier}
                </p>
                <ClientCallingCard client={FULL_CLIENT} tier={tier} />
                <PropertyCallingCard property={FULL_PROPERTY} tier={tier} />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border-warm-subtle bg-row-hover p-3">
            <p className="text-xs font-medium text-foreground">
              For the record: the drawn motifs, now unused in the app
            </p>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <ClientCallingCard client={FULL_CLIENT} tier="default" watermark="motif" />
              <PropertyCallingCard property={FULL_PROPERTY} tier="default" watermark="motif" />
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              Still reachable with <code>watermark=&quot;motif&quot;</code>, and
              still the thing to compare against if the icon ever stops reading.
              Because nothing in the app passes it any more, the two drawn
              variants in <code>card-motif.tsx</code> are dead weight and can be
              deleted whenever you want the lines back.
            </p>
          </div>
        </Section>

        <Section
          title="2. The three tiers"
          description="compact is not a scaled-down default — it is a different trade. The client card keeps two rows (identity, then a way to reach them); the property card keeps three (the lot, its project area, its TCT), because a title number is read out loud rather than looked up. The rest goes behind a hover. Use the toggle to see them in sequence."
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Tier</span>
            {(['compact', 'default', 'lg'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTier(option)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs',
                  tier === option
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'border border-border-warm bg-card font-medium text-muted-foreground hover:bg-row-hover',
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ClientCallingCard client={FULL_CLIENT} tier={tier} />
            <PropertyCallingCard property={FULL_PROPERTY} tier={tier} />
          </div>

          <div className="rounded-lg border border-border-warm-subtle bg-row-hover p-3">
            <p className="text-xs font-medium text-foreground">
              Every card is a link to its own record
            </p>
            <p className="pt-1 text-xs text-muted-foreground">
              The card derives its destination from the id it was handed — a
              client goes to <code>/dashboard/clients/&#123;id&#125;</code>, a lot
              to <code>/dashboard/properties/map?lot=&#123;id&#125;</code> — so
              &quot;a client card opens the client&quot; is a property of the
              family rather than a line every caller has to remember. The card{' '}
              <em>is</em> the anchor: an extra wrapper element would take the flex
              slot the compact tier&apos;s <code>flex-1</code> and{' '}
              <code>self-stretch</code> were measured against, which is why{' '}
              <code>Card</code> grew the <code>asChild</code> escape hatch{' '}
              <code>Button</code> already had.
            </p>
            <div className="grid gap-3 pt-3 sm:grid-cols-3">
              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Links (the default)
                </p>
                <ClientCallingCard client={FULL_CLIENT} tier="compact" />
                <p className="text-[11px] text-muted-foreground">
                  → <code>/dashboard/clients/client-1</code>
                </p>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Inert — <code>href=&#123;null&#125;</code>
                </p>
                <ClientCallingCard client={FULL_CLIENT} tier="compact" href={null} />
                <p className="text-[11px] text-muted-foreground">
                  Not a link and no pointer cursor, but the reveal still works.
                </p>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Embedded
                </p>
                <div className="rounded-lg border border-border-warm bg-card p-2">
                  <ClientCallingCard client={FULL_CLIENT} tier="compact" embedded />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The parent supplies the chrome and owns the click, so an
                  embedded card is never a link.
                </p>
              </div>
            </div>
            <p className="pt-3 text-xs text-muted-foreground">
              The fixtures on this page carry placeholder ids, so their links
              resolve to a not-found here; in the app they open the real record.
              Clicking a compact card in the title dialog header navigates out of
              the dialog.
            </p>
          </div>
        </Section>

        <Section
          title="3. Compact in the title dialog header"
          description="Compact is three rows: the lot, its project area, its TCT. It trades height for width, and the ellipsis sends long values to the hover reveal instead of forcing the card wider. Each header below reproduces the dialog's exact max-width and padding, so what you see is what the dialog does."
        >
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              At the dialog&apos;s widest (xl:max-w-6xl = 1152px)
            </p>
            <MockDialogHeader maxWidth="1152px">
              <PropertyCallingCard property={FULL_PROPERTY} tier="compact" />
              <ClientCallingCard client={FULL_CLIENT} tier="compact" />
            </MockDialogHeader>
            <p className="text-xs text-muted-foreground">
              At xl and above the workflow strip shows its step labels
              (<code>hidden xl:inline</code>), which leaves the cards and badge a{' '}
              <strong>522px</strong> column — and the widest case needs{' '}
              <strong>537px</strong>: two cards at their 11rem floor (176px each),
              two 8px gaps, and the 169px <em>Document Preparation</em> badge.
              It is <strong>15px short</strong>, so that badge takes its own line
              and the header is <strong>119px</strong> instead of 89px. Measured
              across the real records, this bites on <strong>3 of 10</strong> —
              every one of them <em>Document Preparation</em>. The narrower badges
              fit fine: &quot;Released&quot; is 91px and &quot;Clearance
              Period&quot; 138px. No markup change was needed to relocate it; it
              already shares a <code>flex-wrap</code> row with the cards.
            </p>
          </div>

          <div className="rounded-lg border border-border-warm-subtle bg-row-hover p-3">
            <p className="text-xs font-medium text-foreground">
              Below xl the badge comes back inline — and the cards never stack
            </p>
            <p className="pt-1.5 text-xs text-muted-foreground">
              This one cannot be shown here honestly, so it is described instead.
              Dropping below xl hides the workflow strip&apos;s step labels, the
              strip narrows, and the column grows from <strong>522px</strong> to{' '}
              <strong>537px</strong> — precisely the 537px that the worst case
              needs, so the <em>Document Preparation</em> badge lands inline with{' '}
              <strong>zero slack</strong>. Swept on real records: at{' '}
              <strong>1152</strong>, <strong>1024</strong>, <strong>900</strong>{' '}
              and <strong>768</strong> the badge is inline and the header a
              constant 89px. The two cards stay <strong>side by side at every one
              of those widths</strong> — never stacked, at 176px, 294px or 231px
              depending on the width. A <code>maxWidth</code> override here would
              lie, because the mock&apos;s responsive classes key off the real
              viewport: at 1600px wide it would show inline cards while claiming
              to be 973px.
            </p>
            <p className="pt-1.5 text-xs text-muted-foreground">
              The cards&apos; <code>min-w-[11rem]</code> floor is what sets both
              of these numbers, so it is kept deliberately. Forcing{' '}
              <code>minWidth: 0</code> collapses the cards to 139px and pulls the
              badge inline at xl too — but swept against the real records, 10rem
              starts clipping the TCT (<code>T-121212121</code> loses 6px) and
              9.5rem clips it by more. A title number staff read out loud is worth
              more than one stage&apos;s badge staying on the first line, so the
              floor stays and that badge wraps.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              When the project area and the name are long (real data)
            </p>
            <MockDialogHeader maxWidth="1152px">
              <PropertyCallingCard property={LONG_AREA_PROPERTY} tier="compact" />
              <ClientCallingCard client={LONG_NAME_CLIENT} tier="compact" />
            </MockDialogHeader>
            <p className="text-xs text-muted-foreground">
              The realistic failure case. Both values ellipsize rather than
              forcing the cards wider or pushing the workflow strip, and hovering
              either card gives the full text — which is the reason the reveal
              panel exists.
            </p>
          </div>

          <div className="rounded-lg border border-border-warm-subtle bg-row-hover p-3">
            <p className="text-xs font-medium text-foreground">
              For reference, what the old chips cost in the same slot
            </p>
            <div className="pt-2">
              <MockDialogHeader maxWidth="1152px">
                <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-row-hover px-2.5 py-1.5 text-xs font-semibold text-foreground">
                  Block 4 Lot 12
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-row-hover px-2.5 py-1.5 text-xs font-semibold text-foreground">
                  Maria Santos
                </span>
              </MockDialogHeader>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              The honest cost, measured on these two mocks: a chip is{' '}
              <strong>30px</strong> tall and a compact card <strong>88px</strong>,
              taking the header box from <strong>66px to 144px</strong> — 78px
              more. The chips are far narrower too: <strong>213px</strong> for the
              pair against <strong>504px</strong> for the cards. So this is a real
              trade rather than a free win — 78px of height and 291px of width,
              bought back as a project area and a TCT that staff would otherwise
              have to open the record to find. The chips also carried no status at
              all, which is the thing the bottom bar now solves.
            </p>
          </div>
        </Section>

        <Section
          title="4. Directory grid density"
          description="Client cards at lg, with property cards mixed in — this is the grid list the cards are headed for, so every card carries its status bar. The client cards no longer show the account status: 'Active' was true of nearly every row and cost a band to say nothing. They show the latest activity instead, and a record needing attention takes that same slot. Hover any card — they lift, because in the real grid they navigate."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ClientCallingCard
              client={FULL_CLIENT}
              tier="lg"
              status={CLIENT_ACTIVITY_STATUS}
              onClick={() => {}}
            />
            <ClientCallingCard
              client={SPARSE_CLIENT}
              tier="lg"
              status={CLIENT_ATTENTION_STATUS}
              onClick={() => {}}
            />
            <ClientCallingCard
              client={ARCHIVED_CLIENT}
              tier="lg"
              status={CLIENT_EMPTY_STATUS}
              onClick={() => {}}
            />
            <PropertyCallingCard
              property={FULL_PROPERTY}
              tier="lg"
              status={{ label: 'Sold', tone: 'warning' }}
              onClick={() => {}}
            />
            <PropertyCallingCard
              property={SPARSE_PROPERTY}
              tier="lg"
              status={{ label: 'Open', tone: 'success' }}
              onClick={() => {}}
            />
            <PropertyCallingCard
              property={RESERVED_PROPERTY}
              tier="lg"
              status={{ label: 'Reserved', tone: 'info' }}
              onClick={() => {}}
            />
          </div>
        </Section>

        <Section
          title="5. Degraded state"
          description="Rows never collapse: a missing field prints an explicit placeholder, because a silently-dropped row makes an absent field indistinguishable from a broken query — which is exactly how the missing contact_info join went unnoticed. This is what the cards look like in the app today."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ClientCallingCard client={SPARSE_CLIENT} tier="default" className="border-dashed" />
            <PropertyCallingCard property={SPARSE_PROPERTY} tier="default" className="border-dashed" />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="warning" shape="pill" dot>
              Dashed border = nothing on file
            </Badge>
            <span className="text-xs text-muted-foreground">
              In the real grid these render solid; the dashes only flag which pair
              is the empty one.
            </span>
          </div>
        </Section>

        <Section
          title="6. The bottom status bar, in both domains"
          description="One card, three domains. The bar's colour comes from whichever status map the caller resolved — property, title, or billing — and the single detail slot carries the fact that makes the status actionable. Every detail below is a string the app already computes: percentPaid from billing-account-card, the clearance window and packet counts from title-record-card, and the notice vocabulary shared with title-timeline-view."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Property grid — lot status, no detail
              </p>
              <PropertyCallingCard
                property={FULL_PROPERTY}
                tier="lg"
                status={{ label: 'Sold', tone: 'warning' }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Billing — balance and progress
              </p>
              <PropertyCallingCard
                property={FULL_PROPERTY}
                tier="lg"
                status={{
                  label: 'Delinquent',
                  tone: 'destructive',
                  detail: '42% paid of ₱1,800,000.00',
                  trailing: '₱18,500.00/mo',
                  progress: 42,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Legal — packet progress
              </p>
              <PropertyCallingCard
                property={FULL_PROPERTY}
                tier="lg"
                status={{
                  label: 'Document Preparation',
                  tone: 'muted',
                  detail: 'Release packet complete (5/5)',
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Legal — clearance window
              </p>
              <PropertyCallingCard
                property={RESERVED_PROPERTY}
                tier="lg"
                status={{
                  label: 'Clearance Period',
                  tone: 'info',
                  detail: '18 days remaining',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Legal — documents missing
              </p>
              <PropertyCallingCard
                property={RESERVED_PROPERTY}
                tier="lg"
                status={{
                  label: 'For Signature',
                  tone: 'warning',
                  detail: '3 of 5 documents',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Legal — notice returned to sender
              </p>
              <PropertyCallingCard
                property={RESERVED_PROPERTY}
                tier="lg"
                status={{
                  label: 'Ready for Claim',
                  tone: 'warning',
                  detail: 'Final notice returned to sender',
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Clients grid — the contextual slot
            </p>
            <p className="text-xs text-muted-foreground">
              Three states of the same slot, all three produced by calling{' '}
              <code>clientCardStatus()</code> with different inputs rather than
              written by hand — so what you see is what the grid will render.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Nothing outstanding — latest activity
                </p>
                <ClientCallingCard
                  client={FULL_CLIENT}
                  tier="lg"
                  status={CLIENT_ACTIVITY_STATUS}
                  onClick={() => {}}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Incomplete record — attention takes the slot
                </p>
                <ClientCallingCard
                  client={SPARSE_CLIENT}
                  tier="lg"
                  status={CLIENT_ATTENTION_STATUS}
                  onClick={() => {}}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Nothing on file at all
                </p>
                <ClientCallingCard
                  client={ARCHIVED_CLIENT}
                  tier="lg"
                  status={CLIENT_EMPTY_STATUS}
                  onClick={() => {}}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Attention wins the slot rather than sharing it, because a missing
              TIN is something staff have to chase and an activity line is only
              ever context. The rows never collapse: a client with no activity
              prints &quot;No activity logged&quot; instead of losing the band,
              so an empty record is distinguishable from a broken query — the
              same rule the degraded-state section below applies to fields.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            The bar is a sibling of the card&apos;s padded body rather than a row
            inside it, so it reaches the card&apos;s full width and sits flush
            against the bottom edge — a column of cards then reads as a banded
            list. There is one status slot per card by design: a card showing a
            lot status and a billing status at once would be ambiguous about
            which it meant.
          </p>
        </Section>

        <Section
          title="7. The legal record card, and the embedded variant"
          description="One legal record is two subjects — a lot and a buyer — so the card is the pair plus a banded footer, the same composition as the title dialog's header. The two inner cards are `embedded`: no border, no rounding, no shadow, no hover panel, and no focus stop, because the outer card is already the click target and a nested bordered card advertised a second one that did nothing."
        >
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              At the real grid cell widths
            </p>
            <div className="flex flex-wrap items-start gap-6">
              {[
                { w: 405, note: '1600px viewport — side by side, 147px' },
                { w: 351, note: '1440px viewport — stacked, 220px' },
              ].map(({ w, note }) => (
                <div key={w} className="space-y-1.5" style={{ width: w }}>
                  <p className="text-[11px] text-muted-foreground">{note}</p>
                  <TitleRecordCard item={TITLE_RECORD} onClick={() => {}} />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              These are the real component at the real cell widths, not a mock —
              so the crossover is the actual one. The pair needs 360px of content
              box: two cards at their <code>min-w-[11rem]</code> floor plus an 8px
              gap. A 386px cell is the exact threshold, and at a 900px viewport
              the cell is 385px — one pixel short, so it stacks there too.
            </p>
          </div>

          <div className="rounded-lg border border-border-warm-subtle bg-row-hover p-3">
            <p className="text-xs font-medium text-foreground">
              Why the inner cards are not clickable
            </p>
            <p className="pt-1.5 text-xs text-muted-foreground">
              Two bordered cards inside a bordered card read as three things to
              click, and only one of them did anything. <code>embedded</code>
              keeps the rail and the watermark — so the gold/blue domain split
              survives — and drops everything that promises an interaction: the
              border, the rounding, the shadow, the hover reveal and the tab
              stop. The result is one document with two labelled sections rather
              than cards inside a card.
            </p>
          </div>
        </Section>

        <Section
          title="8. Elevation"
          description="The cards were flat for two reasons. First, the resting shadow was `shadow-sm` — five percent black at one pixel, invisible on the beige canvas. Second, the hover lift was gated on `onClick`, so a compact card with a reveal panel hovered dead. The lift now follows the affordance: a card that opens a panel or takes a click rises, and an embedded one does not."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { cls: 'shadow-none', note: 'shadow-none' },
              { cls: 'shadow-sm', note: 'shadow-sm — current resting' },
              { cls: 'shadow', note: 'shadow — one step up' },
              { cls: 'shadow-md', note: 'shadow-md — current hover' },
            ].map(({ cls, note }) => (
              <div key={cls} className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {note}
                </p>
                <ClientCallingCard
                  client={FULL_CLIENT}
                  tier="default"
                  status={CLIENT_ACTIVITY_STATUS}
                  className={cls}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Hover any card in the grid sections above to see the lift. The
            resting level is the open question here — say which of these four you
            want and it becomes the <code>calling-card</code> variant&apos;s
            default, rather than something each caller passes.
          </p>
          <div className="rounded-lg border border-border-warm-subtle bg-row-hover p-3">
            <p className="text-xs font-medium text-foreground">
              Separately: <code>shadow-xs</code> was compiling to nothing
            </p>
            <p className="pt-1.5 text-xs text-muted-foreground">
              Tailwind 3 stops at <code>shadow-sm</code> — there is no{' '}
              <code>xs</code> in the scale, so the class silently produced no CSS
              in five places: the <code>canvas</code> variants of Card and
              Button, <code>CardStickyHeader</code>, the filter toolbar, and a map
              badge. Those elements were rendering with no shadow at all. An{' '}
              <code>xs</code> step is now defined in{' '}
              <code>tailwind.config.ts</code>, which is why the buttons and sticky
              headers on this page gained a shadow. Worth knowing that it changed
              surfaces outside the cards.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
