'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  recordLedgerPayment,
  createCompromiseAgreement,
  updateCompromiseStatus,
  recordAccountNotice,
  setAccountBillingBaseline,
  importBillingLedgerCsv,
  markAccountClearedByBilling,
  undoBillingClearance,
  getBillingAccountDetails,
} from '@/lib/actions/billing';
import { useSession } from '@/lib/hooks/use-session';
import { useMutation } from '@/lib/hooks/use-mutation';
import type {
  BillingAccountSummary,
  CompromiseStatus,
  CsvImportSummary,
} from '@/lib/types/billing';
import type {
  RecordPaymentInput,
  CreateCompromiseInput,
  RecordNoticeInput,
  SetBaselineCutoffInput,
  ImportCsvInput,
} from '@/lib/validations/billing';

export type BillingTab = 'all' | 'active' | 'delinquent' | 'matured' | 'cleared';

export type BillingModalState =
  | { type: 'payment'; account: BillingAccountSummary }
  | { type: 'csv-import' }
  | { type: 'compromise'; account: BillingAccountSummary }
  | { type: 'notice'; account: BillingAccountSummary }
  | { type: 'clearance'; account: BillingAccountSummary }
  | { type: 'baseline'; account: BillingAccountSummary }
  | null;

export interface BillingAccountsContextValue {
  accounts: BillingAccountSummary[];
  filteredAccounts: BillingAccountSummary[];
  search: string;
  setSearch: (search: string) => void;
  tab: BillingTab;
  setTab: (tab: BillingTab) => void;
  counts: Record<BillingTab, number>;
  activeAccount: BillingAccountSummary | null;
  setActiveAccount: (account: BillingAccountSummary | null) => void;
  activeModal: BillingModalState;
  setActiveModal: (modal: BillingModalState) => void;
  recordPayment: (input: RecordPaymentInput) => Promise<boolean>;
  isRecordingPayment: boolean;
  createCompromise: (input: CreateCompromiseInput) => Promise<boolean>;
  isCreatingCompromise: boolean;
  updateCompromise: (compromiseId: string, status: CompromiseStatus) => Promise<boolean>;
  recordNotice: (input: RecordNoticeInput) => Promise<boolean>;
  isRecordingNotice: boolean;
  setBaseline: (input: SetBaselineCutoffInput) => Promise<boolean>;
  isSettingBaseline: boolean;
  importCsv: (input: ImportCsvInput) => Promise<boolean>;
  isImportingCsv: boolean;
  attestClearance: (accountId: string, remarks?: string | null) => Promise<boolean>;
  isAttestingClearance: boolean;
  undoClearance: (accountId: string) => Promise<boolean>;
  isUndoingClearance: boolean;
  refreshAccount: (accountId: string) => Promise<void>;
  canEdit: boolean;
}

const BillingAccountsContext = createContext<BillingAccountsContextValue | null>(null);

