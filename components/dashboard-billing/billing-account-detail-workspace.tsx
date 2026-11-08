'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  ShieldAlert,
  Unlock,
  User,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BillingJournalTab } from './billing-journal-tab';
import { BillingScheduleTab } from './billing-schedule-tab';
import { BillingPdcTab } from './billing-pdc-tab';
import { BillingPenaltiesTab } from './billing-penalties-tab';
import { BillingNoticesTab } from './billing-notices-tab';
import { BillingStatementView } from './billing-statement-view';
import { BillingPaymentModal } from './billing-payment-modal';
import { BillingReversalModal } from './billing-reversal-modal';
import { BillingRestructureModal } from './billing-restructure-modal';
import { BillingPdcModal } from './billing-pdc-modal';
import { BillingPenaltyModal } from './billing-penalty-modal';
import { BillingLotHoldDialog } from './billing-lot-hold-dialog';
import {
  formatCentavosToPhp,
  getBillingStatusLabel,
  getBillingStatusVariant,
} from '@/lib/status-colors';
import type {
  BillingAccountSummary,
  BillingTransaction,
  StatementPrintPayload,
} from '@/lib/types/billing';

interface BillingAccountDetailWorkspaceProps {
  account: BillingAccountSummary;
  statementPayload: StatementPrintPayload;
  canEdit: boolean;
}

