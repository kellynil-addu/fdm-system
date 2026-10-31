'use client';

import { Suspense, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { SessionProvider } from '@/lib/hooks/use-session';
import { LandTitlesProvider, type TitleDialogItem } from '@/lib/hooks/use-land-titles';
import type { TitleStatus } from '@/lib/types/title';
import {
  AWAITING_ACCOUNT,
  F3_DOCUMENTS,
  FIXTURE_AWAITING,
  FIXTURE_LABELS,
  FIXTURE_SESSION,
  FIXTURE_TITLES,
} from './fixtures';
import {
  DirectionD1,
  DirectionD2,
  DirectionD3,
  DirectionD4,
  DirectionShipping,
  type DirectionProps,
} from './directions';

/**
 * Title dialog — design variations.
 *
 * Five stage pages inside one dialog, and the functionality is already right.
 * What is being chosen here is presentation only: how the header carries the
 * workflow, how the left rail shows where the record is, and how the stage page
 * frames its sections.
 *
 * Three axes, chosen independently — A (header), B (rail), C (content frame):
 *
 *   D1  A1 · B1(control) · C1(control)   the conservative direction
 *   D2  A3 · B3          · C2            the dense direction
 *   D3  A2 · B4          · C3            the roomy direction
 *   D4  A2 · B2          · C2            lifecycle-first reading order
 *
 * The four directions render the *real* tab components — `TitlePacketTab`,
 * `TitleNoticesTab` and the rest — not redrawn approximations of them. The only
 * reason that works is that `SessionProvider` and `LandTitlesProvider` both take
 * plain props, so a fixture session unlocks the components outside the dashboard
 * layout. Nothing inside the stage pages is mocked, which is what makes the
 * comparison honest: a direction cannot look better by drawing simpler content.
 *
 * The dialog frame reproduces `DialogContent`'s geometry exactly. That component
 * is `fixed` and sized in viewport units, so `w-[95vw]` / `max-w-6xl` resolve
 * the same way inside a normal block, and the `md:`/`lg:`/`xl:` branches key off
 * the real viewport in both cases. The one caveat: this page shows the frame in
 * the page flow, so what is *below* the fold differs from the real dialog. Every
 * claim about wrapping or fit on this page still has to come from the Playwright
 * sweep, not from a screenshot.
 */

const DIRECTIONS = [
  {
    id: 'Ship',
    axes: 'A3 · B3 · C2',
    title: 'Shipping — D2 without the step line',
    description:
      'Not a candidate: this is the implementation. It renders the real TitleDialogHeader and TitleTimelineView rather than shells, with the status band pinned as title-dialog.tsx pins it, so the decision can be reviewed against the result. D2 below is the same axes drawn as a candidate, for comparison.',
    Component: DirectionShipping,
  },
  {
    id: 'D1',
    axes: 'A1 · B1 · C1',
    title: 'D1 — Rail-led (control)',
    description:
      'Header untouched, rail rebuilt as a connected stepper, content unchanged. The conservative direction: the measured header budget is unchanged, so nothing here can make the header worse.',
    Component: DirectionD1,
  },
  {
    id: 'D2',
    axes: 'A3 · B3 · C2',
    title: 'D2 — Work surface',
    description:
      'A one-line header that states the actionable fact, a dense stage index, and a content frame whose status band stays pinned above a scrolling page.',
    Component: DirectionD2,
  },
  {
    id: 'D3',
    axes: 'A2 · B4 · C3',
    title: 'D3 — Banner and dossier',
    description:
      'The workflow strip gets its own full-width band — which removes the header width competition entirely — with the rail grouped into done and remaining, and the stage stated at the top of the content.',
    Component: DirectionD3,
  },
  {
    id: 'D4',
    axes: 'A2 · B2 · C2',
    title: 'D4 — Lifecycle first',
    description:
      'Banner header, connected stepper, work-surface content. The direction that most changes the reading order: where the record stands comes before what is being done to it.',
    Component: DirectionD4,
  },
] as const;

function Preview({ direction }: { direction: (typeof DIRECTIONS)[number] }) {
  const { Component } = direction;
  const [recordKey, setRecordKey] = useState('title-f3');
  const [selectedStage, setSelectedStage] = useState<TitleStatus>('Document Preparation');
  const [isExecutiveSigned, setIsExecutiveSigned] = useState(false);

  const title = FIXTURE_TITLES.find((t) => t.title_id === recordKey);
  const item: TitleDialogItem = title
    ? { type: 'title', data: title }
    : { type: 'awaiting', data: AWAITING_ACCOUNT };

  const props: DirectionProps = {
    item,
    selectedStage,
    onSelectStage: setSelectedStage,
    documents: recordKey === 'title-f3' ? F3_DOCUMENTS : [],
    notices: title?.notices ?? [],
    isExecutiveSigned,
    setIsExecutiveSigned,
    // Mutations are inert here: the actions behind them are real server actions
    // and this page has no session to authorise them. Every direction is
    // therefore compared on its read state, which is the state being designed.
    onStatusChange: () => {},
    onDocumentsChange: () => {},
    onNoticesChange: () => {},
    onTitleReleased: () => {},
    isUpdatingStatus: false,
    isLoadingDocs: false,
    isLoadingNotices: false,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FIXTURE_TITLES.map((t) => (
            <Button
              key={t.title_id}
              size="sm"
              variant={t.title_id === recordKey ? 'default' : 'quiet'}
              className="text-xs"
              onClick={() => {
                setRecordKey(t.title_id);
                setSelectedStage(
                  t.status === 'For Review' || t.status === 'For Signature'
                    ? 'Document Preparation'
                    : t.status
                );
              }}
            >
              {FIXTURE_LABELS[t.title_id] ?? t.title_id}
            </Button>
          ))}
          <Button
            size="sm"
            variant={recordKey === 'awaiting' ? 'default' : 'quiet'}
            className="text-xs"
            onClick={() => {
              setRecordKey('awaiting');
              setSelectedStage('Cleared by Billing');
            }}
          >
            Billing cleared — awaiting intake
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Viewing stage
        </span>
        {(
          [
            'Cleared by Billing',
            'Document Preparation',
            'Clearance Period',
            'Ready for Claim',
            'Released',
          ] as TitleStatus[]
        ).map((stage) => (
          <Button
            key={stage}
            size="sm"
            variant={stage === selectedStage ? 'secondary' : 'quiet'}
            className="text-xs"
            onClick={() => setSelectedStage(stage)}
          >
            {stage}
          </Button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isExecutiveSigned}
            onChange={(e) => setIsExecutiveSigned(e.target.checked)}
          />
          Executive signed
        </label>
      </div>

      <Component {...props} />
    </div>
  );
}

function PreviewPage() {
  const [directionId, setDirectionId] = useState<string>('Ship');
  const direction = DIRECTIONS.find((d) => d.id === directionId) ?? DIRECTIONS[0];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Title dialog — design variations</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            One dialog, five stage pages, three axes. These are four fixed combinations of those
            axes, rendered with the real tab components against the same fixtures, so a direction
            cannot look better merely by drawing simpler content. Pick a combination, or mix —
            &ldquo;D2&rsquo;s header with D1&rsquo;s rail&rdquo; is a valid answer. The{' '}
            <strong className="text-foreground">Shipping</strong> tab is not a candidate: it is
            the chosen result, built from the components that actually ship.
          </p>
        </header>

        <Alert variant="info">
          <AlertDescription className="text-sm">
            The action buttons in these previews are inert — the server actions behind them need a
            real session, which this page does not have. Everything you see is the read state,
            which is the state being designed.
          </AlertDescription>
        </Alert>

        <Card variant="canvas" padding="default" className="space-y-4">
          <div className="space-y-1">
            <CardTitle size="sm">The axes</CardTitle>
            <p className="max-w-3xl text-xs text-muted-foreground">
              Each direction below is a fixed combination. They are listed so a mixed pick can be
              named against them.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                A — the header
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">A1</span> — the current inline strip.
                  Two compact calling cards and a status badge compete with the five-step workflow
                  strip for one row.
                </li>
                <li>
                  <span className="font-medium text-foreground">A2</span> — a banner. The strip gets
                  its own full-width band, so the width competition disappears and its step labels
                  can show at every size rather than only at <code>xl</code>.
                </li>
                <li>
                  <span className="font-medium text-foreground">A3</span> — one line. &ldquo;Step 3
                  of 5 · Legal supervisor checking the document packet&rdquo;, with the full strip
                  gone. Shortest header, and the only one that states the actionable fact.
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                B — the left rail
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">B1</span> — the current rail: only
                  the stages already reached, one bordered card each, with a &ldquo;View&rdquo;
                  button in every one.
                </li>
                <li>
                  <span className="font-medium text-foreground">B2</span> — a connected stepper. All
                  five stages always present, future ones dimmed, the current one expanded.
                </li>
                <li>
                  <span className="font-medium text-foreground">B3</span> — a dense index. One row
                  per stage, no cards, roughly double the information in the same column.
                </li>
                <li>
                  <span className="font-medium text-foreground">B4</span> — two groups,
                  &ldquo;Completed&rdquo; and &ldquo;Current and upcoming&rdquo;, so the eye lands on
                  what is left.
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
              C — the stage page frame
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">C1</span> — the current stacked cards,
                as the tabs draw them today.
              </li>
              <li>
                <span className="font-medium text-foreground">C2</span> — a status band pinned above
                a scrolling page, so the stage&rsquo;s state stays visible while you work down it.
              </li>
              <li>
                <span className="font-medium text-foreground">C3</span> — the stage named at the top
                of the content, before the sections.
              </li>
            </ul>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          {DIRECTIONS.map((d) => (
            <Button
              key={d.id}
              variant={d.id === directionId ? 'default' : 'quiet'}
              size="sm"
              onClick={() => setDirectionId(d.id)}
              className="gap-2"
            >
              {d.id}
              <Badge variant="outline-warm" shape="pill" className="text-[10px]">
                {d.axes}
              </Badge>
            </Button>
          ))}
        </div>

        <Card variant="canvas" padding="default" className="space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle size="sm">{direction.title}</CardTitle>
              <Badge variant="outline-warm" shape="pill" className="text-[10px]">
                {direction.axes}
              </Badge>
            </div>
            <p className="max-w-3xl text-xs text-muted-foreground">{direction.description}</p>
          </div>

          <Preview direction={direction} />
        </Card>

        <Card variant="canvas" padding="default" className="space-y-2">
          <CardTitle size="sm">What the choice comes down to</CardTitle>
          <div className="max-w-3xl space-y-2 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">The rail is where the current design loses most.</strong>{' '}
              It shows only the stages already reached, so a record in Document Preparation sees one
              card and no sense of what is coming; each card carries its own border, its own
              description and a &ldquo;View&rdquo; button that is really the whole card&rsquo;s job.
              Every B variant fixes this the same way — show all five — and differs only in how much
              room that takes.
            </p>
            <p>
              <strong className="text-foreground">The header has a measured budget.</strong> Two
              compact calling cards at their floor plus an inline status badge need 537px; at{' '}
              <code>xl</code>, where the workflow strip starts showing its step labels, the column is
              522px. So the widest badge wraps to its own line on 3 of 10 real records — header 119px
              instead of 89px. A1 keeps that behaviour exactly, which is why it is the control. A2
              and A3 both remove the competition rather than shaving it.
            </p>
            <p>
              <strong className="text-foreground">The stage pages all repeat one recipe.</strong>{' '}
              Twenty-five hand-rolled <code>rounded-lg border border-border p-4 bg-card</code>{' '}
              blocks with an uppercase heading, some on <code>bg-row-hover</code> instead, none
              agreeing with each other. Whatever direction wins, collapsing them onto one section
              shell is most of the visual gain — and it is invisible in these previews, because it
              does not change what is on the page, only how many different ways the page says
              &ldquo;here is a section&rdquo;.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function TitleDialogConceptPage() {
  return (
    <SessionProvider session={FIXTURE_SESSION}>
      {/* `LandTitlesProvider` reads `useSearchParams`, which suspends during a
          production prerender. The boundary is what keeps the build from
          failing with "Missing Suspense boundary with useSearchParams". */}
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading preview…</div>}>
        <LandTitlesProvider initialTitles={FIXTURE_TITLES} initialAwaiting={FIXTURE_AWAITING}>
          <PreviewPage />
        </LandTitlesProvider>
      </Suspense>
    </SessionProvider>
  );
}
