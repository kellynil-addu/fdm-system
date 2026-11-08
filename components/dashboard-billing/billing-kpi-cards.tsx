'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import { formatCentavosToPhp } from '@/lib/status-colors';

export function BillingKpiCards() {
  const { accounts, counts } = useBillingAccounts();

  const metrics = useMemo(() => {
    let totalOutstanding = 0;
    let totalCollected = 0;

    for (const a of accounts) {
      totalOutstanding += Number(a.outstanding_principal ?? a.remaining_balance ?? 0);
      totalCollected += Number(a.total_principal_paid ?? a.total_paid ?? 0);
    }

    return {
      totalOutstanding,
      totalCollected,
    };
  }, [accounts]);

  const inArrearsCount = counts.in_arrears ?? counts.delinquent ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Outstanding Receivables */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Receivables
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
          {formatCentavosToPhp(metrics.totalOutstanding)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Remaining principal across active portfolio
        </p>
      </Card>

      {/* 2. Total Collected */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Collected
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
          {formatCentavosToPhp(metrics.totalCollected)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Principal paid to date
        </p>
      </Card>

      {/* 3. In Arrears Accounts */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            In Arrears
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-warning">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {inArrearsCount}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Accounts with past-due installments
        </p>
      </Card>

      {/* 4. Active Contracts */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Accounts
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {counts.active ?? 0}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Regular monthly amortization contracts
        </p>
      </Card>
    </div>
  );
}
