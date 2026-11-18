'use client';

import { Check, ChevronRight, CircleDashed, ClipboardCheck, FileText, PenLine, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardStickyHeader, CardTableFooter } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { StatusBar } from '@/components/ui/status-bar';
import { cn } from '@/lib/utils';
import { formatMediumDate } from '@/lib/format-date';
import { ClientCallingCard } from '@/components/dashboard-clients/client-calling-card';
import { PropertyCallingCard } from '@/components/dashboard-properties/property-calling-card';
import { TITLE_STATUS_VARIANT, titleStatusTone } from '@/lib/status-colors';
import { TitleDialogHeader } from '@/components/dashboard-titles/title-dialog-header';
import { TitleTimelineView } from '@/components/dashboard-titles/title-timeline-view';
import {
  buildStageRows,
  getCallingCardStatus,
  getClearanceProgress,
  normalizeLifecycleStage,
  type StageRow,
} from '@/lib/title-progress';
import { TitleIntakeTab } from '@/components/dashboard-titles/title-intake-tab';
import { TitlePacketTab } from '@/components/dashboard-titles/title-packet-tab';
import { TitleClearanceTab } from '@/components/dashboard-titles/title-clearance-tab';
import { TitleNoticesTab } from '@/components/dashboard-titles/title-notices-tab';
import { TitleReleasedTab } from '@/components/dashboard-titles/title-released-tab';
import type { TitleDialogItem } from '@/lib/hooks/use-land-titles';
import type { ClientDocument } from '@/lib/types/client';
import type { CallingCardStatus } from '@/lib/types/calling-card';
import type { LandTitle, LandTitleNotice, TitleStatus } from '@/lib/types/title';

/**
 * Direction shells for the title-dialog redesign.
 *
 * Every shell renders the *real* tab components as children and differs only in
 * the chrome around them — the header treatment, the left rail, and the content
 * frame. That is what makes the comparison honest: the sections inside are the
 * shipped ones, so a direction cannot look better merely by drawing simpler
 * content.
 *
 * The shells are not candidates for shipping as-is. They exist to make the
 * choice, and the winning axis combination gets rebuilt properly inside
 * `components/dashboard-titles/` afterwards.
 */

// ---------------------------------------------------------------------------
// The five-step company workflow strip
// ---------------------------------------------------------------------------

const WORKFLOW_STEPS = [
  { label: 'Account settlement', shortLabel: 'Payment', icon: Wallet },
  { label: 'Document preparation', shortLabel: 'Preparation', icon: FileText },
  { label: 'Legal verification', shortLabel: 'Verification', icon: ClipboardCheck },
  { label: 'Executive signature', shortLabel: 'Signature', icon: PenLine },
  { label: 'Title release', shortLabel: 'Release', icon: Check },
] as const;

/**
 * The sentence that used to sit under the shipped header's identity row.
 *
 * It is demo-local now. The header no longer renders it — the status band below
 * states the stage, and this sentence said the same thing in more words — so
 * the only thing still asking for it is the `WorkflowStrip*` candidates below,
 * which are the treatments that were compared and rejected.
 */
function getWorkflowDetail(status: TitleStatus, isExecutiveSigned: boolean): string {
  switch (status) {
    case 'Clearance Period':
      return 'Executive signature confirmed · 30-day internal clearance underway';
    case 'Ready for Claim':
      return 'Cleared for claim · title and DOAS awaiting physical handover';
    case 'Released':
      return 'Physical title packet handed over to client';
    case 'For Review':
      return 'Legal supervisor checking the document packet';
    case 'For Signature':
      return isExecutiveSigned
        ? 'Executive signature confirmed · start internal clearance'
        : 'Awaiting executive signature and notarization';
    case 'Document Preparation':
      return 'Legal compiling buyer file and turnover documents';
    case 'Cleared by Billing':
    default:
      return 'Billing verified and cleared the account';
  }
}

function workflowStepFor(status: TitleStatus, isExecutiveSigned: boolean): number {
  switch (status) {
    case 'Cleared by Billing':
      return 0;
    case 'Document Preparation':
      return 1;
    case 'For Review':
      return 2;
    case 'For Signature':
      return isExecutiveSigned ? 4 : 3;
    case 'Clearance Period':
    case 'Ready for Claim':
      return 4;
    case 'Released':
      return WORKFLOW_STEPS.length;
  }
}


