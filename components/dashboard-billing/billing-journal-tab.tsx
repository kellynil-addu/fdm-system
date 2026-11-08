'use client';

import { ArrowDownLeft, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCentavosToPhp } from '@/lib/status-colors';
import type { BillingTransaction } from '@/lib/types/billing';

interface BillingJournalTabProps {
  transactions: BillingTransaction[];
  onReverseTransaction: (txn: BillingTransaction) => void;
  canEdit: boolean;
}

export function BillingJournalTab({
  transactions,
  onReverseTransaction,
  canEdit,
}: BillingJournalTabProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No journal entries recorded"
        description="Payments, penalty charges, and fee adjustments will appear sequentially in this ledger."
      />
    );
  }

  const getTypeBadge = (type: string, isReversed: boolean) => {
    if (isReversed) {
      return (
        <Badge variant="outline" shape="pill" className="text-[10px] line-through text-muted-foreground">
          {type}
        </Badge>
      );
    }
    switch (type) {
      case 'payment':
        return <Badge variant="success" shape="pill" dot className="text-[10px] uppercase font-semibold">Payment</Badge>;
      case 'penalty_charge':
        return <Badge variant="warning" shape="pill" dot className="text-[10px] uppercase font-semibold">Penalty</Badge>;
      case 'reversal':
        return <Badge variant="destructive" shape="pill" dot className="text-[10px] uppercase font-semibold">Reversal</Badge>;
      default:
        return <Badge variant="secondary" shape="pill" dot className="text-[10px] uppercase font-semibold">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Append-Only Transaction Ledger</h3>
          <p className="text-xs text-muted-foreground">
            Strict sequential journal history with cryptographic and audit immutability.
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {transactions.length} record{transactions.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="relative w-full overflow-x-auto rounded-lg border border-border">
        <Table className="w-full text-xs">
          <TableHeader className="bg-card border-b border-border">
            <TableRow className="bg-card hover:bg-card">
              <TableHead className="w-16 text-center text-xs font-semibold">Seq #</TableHead>
              <TableHead className="w-28 text-xs font-semibold">Value Date</TableHead>
              <TableHead className="w-24 text-center text-xs font-semibold">Type</TableHead>
              <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
              <TableHead className="text-xs font-semibold">Remarks / Receipt</TableHead>
              <TableHead className="text-center text-xs font-semibold">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold pr-4">Audit Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((txn) => {
              const isPayment = txn.transaction_type === 'payment';
              const isReversal = txn.transaction_type === 'reversal';

              return (
                <TableRow
                  key={txn.transaction_id}
                  className={`hover:bg-muted/50 transition-colors ${
                    txn.is_reversed ? 'opacity-60 bg-muted/20' : ''
                  }`}
                >
                  {/* Monotonic sequence number */}
                  <TableCell className="text-center font-mono font-bold text-muted-foreground">
                    #{txn.transaction_sequence}
                  </TableCell>

                  {/* Value Date */}
                  <TableCell className="font-mono text-foreground font-medium">
                    {txn.value_date}
                  </TableCell>

                  {/* Transaction Type */}
                  <TableCell className="text-center">
                    {getTypeBadge(txn.transaction_type, txn.is_reversed)}
                  </TableCell>

                  {/* Amount with sign */}
                  <TableCell
                    className={`text-right font-mono font-semibold ${
                      isReversal
                        ? 'text-destructive'
                        : isPayment
                        ? 'text-success'
                        : 'text-foreground'
                    }`}
                  >
                    {isReversal ? '-' : ''}
                    {formatCentavosToPhp(Number(txn.amount || 0))}
                  </TableCell>

                  {/* Remarks & details */}
                  <TableCell className="max-w-[220px] truncate text-muted-foreground" title={txn.remarks ?? ''}>
                    {txn.remarks ?? '—'}
                  </TableCell>

                  {/* Reversal indicator */}
                  <TableCell className="text-center">
                    {txn.is_reversed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Reversed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </span>
                    )}
                  </TableCell>

                  {/* Reversal Action */}
                  <TableCell className="text-right pr-4">
                    {canEdit && isPayment && !txn.is_reversed && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onReverseTransaction(txn)}
                        className="h-6 gap-1 px-2 text-[10px]"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reverse
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
