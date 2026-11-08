'use client';

import { Plus } from 'lucide-react';
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
import type { BillingPostDatedCheck } from '@/lib/types/billing';

interface BillingPdcTabProps {
  pdcs: BillingPostDatedCheck[];
  onOpenAddModal: () => void;
  canEdit: boolean;
}

export function BillingPdcTab({ pdcs, onOpenAddModal, canEdit }: BillingPdcTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Post-Dated Checks On Hand</h3>
          <p className="text-xs text-muted-foreground">
            Customer checks tendered for future amortization maturities.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={onOpenAddModal} className="h-7 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Check
          </Button>
        )}
      </div>

      {pdcs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">No post-dated checks on file</p>
          <p className="text-xs text-muted-foreground mt-1">
            Register buyer post-dated checks to track upcoming bank deposits.
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto rounded-lg border border-border">
          <Table className="w-full text-xs">
            <TableHeader className="bg-muted/40 border-b border-border">
              <TableRow>
                <TableHead className="text-xs font-semibold">Bank</TableHead>
                <TableHead className="text-xs font-semibold">Check #</TableHead>
                <TableHead className="text-xs font-semibold">Maturity Date</TableHead>
                <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-center text-xs font-semibold pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pdcs.map((check) => (
                <TableRow key={check.check_id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{check.bank_name}</TableCell>
                  <TableCell className="font-mono text-foreground">{check.check_number}</TableCell>
                  <TableCell className="font-mono">{check.check_date}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    {formatCentavosToPhp(Number(check.amount || 0))}
                  </TableCell>
                  <TableCell className="text-center pr-4">
                    <Badge
                      variant={
                        check.status === 'cleared'
                          ? 'success'
                          : check.status === 'returned'
                          ? 'destructive'
                          : check.status === 'deposited'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-[10px] uppercase font-semibold capitalize"
                    >
                      {check.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