export function BillingAccountsProvider({
  initialAccounts,
  children,
}: {
  initialAccounts: BillingAccountSummary[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { hasPermission } = useSession();
  const canEdit = hasPermission('billing.update') || hasPermission('billing.create');

  const [accounts, setAccounts] = useState<BillingAccountSummary[]>(initialAccounts);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<BillingTab>('active');
  const [activeAccount, setActiveAccount] = useState<BillingAccountSummary | null>(null);
  const [activeModal, setActiveModal] = useState<BillingModalState>(null);

  const refreshAccount = useCallback(async (accountId: string) => {
    try {
      const refreshed = await getBillingAccountDetails(accountId);
      setAccounts((prev) => prev.map((a) => (a.account_id === accountId ? refreshed : a)));
      setActiveAccount((current) => (current?.account_id === accountId ? refreshed : current));
    } catch {
      // Background refresh error ignored
    }
    router.refresh();
  }, [router]);

  const recordPaymentMutation = useMutation(recordLedgerPayment, {
    onSuccess: async (data) => {
      toast.success(`Payment recorded under OR# ${data.or_number}`);
      setActiveModal(null);
      await refreshAccount(data.account_id);
    },
    onError: (err) => {
      toast.error(err || 'Failed to record payment');
    },
  });

  const createCompromiseMutation = useMutation(createCompromiseAgreement, {
    onSuccess: async (data) => {
      toast.success('Executive compromise agreement approved');
      setActiveModal(null);
      await refreshAccount(data.account_id);
    },
    onError: (err) => {
      toast.error(err || 'Failed to create compromise');
    },
  });

  const updateCompromiseMutation = useMutation(
    ({ compromiseId, status }: { compromiseId: string; status: CompromiseStatus }) =>
      updateCompromiseStatus(compromiseId, status),
    {
      onSuccess: async () => {
        toast.success('Compromise status updated');
        if (activeAccount) {
          await refreshAccount(activeAccount.account_id);
        }
      },
      onError: (err) => {
        toast.error(err || 'Failed to update compromise status');
      },
    }
  );

  const recordNoticeMutation = useMutation(recordAccountNotice, {
    onSuccess: async (data) => {
      toast.success(`${data.notice_type} recorded successfully`);
      setActiveModal(null);
      await refreshAccount(data.account_id);
    },
    onError: (err) => {
      toast.error(err || 'Failed to record notice');
    },
  });

  const setBaselineMutation = useMutation(setAccountBillingBaseline, {
    onSuccess: async () => {
      toast.success('Legacy baseline snapshot recorded');
      if (activeAccount) {
        await refreshAccount(activeAccount.account_id);
      }
      setActiveModal(null);
    },
    onError: (err) => {
      toast.error(err || 'Failed to set baseline');
    },
  });

  const importCsvMutation = useMutation(importBillingLedgerCsv, {
    onSuccess: async (data: CsvImportSummary) => {
      toast.success(`Ingested ${data.successful} accounts (${data.failed} skipped/failed)`);
      setActiveModal(null);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err || 'Failed to import CSV');
    },
  });

  const attestClearanceMutation = useMutation(
    ({ accountId, remarks }: { accountId: string; remarks?: string | null }) =>
      markAccountClearedByBilling({ account_id: accountId, remarks }),
    {
      onSuccess: async (data) => {
        toast.success('Account cleared by Billing. Lot status updated to Sold.');
        setActiveModal(null);
        await refreshAccount(data.account_id);
      },
      onError: (err) => {
        toast.error(err || 'Failed to attest clearance');
      },
    }
  );

  const undoClearanceMutation = useMutation(
    (accountId: string) => undoBillingClearance(accountId),
    {
      onSuccess: async () => {
        toast.success('Clearance undone. Lot restored to Reserved.');
        if (activeAccount) {
          await refreshAccount(activeAccount.account_id);
        }
        setActiveModal(null);
      },
      onError: (err) => {
        toast.error(err || 'Failed to undo clearance');
      },
    }
  );

  const counts = useMemo(() => {
    let active = 0;
    let delinquent = 0;
    let matured = 0;
    let cleared = 0;

    for (const a of accounts) {
      if (a.cleared_at) {
        cleared++;
      } else if (a.contract_end_date && new Date(a.contract_end_date).getTime() < Date.now() && Number(a.remaining_balance) > 0) {
        matured++;
      } else if (a.notices.length > 0 || Number(a.baseline_penalties_accrued) > 0) {
        delinquent++;
      } else {
        active++;
      }
    }

    return {
      all: accounts.length,
      active,
      delinquent,
      matured,
      cleared,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    let result = accounts;

    if (tab === 'active') {
      result = result.filter(
        (a) =>
          !a.cleared_at &&
          (!a.contract_end_date ||
            new Date(a.contract_end_date).getTime() >= Date.now() ||
            Number(a.remaining_balance) <= 0) &&
          a.notices.length === 0 &&
          Number(a.baseline_penalties_accrued || 0) <= 0
      );
    } else if (tab === 'delinquent') {
      result = result.filter((a) => !a.cleared_at && (a.notices.length > 0 || Number(a.baseline_penalties_accrued) > 0));
    } else if (tab === 'matured') {
      result = result.filter((a) => !a.cleared_at && a.contract_end_date && new Date(a.contract_end_date).getTime() < Date.now() && Number(a.remaining_balance) > 0);
    } else if (tab === 'cleared') {
      result = result.filter((a) => Boolean(a.cleared_at));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((a) => {
        const clientName = a.client?.full_name?.toLowerCase() ?? '';
        const location = a.property.location.toLowerCase();
        const block = `block ${a.property.block_number}`.toLowerCase();
        const lot = `lot ${a.property.lot_number}`.toLowerCase();
        const blkLot = `b${a.property.block_number} l${a.property.lot_number}`.toLowerCase();
        const orNumbers = a.payments.map((p) => p.or_number.toLowerCase()).join(' ');

        return (
          clientName.includes(q) ||
          location.includes(q) ||
          block.includes(q) ||
          lot.includes(q) ||
          blkLot.includes(q) ||
          orNumbers.includes(q)
        );
      });
    }

    return result;
  }, [accounts, tab, search]);

  const value: BillingAccountsContextValue = {
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
    recordPayment: recordPaymentMutation.execute,
    isRecordingPayment: recordPaymentMutation.state.status === 'pending',
    createCompromise: createCompromiseMutation.execute,
    isCreatingCompromise: createCompromiseMutation.state.status === 'pending',
    updateCompromise: (compromiseId, status) => updateCompromiseMutation.execute({ compromiseId, status }),
    recordNotice: recordNoticeMutation.execute,
    isRecordingNotice: recordNoticeMutation.state.status === 'pending',
    setBaseline: setBaselineMutation.execute,
    isSettingBaseline: setBaselineMutation.state.status === 'pending',
    importCsv: importCsvMutation.execute,
    isImportingCsv: importCsvMutation.state.status === 'pending',
    attestClearance: (accountId, remarks) => attestClearanceMutation.execute({ accountId, remarks }),
    isAttestingClearance: attestClearanceMutation.state.status === 'pending',
    undoClearance: (accountId) => undoClearanceMutation.execute(accountId),
    isUndoingClearance: undoClearanceMutation.state.status === 'pending',
    refreshAccount,
    canEdit,
  };

  return (
    <BillingAccountsContext.Provider value={value}>
      {children}
    </BillingAccountsContext.Provider>
  );
}

export function useBillingAccounts() {
  const context = useContext(BillingAccountsContext);
  if (!context) {
    throw new Error('useBillingAccounts must be used within a BillingAccountsProvider');
  }
  return context;
}