export function BillingAccountDetailWorkspace({
  account,
  statementPayload,
  canEdit,
}: BillingAccountDetailWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'ledger' | 'schedule' | 'pdcs' | 'penalties' | 'notices' | 'statement'
  >('ledger');
  const [mobileSummaryExpanded, setMobileSummaryExpanded] = useState(false);

  // Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [restructureModalOpen, setRestructureModalOpen] = useState(false);
  const [pdcModalOpen, setPdcModalOpen] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [lotHoldDialogOpen, setLotHoldDialogOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<BillingTransaction | null>(null);

  const rawStatus = account.cleared_at ? 'cleared' : String(account.status || '').toLowerCase();
  const statusLabel = getBillingStatusLabel(rawStatus);
  const statusVariant = getBillingStatusVariant(rawStatus);
  const isForfeited = rawStatus === 'forfeited';

  const buyer = account.client;
  const property = account.property;
  const transactions = account.transactions ?? [];
  const schedule = account.active_schedule ?? null;
  const pdcs = account.pdcs ?? [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/billing')}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Accounts
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {buyer?.full_name ?? 'Unassigned Lot Account'}
              </h1>
              <Badge variant={statusVariant} className="text-[10px] uppercase font-semibold">
                {statusLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Lot #{property.lot_number}, Block {property.block_number} • {property.location}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && !account.cleared_at && !isForfeited && (
            <Button
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Banknote className="h-3.5 w-3.5" />
              Post Payment
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('statement')}
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print SOA
          </Button>
        </div>
      </div>

      {/* Two-Column Master-Detail Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Persistent Sticky Contract & Financial Summary */}
        <div className="w-full lg:w-[340px] flex-shrink-0 space-y-4">
          <Card className="p-4 sm:p-5 space-y-4">
            {/* Mobile Header Toggle */}
            <div className="flex items-center justify-between lg:hidden border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account Summary
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileSummaryExpanded(!mobileSummaryExpanded)}
                className="h-6 w-6 p-0"
              >
                {mobileSummaryExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Dynamic Balances KPI Block */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Remaining Principal
                </span>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {formatCentavosToPhp(account.outstanding_principal ?? account.remaining_balance ?? 0)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground">Total Contract Price</span>
                  <p className="font-mono font-medium text-foreground">
                    {formatCentavosToPhp(account.total_contract_price || account.total_selling_price || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Total Paid to Date</span>
                  <p className="font-mono font-medium text-success">
                    {formatCentavosToPhp(account.total_principal_paid ?? account.total_paid ?? 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Penalties Accrued</span>
                  <p className="font-mono font-medium text-warning">
                    {formatCentavosToPhp(account.penalties_due ?? 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Overdue Installments</span>
                  <p className="font-mono font-medium text-foreground">
                    {account.installments_behind ?? 0} months
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible details on mobile; always visible on desktop */}
            <div className={`space-y-4 ${mobileSummaryExpanded ? 'block' : 'hidden lg:block'}`}>
              {/* Buyer Metadata */}
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Buyer Profile
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">{buyer?.full_name ?? 'Unassigned'}</p>
                  {buyer?.tin_number && (
                    <p className="text-[11px] text-muted-foreground font-mono">TIN: {buyer.tin_number}</p>
                  )}
                  {buyer?.civil_status && (
                    <p className="text-[11px] text-muted-foreground">Status: {buyer.civil_status}</p>
                  )}
                </div>
              </div>

              {/* Lot Metadata */}
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  Property Coordinates
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-medium text-foreground">
                    Block {property.block_number}, Lot {property.lot_number}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{property.location}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Area: {property.area_size} m² • Title: {property.title_number ?? 'In Progress'}
                  </p>
                </div>
              </div>

              {/* Quick Actions Panel */}
              {canEdit && (
                <div className="pt-3 border-t border-border space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Cashier &amp; Contract Actions
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {!account.cleared_at && !isForfeited && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestructureModalOpen(true)}
                          className="justify-start h-8 text-xs gap-2"
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          Restructure Terms (FR-040)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPenaltyModalOpen(true)}
                          className="justify-start h-8 text-xs gap-2"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                          Penalty Policy / Waiver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPdcModalOpen(true)}
                          className="justify-start h-8 text-xs gap-2"
                        >
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          Register Post-Dated Check
                        </Button>
                      </>
                    )}

                    {isForfeited && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setLotHoldDialogOpen(true)}
                        className="justify-start h-8 text-xs gap-2"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Release Lot Hold (FR-062)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Tabbed Financial Ledger Area */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          <Card className="p-4 sm:p-6">
            {/* Tabs Navigation Header */}
            <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px mb-6">
              {[
                { id: 'ledger', label: 'Transaction Ledger', count: transactions.length },
                { id: 'schedule', label: 'Amortization Schedule' },
                { id: 'pdcs', label: 'Post-Dated Checks', count: pdcs.length },
                { id: 'penalties', label: 'Penalties & Waivers' },
                { id: 'notices', label: 'Legal & Notices' },
                { id: 'statement', label: 'Printable Statement' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab 1: Append-Only Transaction Ledger (Active by default) */}
            {activeTab === 'ledger' && (
              <BillingJournalTab
                transactions={transactions}
                onReverseTransaction={(txn) => setReversalTarget(txn)}
                canEdit={canEdit}
              />
            )}

            {/* Tab 2: Installment Schedule */}
            {activeTab === 'schedule' && (
              <BillingScheduleTab
                schedule={schedule}
                totalPaid={Number(account.total_principal_paid ?? account.total_paid ?? 0)}
              />
            )}

            {/* Tab 3: Post-Dated Checks */}
            {activeTab === 'pdcs' && (
              <BillingPdcTab
                pdcs={pdcs}
                onOpenAddModal={() => setPdcModalOpen(true)}
                canEdit={canEdit}
              />
            )}

            {/* Tab 4: Penalties & Waivers */}
            {activeTab === 'penalties' && (
              <BillingPenaltiesTab
                account={account}
                onOpenPenaltyModal={() => setPenaltyModalOpen(true)}
                canEdit={canEdit}
              />
            )}

            {/* Tab 5: Legal Notices & Forfeiture Hold */}
            {activeTab === 'notices' && (
              <BillingNoticesTab
                account={account}
                onOpenLotHoldDialog={() => setLotHoldDialogOpen(true)}
                canEdit={canEdit}
              />
            )}

            {/* Tab 6: Printable Statement View */}
            {activeTab === 'statement' && (
              <BillingStatementView statement={statementPayload} />
            )}
          </Card>
        </div>
      </div>

      {/* Cashier Payment Modal */}
      {paymentModalOpen && (
        <BillingPaymentModal
          account={account}
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Restructure Modal */}
      {restructureModalOpen && (
        <BillingRestructureModal
          account={account}
          open={restructureModalOpen}
          onOpenChange={setRestructureModalOpen}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* PDC Modal */}
      {pdcModalOpen && (
        <BillingPdcModal
          account={account}
          open={pdcModalOpen}
          onOpenChange={setPdcModalOpen}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Penalty Modal */}
      {penaltyModalOpen && (
        <BillingPenaltyModal
          account={account}
          open={penaltyModalOpen}
          onOpenChange={setPenaltyModalOpen}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Lot Hold Release Dialog */}
      {lotHoldDialogOpen && (
        <BillingLotHoldDialog
          account={account}
          open={lotHoldDialogOpen}
          onOpenChange={setLotHoldDialogOpen}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <BillingReversalModal
          accountId={account.account_id}
          transaction={reversalTarget}
          open={Boolean(reversalTarget)}
          onOpenChange={(op) => !op && setReversalTarget(null)}
          onSuccess={() => {
            setReversalTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
