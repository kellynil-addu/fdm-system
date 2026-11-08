'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { IconBox } from '@/components/ui/icon-box';
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
      <Card variant="canvas" padding="default">
        <div className="flex items-center justify-between">
          <CardTitle size="sm" className="uppercase tracking-wider text-muted-foreground font-semibold text-[11px]">
            Total Receivables
          </CardTitle>
          <IconBox variant="canvas" size="default" shape="square" className="text-primary">
            <Wallet className="h-4 w-4" />
          </IconBox>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
          {formatCentavosToPhp(metrics.totalOutstanding)}
        </p>
        <CardDescription className="mt-1 text-xs">
          Remaining principal across active portfolio
        </CardDescription>
      </Card>

      {/* 2. Total Collected */}
      <Card variant="canvas" padding="default">
        <div className="flex items-center justify-between">
          <CardTitle size="sm" className="uppercase tracking-wider text-muted-foreground font-semibold text-[11px]">
            Total Collected
          </CardTitle>
          <IconBox variant="canvas" size="default" shape="square" className="text-success">
            <CheckCircle2 className="h-4 w-4" />
          </IconBox>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
          {formatCentavosToPhp(metrics.totalCollected)}
        </p>
        <CardDescription className="mt-1 text-xs">
          Principal settled to date
        </CardDescription>
      </Card>

      {/* 3. In Arrears Accounts */}
      <Card variant="canvas" padding="default">
        <div className="flex items-center justify-between">
          <CardTitle size="sm" className="uppercase tracking-wider text-muted-foreground font-semibold text-[11px]">
            In Arrears
          </CardTitle>
          <IconBox variant="canvas" size="default" shape="square" className="text-warning">
            <AlertTriangle className="h-4 w-4" />
          </IconBox>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {inArrearsCount}
        </p>
        <CardDescription className="mt-1 text-xs">
          Accounts with past-due installments
        </CardDescription>
      </Card>

      {/* 4. Active Contracts */}
      <Card variant="canvas" padding="default">
        <div className="flex items-center justify-between">
          <CardTitle size="sm" className="uppercase tracking-wider text-muted-foreground font-semibold text-[11px]">
            Active Accounts
          </CardTitle>
          <IconBox variant="canvas" size="default" shape="square">
            <Clock className="h-4 w-4" />
          </IconBox>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {counts.active ?? 0}
        </p>
        <CardDescription className="mt-1 text-xs">
          Regular monthly amortization contracts
        </CardDescription>
      </Card>
    </div>
  );
}
