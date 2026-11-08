'use client';

import { Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import type { BillingSchedule } from '@/lib/types/billing';

interface BillingScheduleTabProps {
  schedule: BillingSchedule | null;
  totalPaid: number;
}

export function BillingScheduleTab({ schedule, totalPaid }: BillingScheduleTabProps) {
  if (!schedule || !schedule.installments || schedule.installments.length === 0) {
    return (
      <EmptyState
        title="No explicit installment schedule found"
        description="This account may be unamortized or waiting for initial schedule generation."
      />
    );
  }

  const today = new Date().toISOString().split('T')[0];
  let remainingPaidPool = totalPaid;

  const installments = [...schedule.installments].sort(
    (a, b) => a.installment_number - b.installment_number
  );

  return (
    <div className="space-y-4">
      {/* Schedule Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Installment Schedule (Version {schedule.version})
            </h3>
            {schedule.is_active ? (
              <Badge variant="success" shape="pill" dot className="text-[10px] uppercase font-semibold">
                Active Schedule
              </Badge>
            ) : (
              <Badge variant="outline" shape="pill" className="text-[10px] text-muted-foreground">
                Archived Version
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {schedule.term_months} months amortization starting {schedule.effective_date}
            {schedule.reason ? ` (${schedule.reason})` : ''}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="relative w-full overflow-x-auto rounded-lg border border-border">
        <Table className="w-full text-xs">
          <TableHeader className="bg-card border-b border-border">
            <TableRow className="bg-card hover:bg-card">
              <TableHead className="w-16 text-center text-xs font-semibold">#</TableHead>
              <TableHead className="w-32 text-xs font-semibold">Due Date</TableHead>
              <TableHead className="text-right text-xs font-semibold">Monthly Due</TableHead>
              <TableHead className="text-right text-xs font-semibold">Settled</TableHead>
              <TableHead className="text-center text-xs font-semibold pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((inst) => {
              const amount = Number(inst.amount);
              let settledAmount = 0;
              let isPaid = false;

              if (remainingPaidPool >= amount) {
                settledAmount = amount;
                remainingPaidPool -= amount;
                isPaid = true;
              } else if (remainingPaidPool > 0) {
                settledAmount = remainingPaidPool;
                remainingPaidPool = 0;
              }

              const isPastDue = !isPaid && inst.due_date < today;

              return (
                <TableRow key={inst.installment_id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="text-center font-mono font-medium text-muted-foreground">
                    {inst.installment_number}
                  </TableCell>

                  <TableCell className="font-mono font-medium text-foreground">
                    {inst.due_date}
                  </TableCell>

                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    {formatCentavosToPhp(amount)}
                  </TableCell>

                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCentavosToPhp(settledAmount)}
                  </TableCell>

                  <TableCell className="text-center pr-4">
                    {isPaid ? (
                      <Badge variant="success" className="text-[10px] uppercase font-semibold">
                        Paid
                      </Badge>
                    ) : isPastDue ? (
                      <Badge variant="warning" className="text-[10px] uppercase font-semibold">
                        Overdue
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Upcoming
                      </Badge>
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
