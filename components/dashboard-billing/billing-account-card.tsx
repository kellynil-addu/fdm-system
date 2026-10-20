'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  MapPin,
  Receipt,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BILLING_STATUS_VARIANT } from '@/lib/status-colors';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
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

  return (
    <Card
      variant="interactive"
      className="group flex flex-col justify-between p-4 transition-all duration-150 hover:border-primary"
      onClick={() => setActiveAccount(account)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveAccount(account);
        }
      }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary transition-colors">
              {clientName}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {lotLabel} · {account.property.location}
              </span>
            </div>
          </div>
          <Badge
            variant={BILLING_STATUS_VARIANT[derivedStatus]}
            shape="pill"
            dot
            className="shrink-0"
          >
            {derivedStatus}
          </Badge>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Principal Balance</span>
            <span className="font-semibold text-foreground">
              {CURRENCY.format(remaining)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-row-hover">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{percentPaid}% paid of {CURRENCY.format(tcp)}</span>
            <span>{CURRENCY.format(account.monthly_amortization)}/mo</span>
          </div>
        </div>

        {account.active_compromise && (
          <div className="flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--accent-gold)_15%,white)] px-2.5 py-1 text-xs text-accent-gold-foreground">
            <Coins className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Amnesty: {CURRENCY.format(account.active_compromise.agreed_penalty)} (Saved {CURRENCY.format(account.active_compromise.waiver_amount)})
            </span>
          </div>
        )}

        {account.notices.length > 0 && !account.cleared_at && (
          <div className="flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--destructive)_12%,white)] px-2.5 py-1 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {account.notices[0].notice_type} ({account.notices[0].delivery_status})
            </span>
          </div>
        )}

        {account.cleared_at && (
          <div className="flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--success)_12%,white)] px-2.5 py-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Cleared for Title Handover</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {account.payments.length} receipt{account.payments.length === 1 ? '' : 's'}
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
    </Card>
  );
}
