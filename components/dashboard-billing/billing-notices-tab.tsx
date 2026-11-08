'use client';

import { useMemo } from 'react';
import { Mail, AlertTriangle, FileText, Lock, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import type { BillingAccountSummary, BillingAccountNotice } from '@/lib/types/billing';

interface BillingNoticesTabProps {
  account: BillingAccountSummary;
  onOpenNoticeModal?: () => void;
  onOpenLotHoldDialog: () => void;
  canEdit: boolean;
}

export function BillingNoticesTab({
  account,
  onOpenNoticeModal,
  onOpenLotHoldDialog,
  canEdit,
}: BillingNoticesTabProps) {
  const notices: BillingAccountNotice[] = account.notices ?? [];
  const isForfeited = String(account.status || '').toLowerCase() === 'forfeited';

  const maceda = useMemo(() => {
    const paidMonths = Math.min(
      account.terms_months || 60,
      Math.round(
        (Number(account.total_principal_paid || 0) /
          (Number(account.monthly_amortization) || 1))
      )
    );
    return computeMacedaCashSurrenderValue({
      totalInstallmentsPaid: Number(account.total_principal_paid || 0),
      installmentsPaidMonths: paidMonths,
      authorizedDeductions: Number(account.penalties_due || 0),
    });
  }, [account]);

  return (
    <div className="space-y-6">
      {/* Forfeiture Hold Banner if applicable */}
      {isForfeited && (
        <Alert variant="destructive" className="border-[color-mix(in_srgb,var(--destructive)_40%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_12%,white)]">
          <Lock className="h-4 w-4" />
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div>
              <AlertTitle>Forfeiture Hold Active (FR-060)</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                This lot is legally locked from assignment or resale until formal grace periods elapse.
              </AlertDescription>
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
        </Alert>
      )}

      {/* Maceda Statutory Surrender Card */}
      <Card variant="default" padding="default" className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Statutory Maceda Law Evaluation (RA 6552)
            </h4>
          </div>
          <Badge
            variant={maceda.eligibleForRefund ? 'success' : 'secondary'}
            shape="pill"
            dot
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
      </Card>

      {/* Demand Notice History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Demand Letter &amp; Notice History
          </h4>
          <span className="text-xs text-muted-foreground font-mono">{notices.length} notice(s)</span>
        </div>

        {notices.length === 0 ? (
          <EmptyState
            title="No demand notices on file"
            description="No formal notices or demand letters recorded on this account."
          />
        ) : (
          <div className="relative w-full overflow-x-auto rounded-lg border border-border">
            <Table className="w-full text-xs">
              <TableHeader className="bg-card border-b border-border">
                <TableRow className="bg-card hover:bg-card">
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
                        shape="pill"
                        dot
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
