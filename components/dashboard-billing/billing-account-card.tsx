'use client';

import { useMemo } from 'react';
import { Clock, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordCard } from '@/components/ui/record-card';
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
  const { setActiveAccount, setActiveModal, canEdit } = useBillingAccounts();

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
    <RecordCard
      label={`Open billing ledger for ${clientName}, ${lotLabel}`}
      onClick={() => setActiveAccount(account)}
      status={cardStatus}
    >
      {/*
        Both subjects are `embedded`: the account is the record here, and its
        ledger is what a click opens. A lot that linked to the map and a client
        that linked to their profile would each be a second destination inside a
        card that already has one.
      */}
      <PropertyCallingCard property={account.property} tier="compact" embedded />
      <ClientCallingCard
        client={account.client ?? { full_name: clientName, client_id: null }}
        tier="compact"
        embedded
      />

      {/*
        `w-full` claims its own line from the body's wrap, the same way the
        co-buyer list does on a legal card. The wrapper stops propagation so
        pressing Pay opens the payment modal rather than also opening the
        ledger underneath it.
      */}
      <div
        className="flex w-full flex-wrap items-center justify-between gap-2 px-1 pt-1"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {CURRENCY.format(account.monthly_amortization)}/mo · {account.payments.length}{' '}
          receipt{account.payments.length === 1 ? '' : 's'}
        </span>

        <div className="flex items-center gap-1.5">
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
    </RecordCard>
  );
}
