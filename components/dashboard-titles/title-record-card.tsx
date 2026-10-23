'use client';

import { Badge } from '@/components/ui/badge';
import { RecordCard } from '@/components/ui/record-card';
import { ClientCallingCard } from '@/components/dashboard-clients/client-calling-card';
import { PropertyCallingCard } from '@/components/dashboard-properties/property-calling-card';
import { formatActivityTime } from '@/lib/format-activity-time';
import { calculateStorageFee } from '@/lib/storage-fee';
import { TITLE_STATUS_VARIANT } from '@/lib/status-colors';
import {
  documentsForLot,
  getMissingReleaseDocuments,
  getRequiredReleaseDocuments,
} from '@/lib/utils/release-requirements';
import type { CallingCardStatus } from '@/lib/types/calling-card';
import type { AccountAwaitingTitle, LandTitle } from '@/lib/types/title';

const DATE_FORMAT = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getClearanceProgress(startedAt?: string | null) {
  if (!startedAt) return { targetDate: null, daysRemaining: 0, isComplete: false };
  const start = new Date(startedAt).getTime();
  const target = new Date(start + 30 * MS_PER_DAY);
  const now = Date.now();
  const daysRemaining = Math.ceil((target.getTime() - now) / MS_PER_DAY);
  return {
    targetDate: target,
    daysRemaining,
    isComplete: daysRemaining <= 0,
  };
}

function getStatusChangedAt(title: LandTitle): string {
  if (title.status === 'Clearance Period' && title.clearance_started_at) {
    return title.clearance_started_at;
  }
  const entry = title.history?.slice().reverse().find((h) => h.status === title.status);
  if (entry) return entry.changed_at;
  if (title.status === 'Document Preparation') return title.created_at;
  return title.updated_at || title.created_at || new Date().toISOString();
}

function sinceLabel(changedAt: string): string {
  return `Since ${DATE_FORMAT.format(new Date(changedAt))} (${formatActivityTime(changedAt)})`;
}

/**
 * The latest notice on a record, in the fewest words that still say what to do
 * about it. A returned notice is the single most actionable thing a
 * Ready-for-Claim record can be carrying — it means the buyer never received
 * it and the 30-day clock is running regardless — so it leads, ahead of the
 * storage fee.
 *
 * Same vocabulary as `title-timeline-view`, so the grid card and the timeline
 * cannot describe the same notice differently.
 */
function latestNoticeLabel(title: LandTitle): string | null {
  const notices = title.notices ?? [];
  if (notices.length === 0) return null;
  const latest = [...notices].sort((a, b) => b.notice_number - a.notice_number)[0];
  const nth =
    latest.notice_number === 1 ? '1st' : latest.notice_number === 2 ? '2nd' : 'Final';
  if (latest.status === 'returned_to_sender') return `${nth} notice returned to sender`;
  if (latest.status === 'received') return `${nth} notice received`;
  return `${nth} notice ongoing`;
}

interface TitleRecordCardProps {
  item:
    | { type: 'awaiting'; data: AccountAwaitingTitle }
    | { type: 'title'; data: LandTitle };
  onClick: () => void;
}

/**
 * One title record as a card: the lot, the buyer, and a banded footer saying
 * where the record stands. The shell itself is `RecordCard`, shared with the
 * Billing grid; what lives here is only what is specific to a title — which
 * two subjects the record has, and which fact each stage makes actionable.
 *
 * The pair is the same composition as the title dialog's header, down to the
 * `flex-wrap`: the two cards sit side by side when the cell allows and stack
 * when it does not, so the card is correct at any column width without a
 * breakpoint of its own.
 */
