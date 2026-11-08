'use client';

import { ShieldCheck, Plus, CheckCircle2, Clock } from 'lucide-react';
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
import { formatCentavosToPhp } from '@/lib/status-colors';
import type { BillingAccountSummary, LedgerCompromise } from '@/lib/types/billing';

interface BillingPenaltiesTabProps {
  account: BillingAccountSummary;
  onOpenPenaltyModal: () => void;
  canEdit: boolean;
}

export function BillingPenaltiesTab({
  account,
  onOpenPenaltyModal,
  canEdit,
}: BillingPenaltiesTabProps) {
  const compromises: LedgerCompromise[] = account.compromises ?? [];
  const activeCompromise = account.active_compromise;

  return (
    <div className="space-y-6">
      {/* Policy Summary Card */}
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Penalty Arrangement &amp; Accrual Policy
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Default practice applies 3.5% on overdue monthly installments after the 30-day grace period.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={onOpenPenaltyModal} className="h-7 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Manage Policy / Waiver
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-4 pt-4 border-t border-border/60">
          <div>
            <span className="text-[11px] text-muted-foreground">Accrued Penalties</span>
            <p className="text-sm font-mono font-bold text-foreground">
              {formatCentavosToPhp(account.penalties_accrued ?? 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">Penalties Waived</span>
            <p className="text-sm font-mono font-bold text-success">
              {formatCentavosToPhp(account.penalties_waived ?? 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">Penalties Paid</span>
            <p className="text-sm font-mono font-bold text-foreground">
              {formatCentavosToPhp(account.total_penalty_paid ?? 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">Net Penalties Due</span>
            <p className="text-sm font-mono font-bold text-warning">
              {formatCentavosToPhp(account.penalties_due ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Compromise Agreements History */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Executive Compromise &amp; Waiver Agreements
        </h4>
        {compromises.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-xs text-muted-foreground">
            No executive compromise agreements on file for this account.
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto rounded-lg border border-border">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Agreement Date</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Original Penalty</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Waiver Amount</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Settlement Amount</TableHead>
                  <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold pr-4">Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compromises.map((c) => (
                  <TableRow key={c.compromise_id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-foreground font-medium">
                      {c.created_at ? c.created_at.split('T')[0] : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCentavosToPhp(Number(c.original_penalty || 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-success">
                      {formatCentavosToPhp(Number(c.waiver_amount || 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {formatCentavosToPhp(Number(c.agreed_penalty || 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={c.status === 'Approved' || c.status === 'Fulfilled' ? 'success' : 'secondary'}
                        className="text-[10px] uppercase font-semibold"
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-muted-foreground">
                      {c.approved_by ?? 'Management'}
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
