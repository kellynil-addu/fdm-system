'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calculateAccountLedgerSchedule } from '@/lib/billing/calculator';
import type { BillingAccountSummary } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BillingStatementTableProps {
  account: BillingAccountSummary;
}

export function BillingStatementTable({ account }: BillingStatementTableProps) {
  const schedule = useMemo(() => {
    return calculateAccountLedgerSchedule(account);
  }, [account]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Contract TSP
          </p>
          <p className="mt-1 text-base font-bold text-foreground">
            {CURRENCY.format(schedule.tsp)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Total Paid
          </p>
          <p className="mt-1 text-base font-bold text-success">
            {CURRENCY.format(schedule.total_amount_paid)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Remaining TSP
          </p>
          <p className="mt-1 text-base font-bold text-foreground">
            {CURRENCY.format(schedule.principal_balance)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">
            Accrued Penalty
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-base font-bold text-destructive">
              {CURRENCY.format(schedule.effective_penalties)}
            </p>
            {schedule.waiver_savings > 0 && (
              <span className="text-[10px] text-muted-foreground line-through">
                {CURRENCY.format(schedule.total_penalties)}
              </span>
            )}
          </div>
        </Card>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-[850px]">
            <TableHeader className="bg-row-hover sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-14 text-center text-xs">Inst #</TableHead>
                <TableHead className="w-28 text-xs">Due Date</TableHead>
                <TableHead className="w-28 text-xs">Date Paid</TableHead>
                <TableHead className="w-32 text-right text-xs">Monthly Due</TableHead>
                <TableHead className="w-32 text-right text-xs">Amount Paid</TableHead>
                <TableHead className="w-28 text-right text-xs">Penalty</TableHead>
                <TableHead className="w-36 text-right text-xs">Principal Balance</TableHead>
                <TableHead className="w-32 text-xs">Receipt #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.schedule_rows.map((row) => {
                const isPaid = row.amount_paid > 0;
                const hasPenalty = row.penalty_charged > 0;

                return (
                  <TableRow
                    key={row.installment_no}
                    className={isPaid ? undefined : 'opacity-80'}
                  >
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {row.installment_no}
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                      {row.due_date}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.paid_date || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">
                      {CURRENCY.format(row.monthly_due)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {row.amount_paid > 0 ? (
                        <span className="text-success">{CURRENCY.format(row.amount_paid)}</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {hasPenalty ? (
                        <span className="text-destructive font-medium">
                          {CURRENCY.format(row.penalty_charged)}
                        </span>
                      ) : (
                        '0.00'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">
                      {CURRENCY.format(row.tsp_outstanding_balance)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.receipt_no ? (
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {row.receipt_no}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
