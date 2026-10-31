import { formatActivityTime } from '@/lib/format-activity-time';
import { formatMediumDate } from '@/lib/format-date';
import { TITLE_STATUS_VARIANT, titleStatusTone } from '@/lib/status-colors';
import {
  getMissingReleaseDocuments,
  getRequiredReleaseDocuments,
  isReleasePacketComplete,
} from '@/lib/utils/release-requirements';
import type { TitleDialogItem } from '@/lib/hooks/use-land-titles';
import type { CallingCardStatus } from '@/lib/types/calling-card';
import type { ClientDocument } from '@/lib/types/client';
import type { LandTitle, LandTitleNotice, TitleStatus } from '@/lib/types/title';

/**
 * Where a title stands, and what that means in words.
 *
 * Every fact on this module was previously computed inside a component — some
 * of them in two or three components at once, with subtly different answers.
 * The released date was derived three times: `title-packet-tab.tsx` and
 * `title-notices-tab.tsx` both took the *last* `Released` history entry, while
 * `title-timeline-view.tsx` took the *first*. For a title released, reverted
 * and released again those disagree, and the rail and the banner would show two
 * different dates for the same event. One derivation, read by everyone, is the
 * only way that cannot happen.
 *
 * This is the domain-mapping tier: it knows the title workflow, and it knows
 * nothing about how any of it is drawn.
 */

/**
 * The five stages the rail shows. `For Review`/`For Signature` fold into preparation.
 *
 * There is no description for a stage a record has not reached: the rail leaves
 * that line empty. See `describeStage` for why a placeholder sentence was not
 * the answer.
 */
export const LIFECYCLE_STAGES: {
  status: TitleStatus;
  label: string;
}[] = [
  { status: 'Cleared by Billing', label: 'Cleared by Billing' },
  { status: 'Document Preparation', label: 'Document Preparation' },
  { status: 'Clearance Period', label: 'Clearance Period' },
  { status: 'Ready for Claim', label: 'Ready for Claim' },
  { status: 'Released', label: 'Released' },
];

/**
 * The lifecycle stage a status belongs to.
 *
 * The two sub-steps of preparation are real statuses in the database but not
 * stages of the lifecycle, so they collapse into Document Preparation. Callers
 * that need to know which sub-step are looking at `title.status` directly.
 */