/**
 * A verbatim copy of the shipped `CompanyWorkflowProgress` in
 * `title-dialog.tsx`, so A1 is a true control rather than a redrawing of it.
 * Class strings, child order and the `hidden xl:inline` label reveal are all
 * identical — that reveal is exactly what tightens the header at `xl`, so
 * approximating it would invalidate the comparison.
 */
function WorkflowStripA1({ status, isExecutiveSigned }: { status: TitleStatus; isExecutiveSigned: boolean }) {
  const currentStep = workflowStepFor(status, isExecutiveSigned);
  return (
    <section aria-label="Title claim workflow" className="flex flex-col items-start lg:items-end gap-1">
      <ol className="flex items-center gap-1 sm:gap-1.5">
        {WORKFLOW_STEPS.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep && currentStep < WORKFLOW_STEPS.length;
          const isFinalDone = currentStep === WORKFLOW_STEPS.length;
          return (
            <li key={step.label} aria-current={isCurrent ? 'step' : undefined} className="flex items-center gap-1">
              <div
                title={`${step.label}: ${isComplete || isFinalDone ? 'Complete' : isCurrent ? 'Current step' : 'Pending'}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs transition-colors',
                  isComplete || isFinalDone
                    ? 'bg-row-hover text-success font-medium'
                    : isCurrent
                      ? 'bg-sidebar-accent text-primary font-semibold ring-1 ring-primary'
                      : 'text-muted-foreground opacity-60'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]',
                    isComplete || isFinalDone
                      ? 'bg-success text-success-foreground'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'border border-border text-muted-foreground'
                  )}
                >
                  {isComplete || isFinalDone ? (
                    <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>
                <span className="hidden xl:inline">{step.shortLabel}</span>
              </div>
              {index < WORKFLOW_STEPS.length - 1 && (
                <span className="text-border text-xs select-none">›</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-muted-foreground text-left lg:text-right" aria-live="polite">
        {getWorkflowDetail(status, isExecutiveSigned)}
      </p>
    </section>
  );
}

/** The same five steps, as a full-width band: labels always visible. */
function WorkflowBand({ status, isExecutiveSigned }: { status: TitleStatus; isExecutiveSigned: boolean }) {
  const currentStep = workflowStepFor(status, isExecutiveSigned);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] px-5 py-2.5 sm:px-6">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {WORKFLOW_STEPS.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep && currentStep < WORKFLOW_STEPS.length;
          const isFinalDone = currentStep === WORKFLOW_STEPS.length;
          const done = isComplete || isFinalDone;
          return (
            <li key={step.label} className="flex items-center gap-1">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
                  done
                    ? 'text-success font-medium'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]',
                    done
                      ? 'bg-success text-success-foreground'
                      : isCurrent
                        ? 'bg-primary-foreground text-primary font-bold'
                        : 'border border-border-warm text-muted-foreground'
                  )}
                >
                  {done ? <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden="true" /> : <span>{index + 1}</span>}
                </span>
                <span>{step.shortLabel}</span>
              </div>
              {index < WORKFLOW_STEPS.length - 1 && (
                <span className="text-border select-none" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-muted-foreground">{getWorkflowDetail(status, isExecutiveSigned)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header variants
// ---------------------------------------------------------------------------

function IdentityRow({
  item,
  currentStatus,
}: {
  item: TitleDialogItem;
  currentStatus: CallingCardStatus;
}) {
  const title = item.type === 'title' ? item.data : null;
  const awaiting = item.type === 'awaiting' ? item.data : null;
  const property = title?.property ?? awaiting?.property;
  const client = title?.client ?? awaiting?.client;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {property ? (
        <PropertyCallingCard property={property} tier="compact" />
      ) : (
        <span className="text-sm font-semibold">Lot not found</span>
      )}
      {client ? (
        <ClientCallingCard client={client} tier="compact" />
      ) : (
        <ClientCallingCard client={{ full_name: 'Client Account', client_id: null }} tier="compact" />
      )}
      <Badge variant={currentStatus.tone} shape="pill" dot className="shrink-0 text-xs">
        {currentStatus.label}
      </Badge>
      {title?.is_legacy_transferred && (
        <Badge variant="outline" className="text-[11px] shrink-0">
          Legacy Pre-Transferred
        </Badge>
      )}
    </div>
  );
}

function HeaderA1({
  item,
  currentStatus,
  isExecutiveSigned,
}: {
  item: TitleDialogItem;
  currentStatus: CallingCardStatus;
  isExecutiveSigned: boolean;
}) {
  const status = item.type === 'title' ? item.data.status : 'Cleared by Billing';
  return (
    <div className="flex flex-col gap-2.5 px-5 py-3 lg:flex-row lg:items-center lg:justify-between sm:px-6">
      <div className="min-w-0">
        <IdentityRow item={item} currentStatus={currentStatus} />
      </div>
      <div className="shrink-0">
        <WorkflowStripA1 status={status} isExecutiveSigned={isExecutiveSigned} />
      </div>
    </div>
  );
}

function HeaderA2({
  item,
  currentStatus,
  isExecutiveSigned,
}: {
  item: TitleDialogItem;
  currentStatus: CallingCardStatus;
  isExecutiveSigned: boolean;
}) {
  const status = item.type === 'title' ? item.data.status : 'Cleared by Billing';
  return (
    <div className="flex flex-col">
      <div className="px-5 py-3 sm:px-6">
        <IdentityRow item={item} currentStatus={currentStatus} />
      </div>
      <WorkflowBand status={status} isExecutiveSigned={isExecutiveSigned} />
    </div>
  );
}

/**
 * A3 — the chosen header, rendered as the real shipped component.
 *
 * This began as "Step 3 of 5 · Legal supervisor checking the document packet",
 * and both the step counter and the detail sentence have since been removed:
 * the rail lists all five stages against the current one, and the pinned
 * `StatusBar` states the stage and its one actionable number. What is left is
 * the identity row alone, which is what `TitleDialogHeader` now renders — so
 * this wrapper takes `item` and nothing else.
 */
function HeaderA3({ item }: { item: TitleDialogItem }) {
  return <TitleDialogHeader item={item} />;
}

// ---------------------------------------------------------------------------
// Rail variants
// ---------------------------------------------------------------------------

/** B2 — a connected vertical stepper; all five stages, always present. */
function RailB2({
  rows,
  selectedStage,
  onSelectStage,
}: {
  rows: StageRow[];
  selectedStage: TitleStatus;
  onSelectStage: (s: TitleStatus) => void;
}) {
  return (
    <nav aria-label="Title lifecycle" className="space-y-0">
      {rows.map((row, index) => {
        const isSelected = row.status === selectedStage;
        const isLast = index === rows.length - 1;
        return (
          <div key={row.status} className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]',
                  row.state === 'complete'
                    ? 'bg-success text-success-foreground'
                    : row.state === 'current'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'border border-border bg-card text-muted-foreground'
                )}
              >
                {row.state === 'complete' ? <Check className="h-3 w-3 stroke-[3]" /> : <span>{index + 1}</span>}
              </span>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn('w-px flex-1', row.state === 'complete' ? 'bg-success' : 'bg-border')}
                />
              )}
            </div>
            <div className={cn('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-4')}>
              <button
                type="button"
                onClick={() => onSelectStage(row.status)}
                aria-current={row.state === 'current' ? 'step' : undefined}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-sidebar-accent'
                    : 'border-transparent hover:border-border hover:bg-row-hover',
                  row.state === 'upcoming' && 'opacity-55'
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'truncate text-sm',
                      row.state === 'current' ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                    )}
                  >
                    {row.label}
                  </span>
                  {row.timestamp && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatMediumDate(row.timestamp)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
              </button>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/** B3 — a dense index; one row per stage, no cards. */
function RailB3({
  rows,
  selectedStage,
  onSelectStage,
}: {
  rows: StageRow[];
  selectedStage: TitleStatus;
  onSelectStage: (s: TitleStatus) => void;
}) {
  return (
    <nav aria-label="Title lifecycle" className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => {
        const isSelected = row.status === selectedStage;
        return (
          <button
            key={row.status}
            type="button"
            onClick={() => onSelectStage(row.status)}
            aria-current={row.state === 'current' ? 'step' : undefined}
            className={cn(
              'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors first:rounded-t-lg last:rounded-b-lg',
              isSelected ? 'bg-sidebar-accent' : 'hover:bg-row-hover',
              row.state === 'upcoming' && 'opacity-55'
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]',
                row.state === 'complete'
                  ? 'bg-success text-success-foreground'
                  : row.state === 'current'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'border border-border text-muted-foreground'
              )}
            >
              {row.state === 'complete' ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-semibold text-foreground">{row.label}</span>
                {row.timestamp && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatMediumDate(row.timestamp)}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {row.description}
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}

/** B4 — two labelled groups, so the eye lands on what is left. */
function RailB4({
  rows,
  selectedStage,
  onSelectStage,
}: {
  rows: StageRow[];
  selectedStage: TitleStatus;
  onSelectStage: (s: TitleStatus) => void;
}) {
  const done = rows.filter((r) => r.state === 'complete');
  const remaining = rows.filter((r) => r.state !== 'complete');

  function Group({ label, items }: { label: string; items: StageRow[] }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="space-y-1">
          {items.map((row) => {
            const isSelected = row.status === selectedStage;
            return (
              <button
                key={row.status}
                type="button"
                onClick={() => onSelectStage(row.status)}
                aria-current={row.state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                  isSelected ? 'border-primary bg-sidebar-accent' : 'border-border hover:bg-row-hover',
                  row.state === 'upcoming' && 'opacity-55'
                )}
              >
                {row.state === 'complete' ? (
                  <Check className="h-3 w-3 shrink-0 text-success stroke-[3]" aria-hidden="true" />
                ) : row.state === 'current' ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                ) : (
                  <CircleDashed className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="truncate font-medium text-foreground">{row.label}</span>
                {row.timestamp && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {formatMediumDate(row.timestamp)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <nav aria-label="Title lifecycle" className="space-y-4">
      <Group label="Completed" items={done} />
      <Group label="Current and upcoming" items={remaining} />
    </nav>
  );
}

// ---------------------------------------------------------------------------
// The shells
// ---------------------------------------------------------------------------

export interface DirectionProps {
  item: TitleDialogItem;
  selectedStage: TitleStatus;
  onSelectStage: (s: TitleStatus) => void;
  documents: ClientDocument[];
  notices: LandTitleNotice[];
  isExecutiveSigned: boolean;
  setIsExecutiveSigned: (v: boolean) => void;
  onStatusChange: (s: TitleStatus, reason?: string) => void;
  onDocumentsChange: (d: ClientDocument[]) => void;
  onNoticesChange: (n: LandTitleNotice[]) => void;
  onTitleReleased: (t: LandTitle) => void;
  isUpdatingStatus: boolean;
  isLoadingDocs: boolean;
  isLoadingNotices: boolean;
}

/** The stage's page, rendered exactly as `title-dialog.tsx` routes it. */
export function StageContent(props: DirectionProps) {
  const { item, selectedStage, documents, notices, isExecutiveSigned } = props;
  const title = item.type === 'title' ? item.data : null;

  if (selectedStage === 'Cleared by Billing') {
    return <TitleIntakeTab item={item} />;
  }
  if (selectedStage === 'Clearance Period' && title) {
    return (
      <TitleClearanceTab
        title={title}
        onStatusChange={(status) => props.onStatusChange(status)}
        isUpdatingStatus={props.isUpdatingStatus}
      />
    );
  }
  if (selectedStage === 'Ready for Claim' && title) {
    return (
      <TitleNoticesTab
        title={title}
        notices={notices}
        onNoticesChange={props.onNoticesChange}
        isLoadingNotices={props.isLoadingNotices}
        onStatusChange={(status) => props.onStatusChange(status)}
        isUpdatingStatus={props.isUpdatingStatus}
        onTitleReleased={props.onTitleReleased}
      />
    );
  }
  if (selectedStage === 'Released' && title) {
    return <TitleReleasedTab title={title} />;
  }
  if (title) {
    return (
      <TitlePacketTab
        title={title}
        documents={documents}
        onDocumentsChange={props.onDocumentsChange}
        isLoadingDocs={props.isLoadingDocs}
        isExecutiveSigned={isExecutiveSigned}
        setIsExecutiveSigned={props.setIsExecutiveSigned}
        onStatusChange={props.onStatusChange}
        isUpdatingStatus={props.isUpdatingStatus}
      />
    );
  }
  return null;
}

/**
 * The dialog's exact geometry, reproduced.
 *
 * The real `DialogContent` is `fixed` and sized in viewport units, so `w-[95vw]`
 * and `max-w-6xl` resolve identically inside a normal block. That is the rare
 * case where a mock is a faithful reproduction rather than an approximation —
 * and it is why the Playwright sweep can measure this page and have the numbers
 * mean something. The only thing not reproduced is the overlay and close button,
 * neither of which affects layout.
 */
function DialogFrame({ children }: { children: React.ReactNode }) {
  /*
    `Dialog` is the Radix root, and it is here for its context rather than its
    behaviour: `TitleDialogHeader` renders `DialogTitle`/`DialogDescription`,
    which throw outside a root. The root alone opens no portal and applies no
    scroll lock — only `DialogContent` does that — so this frame stays a plain
    block while the real header renders inside it unmodified.
  */
  return (
    <Dialog open>
      <div className="mx-auto flex h-[90vh] max-h-[90vh] w-[95vw] flex-col overflow-hidden rounded-lg border border-border-warm bg-card shadow-xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
        {children}
      </div>
    </Dialog>
  );
}

function Shell({
  header,
  rail,
  content,
  railBorders = true,
}: {
  header: React.ReactNode;
  rail: React.ReactNode;
  content: React.ReactNode;
  railBorders?: boolean;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-border bg-card">{header}</div>
      <div className="hidden min-h-0 flex-1 gap-6 overflow-hidden px-6 py-5 md:grid md:grid-cols-12">
        <div
          className={cn(
            'h-full min-h-0 overflow-y-auto md:col-span-5 lg:col-span-4',
            railBorders && 'border-r border-border pr-6'
          )}
        >
          {rail}
        </div>
        <div className="h-full min-h-0 overflow-y-auto pr-1 md:col-span-7 lg:col-span-8">{content}</div>
      </div>
    </>
  );
}

/**
 * Shipping — D2 with the step line removed, wired to the real components.
 *
 * The other four shells are candidates: they draw their own header and rail so
 * the axes can be compared. This one is not a candidate. It renders
 * `TitleDialogHeader` and `TitleTimelineView` — the components that actually
 * ship — inside the dialog's geometry, with the status band pinned exactly as
 * `title-dialog.tsx` pins it. Its only purpose is to be the thing the other
 * four were choosing between, so the decision can be reviewed against the
 * result rather than against a drawing of it.
 */
export function DirectionShipping(props: DirectionProps) {
  const currentStatus = getCallingCardStatus(props.item);

  return (
    <DialogFrame>
      <Shell
        railBorders={false}
        header={<TitleDialogHeader item={props.item} />}
        rail={
          <TitleTimelineView
            item={props.item}
            selectedStage={props.selectedStage}
            onSelectStage={props.onSelectStage}
            documents={props.documents}
            notices={props.notices}
            isExecutiveSigned={props.isExecutiveSigned}
          />
        }
        content={
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 pb-4">
              <StatusBar
                tone={currentStatus.tone}
                status={currentStatus.label}
                detail={currentStatus.detail}
                progress={currentStatus.progress}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <StageContent {...props} />
            </div>
          </div>
        }
      />
    </DialogFrame>
  );
}

/**
 * The four directions. Each is a fixed axis combination, labelled, so a mixed
 * pick can be named against it ("D2's header with D1's rail").
 */
export function DirectionD1(props: DirectionProps) {
  const title = props.item.type === 'title' ? props.item.data : null;
  const currentStatus: CallingCardStatus = {
    label: normalizeLifecycleStage(title?.status ?? 'Cleared by Billing'),
    tone: title
      ? titleStatusTone(title, normalizeLifecycleStage(title.status))
      : TITLE_STATUS_VARIANT['Cleared by Billing'],
  };
  return (
    <DialogFrame>
      <Shell
        header={
          <HeaderA1
            item={props.item}
            currentStatus={currentStatus}
            isExecutiveSigned={props.isExecutiveSigned}
          />
        }
        rail={
          <TitleTimelineView
            item={props.item}
            selectedStage={props.selectedStage}
            onSelectStage={props.onSelectStage}
            documents={props.documents}
            notices={props.notices}
            isExecutiveSigned={props.isExecutiveSigned}
          />
        }
        content={<StageContent {...props} />}
      />
    </DialogFrame>
  );
}

export function DirectionD2(props: DirectionProps) {
  const title = props.item.type === 'title' ? props.item.data : null;
  const status = normalizeLifecycleStage(title?.status ?? 'Cleared by Billing');
  const clearance = getClearanceProgress(title?.clearance_started_at);
  const currentStatus: CallingCardStatus = {
    label: status,
    tone: title ? titleStatusTone(title, status) : TITLE_STATUS_VARIANT['Cleared by Billing'],
    detail:
      status === 'Clearance Period' && clearance.targetDate
        ? `${clearance.daysRemaining} days remaining`
        : undefined,
    progress: status === 'Clearance Period' && clearance.targetDate
      ? Math.max(0, Math.min(100, ((30 - clearance.daysRemaining) / 30) * 100))
      : undefined,
  };
  const rows = buildStageRows(props.item, props.notices);

  return (
    <DialogFrame>
      <Shell
        railBorders={false}
        header={
          <HeaderA3 item={props.item} />
        }
        rail={<RailB3 rows={rows} selectedStage={props.selectedStage} onSelectStage={props.onSelectStage} />}
        content={
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0">
              <StatusBar tone={currentStatus.tone} status={currentStatus.label} detail={currentStatus.detail} progress={currentStatus.progress} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
              <StageContent {...props} />
            </div>
          </div>
        }
      />
    </DialogFrame>
  );
}

export function DirectionD3(props: DirectionProps) {
  const title = props.item.type === 'title' ? props.item.data : null;
  const status = normalizeLifecycleStage(title?.status ?? 'Cleared by Billing');
  const currentStatus: CallingCardStatus = {
    label: status,
    tone: title ? titleStatusTone(title, status) : TITLE_STATUS_VARIANT['Cleared by Billing'],
  };
  const rows = buildStageRows(props.item, props.notices);
  const stage = rows.find((r) => r.status === props.selectedStage) ?? rows[0];

  return (
    <DialogFrame>
      <Shell
        header={
          <HeaderA2
            item={props.item}
            currentStatus={currentStatus}
            isExecutiveSigned={props.isExecutiveSigned}
          />
        }
        rail={<RailB4 rows={rows} selectedStage={props.selectedStage} onSelectStage={props.onSelectStage} />}
        content={
          <div className="space-y-4">
            <Card variant="section" padding="none" className="overflow-hidden">
              <div className="border-l-4 border-primary px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Stage
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-foreground">{stage.label}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{stage.description}</p>
              </div>
            </Card>
            <StageContent {...props} />
          </div>
        }
      />
    </DialogFrame>
  );
}

export function DirectionD4(props: DirectionProps) {
  const title = props.item.type === 'title' ? props.item.data : null;
  const status = normalizeLifecycleStage(title?.status ?? 'Cleared by Billing');
  const currentStatus: CallingCardStatus = {
    label: status,
    tone: title ? titleStatusTone(title, status) : TITLE_STATUS_VARIANT['Cleared by Billing'],
  };
  const rows = buildStageRows(props.item, props.notices);

  return (
    <DialogFrame>
      <Shell
        railBorders={false}
        header={
          <HeaderA2
            item={props.item}
            currentStatus={currentStatus}
            isExecutiveSigned={props.isExecutiveSigned}
          />
        }
        rail={<RailB2 rows={rows} selectedStage={props.selectedStage} onSelectStage={props.onSelectStage} />}
        content={
          <Card variant="section" padding="none" className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardStickyHeader className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current stage
                  </p>
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {rows.find((r) => r.state === 'current')?.label ?? status}
                  </h3>
                </div>
                <Badge variant={currentStatus.tone} shape="pill" dot className="shrink-0 text-xs">
                  {currentStatus.label}
                </Badge>
              </div>
            </CardStickyHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <StageContent {...props} />
            </div>
            <CardTableFooter>
              <span className="text-xs text-muted-foreground">
                {rows.find((r) => r.state === 'current')?.description}
              </span>
              <Button variant="quiet" size="sm" className="text-xs">
                Stage actions
              </Button>
            </CardTableFooter>
          </Card>
        }
      />
    </DialogFrame>
  );
}
