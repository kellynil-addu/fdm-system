'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Clock, Receipt, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubjectSplitCard } from '@/components/ui/subject-split-card';
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
    /*
      The lot and the buyer sit side by side in the band, each with its own
      accent bar — see `SubjectSplitCard`. The account's own status is not passed
      to the band: it belongs to the account rather than to either subject, and
      the card renders it once in the status bar at the bottom.
    */
    <SubjectSplitCard
      label={`Open billing ledger for ${clientName}, ${lotLabel}`}
      onClick={() => setActiveAccount(account)}
      lot={{
        ...account.property,
        // The account's own contract price, which is what it is actually billed
        // on and can differ from area × rate.
        total_price: tcp,
      }}
      buyer={account.client}
      buyerFallback={clientName}
      status={cardStatus}
    >
      {/*
        The amortization line and the account's actions. The wrapper stops
        propagation so pressing Pay opens the payment modal rather than also
        opening the ledger underneath it.
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
    </SubjectSplitCard>
  );
}
