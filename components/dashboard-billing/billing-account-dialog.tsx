'use client';

import { useMemo, useState } from 'react';
import {
  Coins,
  FileCheck,
  History,
  MapPin,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BILLING_STATUS_VARIANT } from '@/lib/status-colors';
import { calculateAccountLedgerSchedule } from '@/lib/billing/calculator';
import { useBillingAccounts } from '@/lib/hooks/use-billing-accounts';
import { BillingStatementTable } from './billing-statement-table';
import { BillingPaymentModal } from './billing-payment-modal';
import { BillingCompromiseModal } from './billing-compromise-modal';
import { BillingNoticeModal } from './billing-notice-modal';
import { BillingClearanceDialog } from './billing-clearance-dialog';
import { BillingBaselineModal } from './billing-baseline-modal';
import type { BillingAccountSummary } from '@/lib/types/billing';

const CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BillingAccountDialogProps {
  account: BillingAccountSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingAccountDialog({
  account,
  open,
  onOpenChange,
}: BillingAccountDialogProps) {
  const { canEdit, updateCompromise } = useBillingAccounts();

  const [activeTab, setActiveTab] = useState('statement');
  const [subModal, setSubModal] = useState<
    'payment' | 'compromise' | 'notice' | 'clearance' | 'baseline' | null
  >(null);

  const clientName = account.client?.full_name ?? 'Unassigned Client';
  const lotLabel = `Block ${account.property.block_number} Lot ${account.property.lot_number}`;

  const schedule = useMemo(() => {
    return calculateAccountLedgerSchedule(account);
  }, [account]);

  const derivedStatus = useMemo(() => {
    if (account.cleared_at) return 'Cleared';
    if (
      account.contract_end_date &&
      new Date(account.contract_end_date).getTime() < Date.now() &&
      Number(account.remaining_balance) > 0
    ) {
      return 'Matured';
    }
    if (account.notices.length > 0 || Number(account.baseline_penalties_accrued) > 0) {
      return 'Delinquent';
    }
    return 'Active';
  }, [account]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl w-[96vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-border bg-card px-5 py-3.5 sm:px-6 pr-16 sm:pr-20 text-left sm:text-left gap-0">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                    {clientName}
                  </DialogTitle>
                  <Badge variant={BILLING_STATUS_VARIANT[derivedStatus]} shape="pill" dot>
                    {derivedStatus}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {lotLabel} · {account.property.location}
                  </span>
                  <span>•</span>
                  <span>{account.property.area_size} sqm</span>
                  <span>•</span>
                  <span>₱{account.property.price_per_sqm?.toLocaleString()}/sqm</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {canEdit && !account.cleared_at && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setSubModal('payment')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record Payment
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant={account.cleared_at ? 'outline' : 'quiet'}
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setSubModal('clearance')}
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    {account.cleared_at ? 'Clearance Done' : 'Attest Clearance'}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col m-0">
            <div className="shrink-0 border-b border-border bg-row-hover/40 px-5 sm:px-6 py-2.5">
              <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto p-1 bg-row-hover">
                <TabsTrigger value="statement" className="text-xs py-1.5">
                  Statement
                </TabsTrigger>
                <TabsTrigger value="receipts" className="text-xs py-1.5">
                  Receipts ({account.payments.length})
                </TabsTrigger>
                <TabsTrigger value="compromise" className="text-xs py-1.5">
                  Compromise
                </TabsTrigger>
                <TabsTrigger value="notices" className="text-xs py-1.5">
                  Notices ({account.notices.length})
                </TabsTrigger>
                <TabsTrigger value="baseline" className="text-xs py-1.5">
                  Baseline
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
              <TabsContent value="statement" className="m-0 focus-visible:outline-none">
                <BillingStatementTable account={account} />
              </TabsContent>

              <TabsContent value="receipts" className="m-0 space-y-3 focus-visible:outline-none">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Official Receipts (OR) and Collection Receipts (CR) posted to this account.
                  </p>
                  {canEdit && !account.cleared_at && (
                    <Button
                      variant="quiet"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSubModal('payment')}
                    >
                      <Plus className="h-3 w-3" />
                      Add Payment
                    </Button>
                  )}
                </div>

                {account.payments.length === 0 ? (
                  <Card className="p-8 text-center text-xs text-muted-foreground">
                    No payment receipts recorded yet.
                  </Card>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-row-hover">
                        <TableRow>
                          <TableHead className="text-xs">Receipt #</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Mode</TableHead>
                          <TableHead className="text-right text-xs">Principal</TableHead>
                          <TableHead className="text-right text-xs">Penalty</TableHead>
                          <TableHead className="text-right text-xs">Titling</TableHead>
                          <TableHead className="text-right text-xs">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {account.payments.map((p) => (
                          <TableRow key={p.payment_id}>
                            <TableCell className="font-mono text-xs font-semibold text-foreground">
                              {p.or_number}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.payment_date}
                            </TableCell>
                            <TableCell className="text-xs text-foreground">
                              {p.payment_mode}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-success">
                              {CURRENCY.format(p.principal_amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-destructive">
                              {p.penalty_amount > 0 ? CURRENCY.format(p.penalty_amount) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {p.titling_fee_amount > 0 ? CURRENCY.format(p.titling_fee_amount) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                              {CURRENCY.format(p.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="compromise" className="m-0 space-y-4 focus-visible:outline-none">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Card className="p-4 space-y-2 border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        Option A (Contract)
                      </span>
                      <Badge variant="destructive" shape="pill" className="text-[10px]">
                        Full Penalty
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-destructive font-mono">
                      {CURRENCY.format(schedule.total_penalties)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contractual 3.5% monthly on overdue installment and matured balance.
                    </p>
                  </Card>

                  <Card className="p-4 space-y-2 border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        Option B (Compromise)
                      </span>
                      <Badge variant="warning" shape="pill" className="text-[10px]">
                        Amnesty / Restructured
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-foreground font-mono">
                      {CURRENCY.format(schedule.effective_penalties)}
                    </p>
                    <p className="text-xs text-success font-medium">
                      {schedule.waiver_savings > 0
                        ? `Waiver savings: ${CURRENCY.format(schedule.waiver_savings)}`
                        : 'No active waiver agreed'}
                    </p>
                  </Card>
                </div>

                {account.active_compromise ? (
                  <Card className="p-4 space-y-3 bg-row-hover/50 border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-accent-gold-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          Active Executive Agreement
                        </span>
                      </div>
                      <Badge variant="success" shape="pill">
                        {account.active_compromise.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Agreed Penalty:</span>
                        <p className="font-semibold text-foreground">
                          {CURRENCY.format(account.active_compromise.agreed_penalty)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Waiver Savings:</span>
                        <p className="font-semibold text-success">
                          {CURRENCY.format(account.active_compromise.waiver_amount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Restructured:</span>
                        <p className="font-semibold text-foreground">
                          {account.active_compromise.restructured_months} months
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valid Until:</span>
                        <p className="font-semibold text-foreground">
                          {account.active_compromise.valid_until || 'No expiry'}
                        </p>
                      </div>
                    </div>

                    {account.active_compromise.notes && (
                      <p className="text-xs text-muted-foreground border-t border-border pt-2">
                        <strong>Notes:</strong> {account.active_compromise.notes}
                      </p>
                    )}

                    {canEdit && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          variant="quiet"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => updateCompromise(account.active_compromise!.compromise_id, 'Fulfilled')}
                        >
                          Mark Fulfilled
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-destructive"
                          onClick={() => updateCompromise(account.active_compromise!.compromise_id, 'Lapsed')}
                        >
                          Mark Lapsed (Revert Option A)
                        </Button>
                      </div>
                    )}
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center space-y-2">
                    <Coins className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      No active compromise agreement. The account is billed under Option A contractual terms.
                    </p>
                    {canEdit && (
                      <Button
                        variant="quiet"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setSubModal('compromise')}
                      >
                        <Plus className="h-3 w-3" />
                        Create Executive Compromise
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notices" className="m-0 space-y-3 focus-visible:outline-none">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Maceda Law 3-notice collection letter history and delivery proofs.
                  </p>
                  {canEdit && (
                    <Button
                      variant="quiet"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSubModal('notice')}
                    >
                      <Plus className="h-3 w-3" />
                      Dispatch Notice
                    </Button>
                  )}
                </div>

                {account.notices.length === 0 ? (
                  <Card className="p-8 text-center text-xs text-muted-foreground">
                    No collection notices dispatched for this account.
                  </Card>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-row-hover">
                        <TableRow>
                          <TableHead className="text-xs">Notice Level</TableHead>
                          <TableHead className="text-xs">Notice Date</TableHead>
                          <TableHead className="text-xs">Courier & Tracking</TableHead>
                          <TableHead className="text-xs">Delivery Status</TableHead>
                          <TableHead className="text-xs">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {account.notices.map((n) => (
                          <TableRow key={n.notice_id}>
                            <TableCell className="text-xs font-semibold text-foreground">
                              {n.notice_type}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {n.notice_date}
                            </TableCell>
                            <TableCell className="text-xs text-foreground font-mono">
                              {n.courier_name || '—'} {n.tracking_number ? `(${n.tracking_number})` : ''}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge
                                variant={
                                  n.delivery_status === 'Delivered'
                                    ? 'success'
                                    : n.delivery_status === 'Return to Sender (RTS)'
                                    ? 'destructive'
                                    : 'warning'
                                }
                                shape="pill"
                                className="text-[10px]"
                              >
                                {n.delivery_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {n.remarks || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="baseline" className="m-0 space-y-3 focus-visible:outline-none">
                <Card className="p-4 space-y-3 border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        Audited Migration Baseline
                      </span>
                    </div>
                    {canEdit && (
                      <Button
                        variant="quiet"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setSubModal('baseline')}
                      >
                        Edit Baseline
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground">Cut-off Date:</span>
                      <p className="font-semibold text-foreground">
                        {account.baseline_date || 'No baseline set'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Historical Principal Paid:</span>
                      <p className="font-semibold text-success font-mono">
                        {CURRENCY.format(Number(account.baseline_principal_paid || 0))}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Accrued Cut-off Penalty:</span>
                      <p className="font-semibold text-destructive font-mono">
                        {CURRENCY.format(Number(account.baseline_penalties_accrued || 0))}
                      </p>
                    </div>
                  </div>

                  {account.baseline_notes && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-2">
                      <strong>Audit Notes:</strong> {account.baseline_notes}
                    </p>
                  )}
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {subModal === 'payment' && (
        <BillingPaymentModal
          account={account}
          open={true}
          onOpenChange={(op) => !op && setSubModal(null)}
        />
      )}

      {subModal === 'compromise' && (
        <BillingCompromiseModal
          account={account}
          open={true}
          onOpenChange={(op) => !op && setSubModal(null)}
          calculatedPenalty={schedule.total_penalties}
        />
      )}

      {subModal === 'notice' && (
        <BillingNoticeModal
          account={account}
          open={true}
          onOpenChange={(op) => !op && setSubModal(null)}
        />
      )}

      {subModal === 'clearance' && (
        <BillingClearanceDialog
          account={account}
          open={true}
          onOpenChange={(op) => !op && setSubModal(null)}
        />
      )}

      {subModal === 'baseline' && (
        <BillingBaselineModal
          account={account}
          open={true}
          onOpenChange={(op) => !op && setSubModal(null)}
        />
      )}
    </>
  );
}
