'use client';

import { useState } from 'react';
import { Card, CardTableFooter } from '@/components/ui/card';
import {
  BillingAccountsProvider,
  useBillingAccounts,
} from '@/lib/hooks/use-billing-accounts';
import { BillingKpiCards } from './billing-kpi-cards';
import { BillingTableToolbar } from './billing-table-toolbar';
import { BillingAccountsTable } from './billing-accounts-table';
import { BillingAccountCard } from './billing-account-card';
import { BillingPdcTracker } from './billing-pdc-tracker';
import { BillingDiscrepancyQueue } from './billing-discrepancy-queue';
import { BillingPaymentModal } from './billing-payment-modal';
import { BillingExcelImportModal } from './billing-excel-import-modal';
import { BillingDiscrepancyModal } from './billing-discrepancy-modal';
import { BillingRestructureModal } from './billing-restructure-modal';
import { BillingPdcModal } from './billing-pdc-modal';
import { BillingPenaltyModal } from './billing-penalty-modal';
import { BillingReversalModal } from './billing-reversal-modal';
import { BillingLotHoldDialog } from './billing-lot-hold-dialog';
import type { BillingAccountSummary } from '@/lib/types/billing';

function BillingRecordsContent() {
  const {
    accounts,
    filteredAccounts,
    search,
    setSearch,
    tab,
    setTab,
    topTab,
    setTopTab,
    viewMode,
    setViewMode,
    counts,
    activeModal,
    setActiveModal,
    canEdit,
  } = useBillingAccounts();

  return (
    <div className="space-y-6">
      {/* Portfolio KPIs */}
      <BillingKpiCards />

      {/* Main Section Card */}
      <Card variant="section" className="overflow-hidden">
        {/* Top-Level Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 sm:px-6 pt-3">
          {[
            { id: 'accounts', label: 'Billing Accounts', count: accounts.length },
            { id: 'pdcs', label: 'PDC Tracker' },
            { id: 'discrepancies', label: 'Review Queue' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTopTab(item.id as any)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-all ${
                topTab === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Billing Accounts */}
        {topTab === 'accounts' && (
          <>
            <BillingTableToolbar
              search={search}
              onSearchChange={setSearch}
              activeTab={tab}
              onTabChange={setTab}
              counts={counts}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onOpenImportModal={() => setActiveModal({ type: 'excel-import' })}
              canEdit={canEdit}
            />

            <div className="min-h-[400px]">
              {viewMode === 'table' ? (
                <BillingAccountsTable
                  accounts={filteredAccounts}
                  onOpenPaymentModal={(acc) => setActiveModal({ type: 'payment', account: acc })}
                  canEdit={canEdit}
                />
              ) : (
                <div className="p-4 sm:p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAccounts.map((account) => (
                    <BillingAccountCard key={account.account_id} account={account} />
                  ))}
                </div>
              )}
            </div>

            <CardTableFooter>
              <p className="text-xs text-muted-foreground">
                Showing {filteredAccounts.length} of {accounts.length} account
                {accounts.length === 1 ? '' : 's'}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Click any account row to open the full ledger workspace
              </p>
            </CardTableFooter>
          </>
        )}

        {/* Tab 2: PDC Tracker */}
        {topTab === 'pdcs' && <BillingPdcTracker canEdit={canEdit} />}

        {/* Tab 3: Discrepancy Review Queue */}
        {topTab === 'discrepancies' && (
          <BillingDiscrepancyQueue
            onResolveDiscrepancy={(disc) =>
              setActiveModal({ type: 'resolve-discrepancy', discrepancy: disc })
            }
            canEdit={canEdit}
          />
        )}
      </Card>

      {/* Cashier Payment Modal */}
      {activeModal?.type === 'payment' && (
        <BillingPaymentModal
          account={activeModal.account}
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {/* Excel Legacy Import Modal */}
      {activeModal?.type === 'excel-import' && (
        <BillingExcelImportModal
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {/* Discrepancy Resolution Modal */}
      {activeModal?.type === 'resolve-discrepancy' && (
        <BillingDiscrepancyModal
          discrepancy={activeModal.discrepancy}
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {/* Reversal Confirmation Modal */}
      {activeModal?.type === 'reversal' && (
        <BillingReversalModal
          accountId={activeModal.account.account_id}
          transaction={activeModal.transaction}
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {/* Restructure Modal */}
      {activeModal?.type === 'restructure' && (
        <BillingRestructureModal
          account={activeModal.account}
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {/* PDC Modal */}
      {activeModal?.type === 'record-pdc' && (
        <BillingPdcModal
          account={activeModal.account}
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {/* Penalty Modal */}
      {activeModal?.type === 'penalty-policy' && (
        <BillingPenaltyModal
          account={activeModal.account}
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {/* Lot Hold Release Dialog */}
      {activeModal?.type === 'lot-hold-release' && (
        <BillingLotHoldDialog
          account={activeModal.account}
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}
    </div>
  );
}

export function BillingRecordsSection({
  initialAccounts,
}: {
  initialAccounts: BillingAccountSummary[];
}) {
  return (
    <BillingAccountsProvider initialAccounts={initialAccounts}>
      <BillingRecordsContent />
    </BillingAccountsProvider>
  );
}
