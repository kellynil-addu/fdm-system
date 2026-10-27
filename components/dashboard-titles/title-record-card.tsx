'use client';

import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardCallingRail } from '@/components/ui/card';
import { IconBox } from '@/components/ui/icon-box';
import { StatusBar } from '@/components/ui/status-bar';
import {
  CallingCardHeader,
  CallingCardRule,
  CallingCardField,
  CallingCardFieldList,
} from '@/components/ui/card-calling-parts';
import { ClientCallingCard } from '@/components/dashboard-clients/client-calling-card';
import { PropertyCallingCard } from '@/components/dashboard-properties/property-calling-card';
import { getInitials } from '@/lib/utils/initials';
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
 * where the record stands.
 *
 * The lot is the record and the buyer is a field of it — one rail, one
 * monogram, one status bar. See `BillingAccountCard` for why the two subjects
 * are nested rather than placed side by side, as they were before.
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
      <Card
        variant="calling-card"
        padding="none"
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Open title intake for ${clientName}`}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
        className="group flex cursor-pointer flex-col overflow-hidden text-left transition-shadow hover:shadow-md"
      >
        {/* One card, one rail, one status bar. See `BillingAccountCard` for why
            the lot is the record and the buyer is a field of it. */}
        {/*
          No `status` here — it belongs to the title, not the lot, and this card
          renders it once at the bottom. See `BillingAccountCard`. No rule above
          the buyer either: the property card already draws one before its
          `children`.
        */}
        <PropertyCallingCard
          property={account.property}
          embedded
          className="border-0"
        >
          <ClientCallingCard
            client={account.client ?? { full_name: clientName, client_id: null }}
            tier="compact"
            embedded
            hideMonogram
            hideEyebrow
          />
          {account.co_buyers.length > 0 && (
            // `truncate` so a long list cannot push the card wider than its
            // cell — the same treatment it had before.
            <p className="w-full truncate pt-1.5 text-[11px] text-muted-foreground">
              With {account.co_buyers.join(', ')}
            </p>
          )}
        </PropertyCallingCard>
        {/* Placed directly rather than through `RecordCard`, whose `p-3` body
            would indent the lot card away from the rail it sits against. */}
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

  /**
   * The buyer, as a field of the lot rather than a card beside it.
   *
   * A released legacy title has no lot row at all, so the client has nothing to
   * nest inside and the card is built the other way round: the client is the
   * subject and the lot, when there is one, is a field. That is a different card
   * rather than a special case of the first — see the branch below.
   */
  const buyerBlock = title.client ? (
    <div className="border-t border-border-warm-subtle pt-2.5">
      <ClientCallingCard
        client={title.client}
        tier="compact"
        embedded
        hideMonogram
        hideEyebrow
      />
    </div>
  ) : (
    <p className="border-t border-border-warm-subtle pt-2.5 text-xs italic text-muted-foreground">
      No buyer recorded
    </p>
  );

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
      {title.property ? (
        <PropertyCallingCard
          property={title.property}
          status={status}
          embedded
          className="border-0"
        >
          {buyerBlock}
          {title.is_legacy_transferred && (
            <Badge variant="outline" className="mt-1.5 shrink-0 text-[10px]">
              Legacy Title
            </Badge>
          )}
        </PropertyCallingCard>
      ) : (
        // No lot to nest the buyer in, so the buyer leads. Built from the same
        // parts rather than from `ClientCallingCard`, whose field list is fixed
        // and whose destination is the client profile — neither of which is
        // right for a card whose click opens a title record.
        <div className="relative">
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
      )}
      {/* Placed directly rather than through `RecordCard`, whose `p-3` body
          would indent the lot card away from the rail it sits against. */}
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

/*
  The measurement these cards used to be tuned against is now obsolete and has
  been removed rather than kept: it described two compact cards sitting side by
  side, and the grid no longer does that. One fresh load per viewport was used;
  the cards sat side by side at 1600px and wider (cell 405px, card 147px tall)
  and stacked at 1440px and narrower (cell 351px, card 220px), missing by a
  single pixel at a 385px cell because of the `min-w-[11rem]` floor on the
  compact tier.

  The nested card has not been measured at all. It is a single column, so the
  floor that caused that crossover no longer applies to it — but "should be
  fine" is not a measurement, and this is a layout claim. Confirm it in the
  browser before trusting it.
*/
