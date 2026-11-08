'use client';

import { useMemo } from 'react';
import { AlertTriangle, FileText, Lock, Unlock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { computeMacedaCashSurrenderValue } from '@/lib/billing/maceda';
import { formatCentavosToPhp } from '@/lib/status-colors';
import type { BillingAccountSummary } from '@/lib/types/billing';

interface BillingNoticesTabProps {
  account: BillingAccountSummary;
  onOpenLotHoldDialog: () => void;
  canEdit: boolean;
}

export function BillingNoticesTab({
  account,
  onOpenLotHoldDialog,
  canEdit,
}: BillingNoticesTabProps) {
  const notices = account.notices ?? [];
  const isForfeited = String(account.status || '').toLowerCase() === 'forfeited';

  // Compute Maceda Law statutory cash surrender values
  const maceda = useMemo(() => {
    const totalPaid = Number(account.total_principal_paid ?? account.total_paid ?? 0);
    const monthlyAmort = Number(account.monthly_amortization || 0);
    const estimatedMonths =
      monthlyAmort > 0
        ? Math.floor(totalPaid / monthlyAmort)
        : Math.floor(totalPaid / (Number(account.total_contract_price || 1) / (account.terms_months || 60)));

    return computeMacedaCashSurrenderValue({
      totalInstallmentsPaid: totalPaid,
      installmentsPaidMonths: estimatedMonths,
    });
  }, [account]);

  return (
    <div className="space-y-6">
      {/* Forfeiture Hold Banner if applicable */}
      {isForfeited && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <Lock className="h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">Forfeiture Hold Active (FR-060)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This lot is legally locked from assignment or resale until formal grace periods elapse.
                </p>
              </div>
            </div>
            {canEdit && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onOpenLotHoldDialog}
                className="gap-1.5 text-xs font-semibold shadow-sm"
              >
                <Unlock className="h-3.5 w-3.5" />
                Release Lot Hold
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Maceda Statutory Surrender Card */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Statutory Maceda Law Evaluation (RA 6552)
            </h4>
          </div>
          <Badge
            variant={maceda.eligibleForRefund ? 'success' : 'secondary'}
            className="text-[10px] uppercase font-semibold"
          >
            {maceda.eligibleForRefund ? 'Refund Eligible (>= 2 Years)' : 'Under 2 Years Paid'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-1">
          <div>
            <span className="text-[11px] text-muted-foreground">Paid Installment Months</span>
            <p className="text-sm font-mono font-bold text-foreground">
              {maceda.installmentsPaidMonths} months ({maceda.installmentsPaidYears} yrs)
            </p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">Statutory CSV Percentage</span>
            <p className="text-sm font-mono font-bold text-foreground">
              {maceda.statutoryPercentage}%
            </p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">Total Installments Paid</span>
            <p className="text-sm font-mono font-bold text-foreground">
              {formatCentavosToPhp(maceda.totalInstallmentsPaid)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">Statutory Surrender Value</span>
            <p className="text-sm font-mono font-bold text-primary">
              {formatCentavosToPhp(maceda.grossSurrenderValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Demand Notice History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Demand Letter &amp; Notice History
          </h4>
          <span className="text-xs text-muted-foreground font-mono">{notices.length} notice(s)</span>
        </div>

        {notices.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-xs text-muted-foreground">
            No formal notices or demand letters recorded on this account.
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto rounded-lg border border-border">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Notice Type</TableHead>
                  <TableHead className="text-xs font-semibold">Notice Date</TableHead>
                  <TableHead className="text-xs font-semibold">Delivery Status</TableHead>
                  <TableHead className="text-xs font-semibold">Dispatch Date</TableHead>
                  <TableHead className="text-xs font-semibold pr-4">Tracking / Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((n) => (
                  <TableRow key={n.notice_id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      {n.notice_type}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {n.notice_date}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          n.delivery_status === 'Delivered'
                            ? 'success'
                            : n.delivery_status === 'Return to Sender (RTS)'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[10px] uppercase font-semibold"
                      >
                        {n.delivery_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {n.dispatch_date ?? '—'}
                    </TableCell>
                    <TableCell className="pr-4 text-muted-foreground">
                      {n.tracking_number ? `Track: ${n.tracking_number}` : n.remarks ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