export function normalizeLifecycleStage(status: TitleStatus): TitleStatus {
  if (status === 'For Review' || status === 'For Signature') return 'Document Preparation';
  return status;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const CLEARANCE_WINDOW_DAYS = 30;

export interface ClearanceProgress {
  targetDate: Date | null;
  daysRemaining: number;
  isComplete: boolean;
  /** 0–100, for a progress meter. Zero when the window has not started. */
  percentElapsed: number;
}

/** How far through the 30-day internal clearance window a title is. */
export function getClearanceProgress(startedAt?: string | null): ClearanceProgress {
  if (!startedAt) {
    return { targetDate: null, daysRemaining: 0, isComplete: false, percentElapsed: 0 };
  }
  const start = new Date(startedAt).getTime();
  const target = new Date(start + CLEARANCE_WINDOW_DAYS * MS_PER_DAY);
  const daysRemaining = Math.ceil((target.getTime() - Date.now()) / MS_PER_DAY);
  const elapsed = CLEARANCE_WINDOW_DAYS - daysRemaining;
  return {
    targetDate: target,
    daysRemaining,
    isComplete: daysRemaining <= 0,
    percentElapsed: Math.max(0, Math.min(100, (elapsed / CLEARANCE_WINDOW_DAYS) * 100)),
  };
}

/**
 * The four preparation sub-step dates, as display strings.
 *
 * Each falls back to the record's `updated_at` when the history entry is absent
 * but the status says the step happened — a title sitting in `For Review` was
 * submitted for review whether or not the history row was written.
 */
export interface DocPrepDates {
  reviewSubmittedDate: string | null;
  reviewApprovedDate: string | null;
  signedDate: string | null;
}

export function getDocPrepDates(
  title: LandTitle | null | undefined,
  isExecutiveSigned: boolean
): DocPrepDates {
  const submitted = title?.history?.find((h) => h.status === 'For Review');
  const approved = title?.history?.find((h) => h.status === 'For Signature');
  const clearanceStarted = title?.history?.find((h) => h.status === 'Clearance Period');

  const reviewSubmittedDate = submitted
    ? formatMediumDate(submitted.changed_at)
    : title?.status === 'For Review'
      ? formatMediumDate(title.updated_at)
      : null;

  const reviewApprovedDate = approved
    ? formatMediumDate(approved.changed_at)
    : title?.status === 'For Signature'
      ? formatMediumDate(title.updated_at)
      : null;

  const signedDate = clearanceStarted
    ? formatMediumDate(clearanceStarted.changed_at)
    : isExecutiveSigned
      ? formatMediumDate(new Date())
      : reviewApprovedDate;

  return { reviewSubmittedDate, reviewApprovedDate, signedDate };
}

/**
 * The four preparation sub-steps, as one list both surfaces render.
 *
 * These were written out twice — once in `title-packet-tab.tsx` as `prepSteps`
 * and once inside `title-timeline-view.tsx` — and the two copies had already
 * drifted: the packet tab named the third step "Legal Supervisor Review
 * Approved" while the rail called it "Legal review approved". Two names for one
 * step in one dialog.
 *
 * Each step carries two labels because one label cannot be right in both states.
 * "Submitted for Review" is a true statement about a step that happened and a
 * false one about a step that has not — a checklist of unstarted work read as a
 * list of things already done. The past-tense label is shown only once the step
 * is, and `pendingTitle` is an instruction in the imperative for the work still
 * ahead.
 */
export interface DocPrepStep {
  id: string;
  /** Shown once the step is done: what happened. */
  title: string;
  /** Shown while the step is still ahead: what has to happen. */
  pendingTitle: string;
  /** The supporting line — what it is waiting on, or what it produced. */
  detail: string;
  state: 'done' | 'current' | 'pending';
  /** Trailing pill text. */
  badge: string;
  timestamp: string | null;
}

/**
 * The four preparation checklist steps, resolved to whether they are done.
 *
 * `isPastDocPrep` short-circuits the later steps for a title that has already
 * left preparation — the history rows are not guaranteed to survive a data
 * migration, but the status is authoritative.
 */
export interface DocPrepState {
  step1Done: boolean;
  step2Done: boolean;
  step3Done: boolean;
  step4Done: boolean;
  requiredCount: number;
  missingCount: number;
  hasRecordedTct: boolean;
}

export function getDocPrepState(
  title: LandTitle,
  documents: ClientDocument[],
  isExecutiveSigned: boolean
): DocPrepState {
  const latestByType = new Map<string, ClientDocument>();
  for (const doc of documents) {
    if (!latestByType.has(doc.document_type)) latestByType.set(doc.document_type, doc);
  }

  const required = getRequiredReleaseDocuments(title.is_legacy_transferred);
  const missing = getMissingReleaseDocuments(title.is_legacy_transferred, latestByType.keys());
  const hasRecordedTct = Boolean(title.property?.title_number?.trim());
  const packetComplete = isReleasePacketComplete(
    title.is_legacy_transferred,
    latestByType.keys(),
    hasRecordedTct
  );

  const isPastDocPrep =
    title.status === 'Clearance Period' ||
    title.status === 'Ready for Claim' ||
    title.status === 'Released';

  return {
    step1Done: packetComplete,
    step2Done:
      isPastDocPrep || title.status === 'For Review' || title.status === 'For Signature',
    step3Done: isPastDocPrep || title.status === 'For Signature',
    step4Done: isPastDocPrep || (title.status === 'For Signature' && isExecutiveSigned),
    requiredCount: required.length,
    missingCount: missing.length,
    hasRecordedTct,
  };
}

/**
 * The four preparation sub-steps, resolved for display.
 *
 * `missingDetail` is the caller's summary of what the packet still lacks —
 * "2 files missing • title number missing" — and is only attached to the first
 * step, which is the step that is about the packet.
 */
export function getDocPrepSteps(
  title: LandTitle,
  documents: ClientDocument[],
  isExecutiveSigned: boolean,
  missingDetail: string
): DocPrepStep[] {
  const state = getDocPrepState(title, documents, isExecutiveSigned);
  const dates = getDocPrepDates(title, isExecutiveSigned);

  const packetState = state.step1Done
    ? 'done'
    : title.status === 'Document Preparation' || title.status === 'For Review' || title.status === 'For Signature'
      ? 'current'
      : 'pending';

  return [
    {
      id: 'packet',
      title: `Release packet complete (${state.requiredCount}/${state.requiredCount})`,
      pendingTitle: 'Complete the release packet',
      detail: state.step1Done ? 'All required documents uploaded' : missingDetail || 'Documents still missing',
      state: packetState,
      badge: state.step1Done ? 'Complete' : 'Incomplete',
      timestamp: null,
    },
    {
      id: 'submitted',
      title: 'Submitted for review',
      pendingTitle: 'Submit for review',
      detail: state.step2Done
        ? 'Sent to the legal supervisor'
        : state.step1Done
          ? 'Packet ready to send to the legal supervisor'
          : 'Waiting on the release packet',
      state: state.step2Done ? 'done' : title.status === 'For Review' ? 'current' : 'pending',
      badge: state.step2Done ? 'Submitted' : title.status === 'For Review' ? 'In Review' : 'Not started',
      timestamp: state.step2Done ? dates.reviewSubmittedDate : null,
    },
    {
      id: 'approved',
      title: 'Legal review approved',
      pendingTitle: 'Get legal review approval',
      detail: state.step3Done
        ? 'Technical description verified by the supervisor'
        : title.status === 'For Review'
          ? 'Supervisor is checking the technical description'
          : 'Waiting on submission for review',
      state: state.step3Done ? 'done' : title.status === 'For Signature' ? 'current' : 'pending',
      badge: state.step3Done ? 'Approved' : title.status === 'For Signature' ? 'In Progress' : 'Not started',
      timestamp: state.step3Done ? dates.reviewApprovedDate : null,
    },
    {
      id: 'signed',
      title: 'Signed by executive management',
      pendingTitle: 'Get executive signature and notarization',
      detail: state.step4Done
        ? 'Deed of Absolute Sale signed and notarized'
        : title.status === 'For Signature'
          ? 'Waiting on executive sign-off and notarization'
          : 'Waiting on legal review approval',
      state: state.step4Done ? 'done' : title.status === 'For Signature' ? 'current' : 'pending',
      badge: state.step4Done ? 'Signed' : title.status === 'For Signature' ? 'In Progress' : 'Not started',
      timestamp: state.step4Done ? dates.signedDate : null,
    },
  ];
}

/**
 * When a title reached each lifecycle stage, if it has.
 *
 * The first match in history is deliberate. `history` is append-only and read
 * oldest-first, so the first `Released` entry is when the title was *first*
 * released — the entry a "released on" line should carry. Later entries are
 * the result of a revert and a second release, which is a correction to the
 * record, not the event the date describes.
 */
export function getStageTimestamp(
  item: TitleDialogItem,
  stage: TitleStatus
): string | null {
  const title = item.type === 'title' ? item.data : null;
  const awaiting = item.type === 'awaiting' ? item.data : null;

  if (stage === 'Cleared by Billing') {
    if (awaiting?.cleared_at) return awaiting.cleared_at;
    const entry = title?.history?.find((h) => h.status === 'Cleared by Billing');
    return entry?.changed_at ?? title?.created_at ?? null;
  }
  const entry = title?.history?.find((h) => h.status === stage);
  if (entry) return entry.changed_at;
  if (stage === 'Clearance Period' && title?.clearance_started_at) {
    return title.clearance_started_at;
  }

  /*
    No `Document Preparation -> title.created_at` fallback. It reported the
    record's creation date as the date preparation began, which the caller
    cannot tell apart from a real stage transition — and because the row's date
    slot is the only place that distinction could have been made, the rail
    showed a date on a stage that had never started. A stage with no history
    entry has no date; the row renders without one.
  */
  return null;
}

/**
 * When a title was released, as a date.
 *
 * `released_at` is the recorded fact and wins. The history fallback takes the
 * *first* `Released` entry — when the packet was first handed over — rather
 * than the last, which is what two of the three previous derivations did and
 * what made them disagree with the rail for a title released, reverted and
 * released again.
 */
export function getReleasedDate(title: LandTitle | null | undefined): Date | null {
  if (!title) return null;
  if (title.released_at) {
    const date = new Date(title.released_at);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const entry = title.history?.find((h) => h.status === 'Released');
  if (entry) return new Date(entry.changed_at);
  return title.updated_at ? new Date(title.updated_at) : null;
}

/** "ended today" / "ended 3 days ago", for a window that has closed. */
export function formatDaysAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
  if (days <= 0) return 'ended today';
  return days === 1 ? 'ended 1 day ago' : `ended ${days} days ago`;
}

/** "1st" / "2nd" / "Final" — how a notice number is spoken. */
export function noticeOrdinal(noticeNumber: number): string {
  if (noticeNumber === 1) return '1st';
  if (noticeNumber === 2) return '2nd';
  return 'Final';
}

/**
 * What a stage's line says, in the record's own numbers.
 *
 * The line is decided by the row's state first and by the stage second. A
 * reached stage reports what happened, using the record's own numbers — the
 * days left in the clearance window, which notice went out and when, when the
 * packet was handed over — because a static description of a stage the reader
 * is standing in tells them what they already know from its name.
 *
 * A stage that has not been reached gets no line at all, and `null` is what
 * says so. It used to get the same sentence as a reached stage, written in the
 * past tense, so an unstarted "Released" announced "Physical packet turned over
 * to buyer" — a claim about an event that had not happened, in the column whose
 * whole job is telling the reader where the record actually is. Rewriting those
 * sentences in the future tense fixed the false claim but kept the line, and the
 * line then had nothing to report: "Starts once the buyer claims the title"
 * describes a stage that is already named "Released" two words above it. Five
 * unstarted stages is the ordinary state of a new record, and it is the state
 * where the rail should be quietest.
 */
export function describeStage(
  item: TitleDialogItem,
  stage: TitleStatus,
  state: StageRow['state'],
  notices: LandTitleNotice[] = []
): string | null {
  if (state === 'upcoming') return null;

  const title = item.type === 'title' ? item.data : null;
  const clearance = getClearanceProgress(title?.clearance_started_at);

  if (stage === 'Cleared by Billing') {
    const at = getStageTimestamp(item, stage);
    return at
      ? `Cleared by Billing on ${formatMediumDate(at)}`
      : 'Account verified and cleared as fully paid';
  }

  if (stage === 'Document Preparation') {
    return 'Packet assembly, supervisor review & executive signing';
  }

  if (stage === 'Clearance Period') {
    if (clearance.isComplete && clearance.targetDate) {
      return `Clearance window ${formatDaysAgo(clearance.targetDate)}`;
    }
    if (title?.clearance_started_at) {
      return `${Math.max(0, clearance.daysRemaining)} days remaining in the 30-day window`;
    }
    return '30-day internal clearance before release';
  }

  if (stage === 'Ready for Claim') {
    if (notices.length > 0) {
      const latest = [...notices].sort((a, b) => b.notice_number - a.notice_number)[0];
      const nth = noticeOrdinal(latest.notice_number);
      if (latest.status === 'returned_to_sender') {
        const at = latest.status_updated_at ?? latest.updated_at;
        return `${nth} notice returned to sender on ${formatActivityTime(new Date(at))}`;
      }
      if (latest.status === 'received') {
        const at = latest.status_updated_at ?? latest.updated_at;
        return `${nth} notice received on ${formatActivityTime(new Date(at))}`;
      }
      return `${nth} notice ongoing since ${formatActivityTime(new Date(latest.generated_at))}`;
    }
    return 'Original title & DOAS in vault awaiting buyer';
  }

  if (stage === 'Released') {
    const at = getStageTimestamp(item, stage);
    return at
      ? `Physical packet released on ${formatMediumDate(at)}`
      : 'Physical packet turned over to buyer';
  }

  return 'Workflow stage';
}

/**
 * The record's status, resolved once, for the header badge and the status band.
 *
 * Both surfaces read this, so a badge and a bar cannot describe the same title
 * differently. The tone goes through `titleStatusTone` rather than reading the
 * status table directly, because that resolver is what folds in the exceptions
 * — a returned notice or an overdue storage fee recolours the stage — and the
 * grid cards behind the dialog use it too.
 *
 * The detail line is the one number that makes the stage actionable: days left
 * in the clearance window, or how much of the release packet is in hand.
 */
export function getCallingCardStatus(
  item: TitleDialogItem | null | undefined
): CallingCardStatus {
  const title = item?.type === 'title' ? item.data : null;
  const awaiting = item?.type === 'awaiting' ? item.data : null;
  const property = title?.property ?? awaiting?.property;

  const stage: TitleStatus = title
    ? normalizeLifecycleStage(title.status)
    : 'Cleared by Billing';

  const status: CallingCardStatus = {
    label: stage,
    tone: title
      ? titleStatusTone(title, stage)
      : (TITLE_STATUS_VARIANT[stage] ?? 'muted'),
  };

  if (stage === 'Clearance Period') {
    const { targetDate, daysRemaining, percentElapsed } = getClearanceProgress(
      title?.clearance_started_at
    );
    if (!targetDate) return status;
    return {
      ...status,
      detail:
        daysRemaining > 0
          ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
          : 'Clearance window elapsed',
      progress: percentElapsed,
    };
  }

  if (stage === 'Document Preparation') {
    const required = getRequiredReleaseDocuments(title?.is_legacy_transferred);
    const uploaded = new Set(
      (title?.client?.documents ?? [])
        .filter((d) => d.property_id === property?.property_id)
        .map((d) => d.document_type)
    );
    const missing = getMissingReleaseDocuments(title?.is_legacy_transferred, uploaded);
    return {
      ...status,
      detail:
        missing.length === 0
          ? `Release packet complete (${required.length}/${required.length})`
          : `${required.length - missing.length} of ${required.length} documents`,
      progress: ((required.length - missing.length) / required.length) * 100,
    };
  }

  return status;
}

export type StageState = 'complete' | 'current' | 'upcoming';

export interface StageRow {
  status: TitleStatus;
  label: string;
  /** `null` for a stage the record has not reached — see `describeStage`. */
  description: string | null;
  timestamp: string | null;
  state: StageState;
}

/** Position of a status in the lifecycle, or -1 if it is not a stage. */
function stageIndex(status: TitleStatus): number {
  return LIFECYCLE_STAGES.findIndex((s) => s.status === status);
}

/**
 * Where a stage stands for this record.
 *
 * `For Review` / `For Signature` normalise into Document Preparation, so a
 * record mid-preparation is still "current" at preparation rather than at some
 * sixth stage the rail does not draw.
 */
export function getStageState(
  item: TitleDialogItem,
  stage: TitleStatus
): StageState {
  const title = item.type === 'title' ? item.data : null;
  const current = stageIndex(
    title ? normalizeLifecycleStage(title.status) : 'Cleared by Billing'
  );
  const index = stageIndex(stage);
  if (index < current) return 'complete';
  return index === current ? 'current' : 'upcoming';
}

/**
 * Whether a stage's page may be opened at all.
 *
 * Only the current stage and the ones already finished are reachable. A stage
 * the record has not entered is not a page: its controls are all status-gated,
 * so opening it from the rail offered a screen of disabled buttons describing
 * work the record is not doing yet, and — worse — the two stages whose gates are
 * *not* yet satisfied could still be driven into the wrong state through the
 * pages' own actions. The rail draws unstarted stages because a reader needs to
 * see what is ahead; seeing is not entering.
 *
 * A record that has not been created yet lives in intake, so `awaiting` items
 * are reachable at `Cleared by Billing` and nowhere else.
 */
export function isStageReachable(
  item: TitleDialogItem,
  stage: TitleStatus
): boolean {
  if (item.type === 'awaiting') return stage === 'Cleared by Billing';
  return getStageState(item, stage) !== 'upcoming';
}

/**
 * All five stages with their state, live description and timestamp, for the rail.
 *
 * The state is resolved before the description, because the description now
 * depends on it — see `describeStage`.
 */
export function buildStageRows(
  item: TitleDialogItem,
  notices: LandTitleNotice[] = []
): StageRow[] {
  const title = item.type === 'title' ? item.data : null;
  const currentStatus = title
    ? normalizeLifecycleStage(title.status)
    : 'Cleared by Billing';
  const currentIndex = stageIndex(currentStatus);

  return LIFECYCLE_STAGES.map((stage, index) => {
    const state: StageState =
      index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
    return {
      status: stage.status,
      label: stage.label,
      description: describeStage(item, stage.status, state, notices),
      timestamp: getStageTimestamp(item, stage.status),
      state,
    };
  });
}