export function TitleRecordCard({ item, onClick }: TitleRecordCardProps) {
  if (item.type === 'awaiting') {
    const account = item.data;
    const clientName = account.client?.full_name ?? 'Unknown client';

    const status: CallingCardStatus = {
      label: 'Cleared by Billing',
      tone: TITLE_STATUS_VARIANT['Cleared by Billing'],
      detail: sinceLabel(account.cleared_at),
    };

    return (
      <RecordCard
        label={`Open title intake for ${clientName}`}
        onClick={onClick}
        status={status}
      >
        <PropertyCallingCard property={account.property} tier="compact" embedded />
        <ClientCallingCard
          client={account.client ?? { full_name: clientName, client_id: null }}
          tier="compact"
          embedded
        />
        {account.co_buyers.length > 0 && (
          // `w-full` so a list of names takes its own line rather than
          // stretching the row, and `truncate` so a long list cannot push the
          // card wider than its cell — the same treatment it had before.
          <p className="w-full truncate px-1 text-[11px] text-muted-foreground">
            With {account.co_buyers.join(', ')}
          </p>
        )}
      </RecordCard>
    );
  }

  const title = item.data;
  const clientName = title.client?.full_name ?? 'Unknown client';
  const hasTct = Boolean(title.property?.title_number?.trim());

  const uploaded = documentsForLot(title.client?.documents ?? [], title.property_id).map(
    (d) => d.document_type
  );
  const required = getRequiredReleaseDocuments(title.is_legacy_transferred).length;
  const missing = getMissingReleaseDocuments(title.is_legacy_transferred, uploaded).length;
  const docsDone = required - missing;
  const isPacketComplete = missing === 0 && hasTct;

  const storageFee = calculateStorageFee(title);

  /**
   * The footer's detail line, chosen per stage rather than derived from the
   * clock. Every stage has a fact worth more than "how long it has been sitting
   * there", and this is where they all land:
   *
   * - clearance: days left in the 30-day window
   * - document preparation / review / signature: release-packet progress
   * - ready for claim: the live notice if there is one, else the storage fee
   * - released: who it went to
   *
   * Only a stage with genuinely nothing to report falls back to the timestamp.
   */
  const notice = title.status === 'Ready for Claim' ? latestNoticeLabel(title) : null;

  let detail: string;
  if (title.status === 'Clearance Period') {
    const { targetDate, daysRemaining } = getClearanceProgress(title.clearance_started_at);
    detail = targetDate
      ? `${Math.max(0, daysRemaining)} ${Math.max(0, daysRemaining) === 1 ? 'day' : 'days'} remaining`
      : sinceLabel(getStatusChangedAt(title));
  } else if (
    title.status === 'Document Preparation' ||
    title.status === 'For Review' ||
    title.status === 'For Signature'
  ) {
    detail = isPacketComplete
      ? `Packet complete (${required}/${required})`
      : `${docsDone} of ${required} documents`;
  } else if (title.status === 'Ready for Claim') {
    if (notice) detail = notice;
    else if (storageFee.isOverdue)
      detail = `${storageFee.monthsOverdue} ${storageFee.monthsOverdue === 1 ? 'mo' : 'mos'} overdue`;
    else detail = 'Original title in vault';
  } else if (title.status === 'Released') {
    detail = title.released_to_name
      ? `Released to ${title.released_to_name}`
      : sinceLabel(getStatusChangedAt(title));
  } else {
    detail = sinceLabel(getStatusChangedAt(title));
  }

  const status: CallingCardStatus = {
    label: title.status,
    tone: TITLE_STATUS_VARIANT[title.status] ?? 'muted',
    detail,
  };

  return (
    <RecordCard
      label={`Open title record for ${clientName}`}
      onClick={onClick}
      status={status}
    >
      {title.property && (
        <PropertyCallingCard property={title.property} tier="compact" embedded />
      )}
      <ClientCallingCard
        client={title.client ?? { full_name: clientName, client_id: null }}
        tier="compact"
        embedded
      />
      {title.is_legacy_transferred && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Legacy Title
        </Badge>
      )}
    </RecordCard>
  );
}

/*
  Measured on the real legal grid, one fresh load per viewport: the cards sit
  side by side at 1600px and wider (cell 405px, card 147px tall) and stack at
  1440px and narrower (cell 351px, card 220px). The crossover is tight — at a
  385px cell the content box is 359px and the pair needs 360px, so it misses by
  a single pixel. That is the `min-w-[11rem]` floor on the compact cards, not
  `RecordCard`'s body padding; see the note in `ClientCallingCard` for why the
  floor is not lowered.
*/
