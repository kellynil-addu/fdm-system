'use client';

import { FileSpreadsheet, Receipt, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardStickyHeader, CardTableFooter } from '@/components/ui/card';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import {
  BillingAccountsProvider,
  useBillingAccounts,
} from '@/lib/hooks/use-billing-accounts';
import { BillingKpiCards } from './billing-kpi-cards';
import { BillingAccountCard } from './billing-account-card';
import { BillingAccountDialog } from './billing-account-dialog';
import { BillingCsvImportModal } from './billing-csv-import-modal';
import { BillingPaymentModal } from './billing-payment-modal';
import type { BillingAccountSummary } from '@/lib/types/billing';

const GUTTER = 'px-4 sm:px-6';

function EmptyState({
  isFiltered,
  onClear,
  onImportCsv,
  canEdit,
}: {
  isFiltered: boolean;
  onClear: () => void;
  onImportCsv: () => void;
  canEdit: boolean;
}) {
  const Icon = isFiltered ? SearchX : Receipt;
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-row-hover text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {isFiltered ? 'No matching accounts' : 'No billing accounts yet'}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isFiltered
            ? 'Try a different search term, or clear the filters to see active accounts.'
            : 'Import a Statement of Account CSV to initialize installment accounts and track ledgers.'}
        </p>
      </div>
      {isFiltered ? (
        <Button variant="quiet" onClick={onClear} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      ) : (
        canEdit && (
          <Button onClick={onImportCsv} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import SOA (CSV)
          </Button>
        )
      )}
    </div>
  );
}

function BillingRecordsContent() {
  const {
    accounts,
    filteredAccounts,
    search,
    setSearch,
    tab,
    setTab,
    counts,
    activeAccount,
    setActiveAccount,
    activeModal,
    setActiveModal,
    canEdit,
  } = useBillingAccounts();

  const isFiltered = Boolean(search.trim() || tab !== 'active');

  const clearFilters = () => {
    setSearch('');
    setTab('active');
  };

  return (
    <div className="space-y-6">
      <BillingKpiCards />

      <Card variant="section">
        <CardStickyHeader>
          <div className={`flex flex-wrap items-start justify-between gap-4 pb-5 pt-6 ${GUTTER}`}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                Billing Accounts
              </h2>
              <p className="text-sm text-muted-foreground">
                Track buyer amortizations, verify collection receipts, and manage account statuses.
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {canEdit && (
                <Button
                  onClick={() => setActiveModal({ type: 'csv-import' })}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import SOA (CSV)
                </Button>
              )}
            </div>
          </div>

          <FilterToolbar
            tabs={{
              value: tab,
              onChange: setTab,
              ariaLabel: 'Filter by account status',
              items: [
                { value: 'active', label: 'Active', count: counts.active },
                { value: 'delinquent', label: 'Delinquent', count: counts.delinquent },
                { value: 'matured', label: 'Matured', count: counts.matured },
                { value: 'cleared', label: 'Cleared', count: counts.cleared },
                { value: 'all', label: 'All Accounts', count: counts.all },
              ],
            }}
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search buyer, lot, or OR number...',
              ariaLabel: 'Search billing accounts',
            }}
            isFiltered={isFiltered}
            onClear={clearFilters}
          />
        </CardStickyHeader>

        <div className="p-4 sm:p-6 min-h-[400px]">
          {filteredAccounts.length === 0 ? (
            <EmptyState
              isFiltered={isFiltered}
              onClear={clearFilters}
              onImportCsv={() => setActiveModal({ type: 'csv-import' })}
              canEdit={canEdit}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAccounts.map((account) => (
                <BillingAccountCard key={account.account_id} account={account} />
              ))}
            </div>
          )}
        </div>

        <CardTableFooter>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {isFiltered
              ? `Showing ${filteredAccounts.length} of ${accounts.length} account${accounts.length === 1 ? '' : 's'}`
              : `${filteredAccounts.length} account${filteredAccounts.length === 1 ? '' : 's'}`}
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Select an account card to view amortization schedule &amp; ledger
          </p>
        </CardTableFooter>
      </Card>

      {activeAccount && (
        <BillingAccountDialog
          account={activeAccount}
          open={true}
          onOpenChange={(op) => !op && setActiveAccount(null)}
        />
      )}

      {activeModal?.type === 'csv-import' && (
        <BillingCsvImportModal
          open={true}
          onOpenChange={(op) => !op && setActiveModal(null)}
        />
      )}

      {activeModal?.type === 'payment' && (
        <BillingPaymentModal
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
