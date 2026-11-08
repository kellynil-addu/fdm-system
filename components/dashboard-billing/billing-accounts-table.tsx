'use client';

import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Banknote, Calendar, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
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
import { formatCentavosToPhp, getBillingStatusLabel, getBillingStatusVariant } from '@/lib/status-colors';
import type { BillingAccountSummary } from '@/lib/types/billing';

interface BillingAccountsTableProps {
  accounts: BillingAccountSummary[];
  onOpenPaymentModal: (account: BillingAccountSummary) => void;
  canEdit: boolean;
}

export function BillingAccountsTable({
  accounts,
  onOpenPaymentModal,
  canEdit,
}: BillingAccountsTableProps) {
  const router = useRouter();

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <p className="text-sm font-medium">No matching billing accounts found</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting search criteria or clearing status filters.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto">
      <Table className="w-full text-xs">
        <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border">
          <TableRow>
            <TableHead className="w-[200px] text-xs font-semibold">Buyer</TableHead>
            <TableHead className="w-[180px] text-xs font-semibold">Property Lot</TableHead>
            <TableHead className="text-right text-xs font-semibold">Total Price</TableHead>
            <TableHead className="text-right text-xs font-semibold">Principal Due</TableHead>
            <TableHead className="text-center text-xs font-semibold">Aging / Arrears</TableHead>
            <TableHead className="text-center text-xs font-semibold">Status</TableHead>
            <TableHead className="text-right text-xs font-semibold pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const rawStatus = account.cleared_at
              ? 'cleared'
              : String(account.status || '').toLowerCase();
            const statusLabel = getBillingStatusLabel(rawStatus);
            const statusVariant = getBillingStatusVariant(rawStatus);
            const monthsBehind = account.installments_behind ?? 0;
            const penaltiesDue = Number(account.penalties_due || 0);
            const hasArrears = monthsBehind > 0 || penaltiesDue > 0;

            return (
              <TableRow
                key={account.account_id}
                onClick={() => router.push(`/dashboard/billing/${account.account_id}`)}
                className="cursor-pointer hover:bg-muted/50 transition-colors group"
              >
                {/* Buyer Name & Info */}
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {account.client?.full_name ?? 'Unassigned Lot'}
                    </span>
                    {account.client?.tin_number && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        TIN: {account.client.tin_number}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Property Lot Coordinates */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground">
                      Blk {account.property.block_number}, Lot {account.property.lot_number}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                      {account.property.location}
                    </span>
                  </div>
                </TableCell>

                {/* Total Contract Price */}
                <TableCell className="text-right font-mono font-medium text-muted-foreground">
                  {formatCentavosToPhp(account.total_contract_price || account.total_selling_price || 0)}
                </TableCell>

                {/* Remaining Principal Balance */}
                <TableCell className="text-right font-mono font-semibold text-foreground">
                  {formatCentavosToPhp(account.outstanding_principal ?? account.remaining_balance ?? 0)}
                </TableCell>

                {/* Aging & Arrears breakdown */}
                <TableCell className="text-center">
                  {hasArrears ? (
                    <div className="inline-flex items-center gap-1.5 text-warning font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      <span>{monthsBehind} mo{monthsBehind === 1 ? '' : 's'} behind</span>
                    </div>
                  ) : account.cleared_at ? (
                    <div className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Cleared</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Current</span>
                  )}
                </TableCell>

                {/* Canonical Status Badge */}
                <TableCell className="text-center">
                  <Badge variant={statusVariant} className="text-[10px] uppercase font-semibold tracking-wider">
                    {statusLabel}
                  </Badge>
                </TableCell>

                {/* Quick Actions */}
                <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {canEdit && !account.cleared_at && rawStatus !== 'forfeited' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenPaymentModal(account)}
                        className="h-7 gap-1 px-2 text-[11px]"
                      >
                        <Banknote className="h-3 w-3 text-success" />
                        Pay
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/billing/${account.account_id}`)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      aria-label="View Account Ledger"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
