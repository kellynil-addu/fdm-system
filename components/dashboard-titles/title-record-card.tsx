'use client';

import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardCallingRail } from '@/components/ui/card';
import { SubjectSplitCard } from '@/components/ui/subject-split-card';
import { IconBox } from '@/components/ui/icon-box';
import { StatusBar } from '@/components/ui/status-bar';
import {
  CallingCardHeader,
  CallingCardRule,
  CallingCardField,
  CallingCardFieldList,
} from '@/components/ui/card-calling-parts';
import { getInitials } from '@/lib/utils/initials';
import { formatActivityTime } from '@/lib/format-activity-time';
import { calculateStorageFee } from '@/lib/storage-fee';
import { TITLE_STATUS_VARIANT, titleStatusTone } from '@/lib/status-colors';
import {
  documentsForLot,
  getMissingReleaseDocuments,
  getRequiredReleaseDocuments,
} from '@/lib/utils/release-requirements';
import type { CallingCardStatus } from '@/lib/types/calling-card';
import type { AccountAwaitingTitle, LandTitle } from '@/lib/types/title';

const DATE_FORMAT = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

// The clearance window is a domain fact, so it lives with the rest of them.
// Re-exported here because this card is where several callers first found it.
export { getClearanceProgress } from '@/lib/title-progress';
import { getClearanceProgress } from '@/lib/title-progress';

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
 * where the record stands.
 *
 * The lot and the buyer sit side by side, each with its own accent bar — see
 * `SubjectSplitCard`, which is also what `BillingAccountCard` renders, so a
 * ledger account and a land title read as the same kind of thing.
 */
export function TitleRecordCard({ item, onClick }: TitleRecordCardProps) {
  if (item.type === 'awaiting') {
    const account = item.data;
    const clientName = account.client?.full_name ?? 'Unknown client';

    const status: CallingCardStatus = {
      label: 'Cleared by Billing',
      // No exception check: an account awaiting title intake has no title
      // record yet, so there are no notices and no storage fee to outweigh the
      // stage colour. `titleStatusTone` takes the title because those
      // exceptions live on it.
      tone: TITLE_STATUS_VARIANT['Cleared by Billing'],
      detail: sinceLabel(account.cleared_at),
    };

    return (
      <SubjectSplitCard
        label={`Open title intake for ${clientName}`}
        onClick={onClick}
        lot={account.property}
        buyer={account.client}
        buyerFallback={clientName}
        status={status}
        buyerNote={
          account.co_buyers.length > 0 ? (
            // Truncated so a long list cannot push the card wider than its cell.
            <p className="truncate text-[11px] text-muted-foreground">
              With {account.co_buyers.join(', ')}
            </p>
          ) : undefined
        }
      />
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
    tone: titleStatusTone(title),
    detail,
  };

  /*
    A title with a lot is the split band. A released legacy title has no lot row
    at all, so there is nothing to sit beside the buyer and the card is built the
    other way round — the buyer leads and the status is a field. That is a
    different card rather than a special case of the first, so it keeps its own
    markup rather than bending `SubjectSplitCard` around a missing column.
  */
  if (title.property) {
    return (
      <SubjectSplitCard
        label={`Open title record for ${clientName}`}
        onClick={onClick}
        lot={title.property}
        buyer={title.client}
        buyerFallback="No buyer recorded"
        status={status}
        buyerNote={
          title.is_legacy_transferred ? (
            <Badge variant="outline" className="text-[10px]">
              Legacy Title
            </Badge>
          ) : undefined
        }
      />
    );
  }

  return (
    <Card
      variant="calling-card"
      padding="none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open title record for ${clientName}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden text-left transition-shadow hover:shadow-md"
    >
      {/* No lot to sit beside the buyer, so the buyer leads. Built from the same
          parts rather than from `ClientCallingCard`, whose field list is fixed
          and whose destination is the client profile — neither of which is right
          for a card whose click opens a title record. */}
      {/* `flex-1` so the status bar is pushed to the bottom when the grid
          stretches this card to match a taller sibling. Without it the bar sits
          directly under the fields and floats in the middle of the card —
          measured at a 900px viewport, where a 168px card sat in a 192.5px row. */}
      <div className="relative flex-1">
        <CardCallingRail />
        <div className="relative p-3 pl-5">
          <CallingCardHeader
            monogram={
              <IconBox variant="canvas" size="md" shape="rounded-xl" className="shrink-0 text-xs font-semibold">
                {getInitials(title.client?.full_name ?? clientName)}
              </IconBox>
            }
            title={clientName}
            eyebrow="Buyer"
          />
          <CallingCardRule />
          <CallingCardFieldList>
            <CallingCardField
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Status"
              value={title.status}
              fallback="No status recorded"
            />
          </CallingCardFieldList>
          {title.is_legacy_transferred && (
            <Badge variant="outline" className="mt-2 shrink-0 text-[10px]">
              Legacy Title
            </Badge>
          )}
        </div>
      </div>
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

