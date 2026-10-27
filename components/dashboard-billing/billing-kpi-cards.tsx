'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export function BillingKpiCards() {
  const { accounts, counts } = useBillingAccounts();

  const metrics = useMemo(() => {
    let totalOutstanding = 0;
    let totalCollected = 0;

    for (const a of accounts) {
      totalOutstanding += Number(a.remaining_balance || 0);
      totalCollected += Number(a.total_principal_paid || 0);
    }

    return {
      totalOutstanding,
      totalCollected,
    };
  }, [accounts]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Accounts
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {counts.active}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Regular monthly amortization contracts
        </p>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Outstanding TSP
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-gold)_15%,transparent)] text-accent-gold-foreground">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {CURRENCY.format(metrics.totalOutstanding)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Unpaid contract principal balance
        </p>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Delinquent / Overdue
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--destructive)_12%,white)] text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {counts.delinquent + counts.matured}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {counts.matured} matured · {counts.delinquent} with notices
        </p>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cleared by Billing
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--success)_12%,white)] text-success">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {counts.cleared}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ready for Legal title handover
        </p>
      </Card>
    </div>
  );
}
