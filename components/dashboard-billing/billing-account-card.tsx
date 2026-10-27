'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Clock, Receipt, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBar } from '@/components/ui/status-bar';
import { ClientCallingCard } from '@/components/dashboard-clients/client-calling-card';
import { PropertyCallingCard } from '@/components/dashboard-properties/property-calling-card';
import { BILLING_STATUS_VARIANT } from '@/lib/status-colors';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import type { CallingCardStatus } from '@/lib/types/calling-card';
import type { BillingAccountSummary } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

interface BillingAccountCardProps {
  account: BillingAccountSummary;
}

export function BillingAccountCard({ account }: BillingAccountCardProps) {
  const { setActiveAccount, setActiveModal, canEdit, cameFromClient } = useBillingAccounts();

  const clientName = account.client?.full_name ?? 'Unassigned Client';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;
  const tcp = Number(account.total_contract_price || 0);
  const remaining = Number(account.remaining_balance || 0);
  const paid = Math.max(0, tcp - remaining);
  const percentPaid = tcp > 0 ? Math.min(100, Math.round((paid / tcp) * 100)) : 0;

  const derivedStatus = useMemo(() => {
    if (account.cleared_at) return 'Cleared';
    if (
      account.contract_end_date &&
      new Date(account.contract_end_date).getTime() < Date.now() &&
      remaining > 0
    ) {
      return 'Matured';
    }
    if (account.notices.length > 0 || Number(account.baseline_penalties_accrued) > 0) {
      return 'Delinquent';
    }
    return 'Active';
  }, [account, remaining]);

  /**
   * The one thing worth saying beside the status, in priority order.
   *
   * A notice outranks everything: it is a demand with a deadline attached, and
   * it is the reason a clerk opened this page. An amnesty outranks the balance
   * because it changes what the balance *means* — the buyer is on an agreed
   * payment plan, so the number is not simply overdue. Only when neither
   * applies does the bar fall back to how far along the payments are, which is
   * the number that is true of every account and therefore the least
   * informative.
   *
   * The old card stacked all three as separate rows, so a delinquent account on
   * an amnesty with a notice spent four rows saying what the bar says in one,
   * and still had nowhere to put the remaining balance.
   */
  const notice = !account.cleared_at && account.notices[0]
    ? `${account.notices[0].notice_type} (${account.notices[0].delivery_status})`
    : null;
  const amnesty = account.active_compromise
    ? `Amnesty ${CURRENCY.format(account.active_compromise.agreed_penalty)} · saved ${CURRENCY.format(account.active_compromise.waiver_amount)}`
    : null;

  const cardStatus: CallingCardStatus = {
    label: derivedStatus,
    tone: BILLING_STATUS_VARIANT[derivedStatus] ?? 'muted',
    detail: notice ?? amnesty ?? `${percentPaid}% paid of ${CURRENCY.format(tcp)}`,
    progress: percentPaid,
    trailing: CURRENCY.format(remaining),
  };

  return (
    <Card
      variant="calling-card"
      padding="none"
      onClick={() => setActiveAccount(account)}
      role="button"
      tabIndex={0}
      aria-label={`Open billing ledger for ${clientName}, ${lotLabel}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActiveAccount(account);
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden text-left transition-shadow hover:shadow-md"
    >
      {/*
        The lot is the record and the buyer is a field of it — one card, one
        rail, one monogram, one status bar. Two side-by-side compact cards gave
        a single record two identities for no gain: the second header repeated
        the first, and the second rail and monogram re-announced a card that had
        already started.

        `default` rather than `compact` because the nesting needs a field list
        to sit under, and compact deliberately has none.

        Everything nested is `embedded`: this card is already the click target,
        so a lot that linked to the map or a buyer that linked to their profile
        would be a second destination inside it, and an anchor inside an anchor
        is invalid markup.
      */}
      {/*
        No `status` here. The status belongs to the account, not the lot, and
        this card renders it once at the bottom — passing it here as well drew a
        second bar in the middle of the card, because `embedded` drops the
        border and the reveal but not the status strip.
      */}
      <PropertyCallingCard
        property={account.property}
        embedded
        className="border-0"
      >
        {/*
          No rule above the buyer: `PropertyCallingCard` already draws one
          before its `children`, and adding another produced two lines a few
          pixels apart.
        */}
        <ClientCallingCard
          client={account.client ?? { full_name: clientName, client_id: null }}
          tier="compact"
          embedded
          hideMonogram
          hideEyebrow
        />
      </PropertyCallingCard>

      {/*
        The rail and the amortization line are no longer the only decoration, so
        this is no longer a `RecordCard`: that primitive exists for a card whose
        body is a set of small blocks above a status strip, and its `p-3`
        wrapper would indent the nested lot card away from the rail it is
        supposed to sit against. The status bar is placed directly instead.

        The wrapper stops propagation so pressing Pay opens the payment modal
        rather than also opening the ledger underneath it.
      */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 pt-1 pb-2"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {CURRENCY.format(account.monthly_amortization)}/mo · {account.payments.length}{' '}
          receipt{account.payments.length === 1 ? '' : 's'}
        </span>

        <div className="flex items-center gap-1.5">
          {/*
            Only when the account was reached from a client's lot card, which is
            the one route into Billing that leaves a trail back. A clerk
            following that link has a client in mind; without this they land on
            a ledger with no way home but the sidebar.
          */}
          {cameFromClient && (
            <Link
              href={`/dashboard/clients/${cameFromClient}`}
              className="group flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Back to client
            </Link>
          )}
          {canEdit && !account.cleared_at && (
            <Button
              variant="quiet"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setActiveModal({ type: 'payment', account })}
            >
              <Receipt className="h-3.5 w-3.5" />
              Pay
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setActiveAccount(account)}
          >
            Ledger
          </Button>
        </div>
      </div>

      <StatusBar
        tone={cardStatus.tone}
        status={cardStatus.label}
        detail={cardStatus.detail}
        progress={cardStatus.progress}
        trailing={cardStatus.trailing}
      />
    </Card>
  );
}
