'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StatementPrintPayload } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BillingStatementViewProps {
  statement: StatementPrintPayload;
}

export function BillingStatementView({ statement }: BillingStatementViewProps) {
  const { account, contract_baseline_terms, applied_arrangement, schedule, payments, totals } =
    statement;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Statement of Account
          </h1>
          <p className="text-xs text-muted-foreground">
            Official customer billing statement and audit breakdown
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Statement
        </Button>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="border-b border-border pb-4">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                FIRST DAVAO MILLENNIUM
              </h2>
              <p className="text-xs text-muted-foreground">
                Statement Date: {statement.statement_date}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Account Ref</p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {account.account_id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
              Buyer Details
            </p>
            <p className="text-sm font-bold text-foreground">
              {account.client?.full_name ?? 'Buyer Name on File'}
            </p>
            <p className="text-muted-foreground">
              TIN: {account.client?.tin_number ?? '—'}
            </p>
            <p className="text-muted-foreground">
              Civil Status: {account.client?.civil_status ?? '—'}{' '}
              {account.client?.spouse_name ? `(Spouse: ${account.client.spouse_name})` : ''}
            </p>
          </div>

          <div className="space-y-1 sm:text-right">
            <p className="font-semibold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
              Property Lot Details
            </p>
            <p className="text-sm font-bold text-foreground">
              Block {account.property.block_number} Lot {account.property.lot_number}
            </p>
            <p className="text-muted-foreground">
              Location: {account.property.location} ({account.property.area_size} sqm)
            </p>
            <p className="text-muted-foreground">
              Total Selling Price: {CURRENCY.format(contract_baseline_terms.monthly_installment * contract_baseline_terms.original_terms_months)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3 text-xs bg-muted/20 space-y-1">
          <p className="font-semibold text-foreground">Governing Policy</p>
          <p className="text-muted-foreground">
            {applied_arrangement.policy_name} ({applied_arrangement.rate_percent}% penalty) — {applied_arrangement.authority}
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Installment Schedule Breakdown
          </h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs">Due Date</TableHead>
                  <TableHead className="text-right text-xs">Monthly Due</TableHead>
                  <TableHead className="text-center text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((row) => (
                  <TableRow key={row.installment_number}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {row.installment_number}
                    </TableCell>
                    <TableCell className="text-xs">{row.due_date}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {CURRENCY.format(row.amount)}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <Badge
                        variant={row.status === 'paid' ? 'outline' : 'secondary'}
                        className="capitalize text-[10px]"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Receipts History
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">OR Date</TableHead>
                    <TableHead className="text-xs">OR Number</TableHead>
                    <TableHead className="text-xs">Mode</TableHead>
                    <TableHead className="text-right text-xs">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{p.payment_date}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {p.or_number}
                      </TableCell>
                      <TableCell className="text-xs">{p.payment_mode}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-success">
                        {CURRENCY.format(p.total_received)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex flex-col items-end space-y-1 text-xs">
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Principal Balance:</span>
              <span className="font-mono font-semibold">{CURRENCY.format(totals.principal_balance)}</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Penalties Due:</span>
              <span className="font-mono font-semibold">{CURRENCY.format(totals.penalties_balance)}</span>
            </div>
            {totals.overpayment_credit > 0 && (
              <div className="flex justify-between w-64 text-success">
                <span>Overpayment Credit:</span>
                <span className="font-mono font-semibold">-{CURRENCY.format(totals.overpayment_credit)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 border-t border-border pt-2 text-sm font-bold text-foreground">
              <span>Total Amount Due:</span>
              <span className="font-mono">{CURRENCY.format(totals.net_total_due)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
