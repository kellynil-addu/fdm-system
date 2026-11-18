import type {
  BillingAccountSummary,
  BillingTransaction,
  BillingSchedule,
  BillingPayment,
  BillingPostDatedCheck,
  BillingImportDiscrepancy,
  StatementPrintPayload,
} from '@/lib/types/billing';

export type BillingTopTab = 'accounts' | 'pdcs' | 'discrepancies';

export type BillingWorkspaceTab =
  | 'ledger'
  | 'schedule'
  | 'pdcs'
  | 'penalties'
  | 'notices'
  | 'statement';

export interface BillingFilterState {
  search: string;
  status: 'all' | 'active' | 'in_arrears' | 'matured' | 'cleared' | 'forfeited';
  viewMode: 'table' | 'cards';
  sortField: 'buyer' | 'lot' | 'balance' | 'arrears' | 'aging';
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export type ActiveBillingModal =
  | { type: 'idle' }
  | { type: 'payment'; account: BillingAccountSummary }
  | { type: 'reversal'; account: BillingAccountSummary; transaction: BillingTransaction }
  | { type: 'restructure'; account: BillingAccountSummary }
  | { type: 'record-pdc'; account: BillingAccountSummary }
  | { type: 'penalty-policy'; account: BillingAccountSummary }
  | { type: 'excel-import' }
  | { type: 'resolve-discrepancy'; discrepancy: BillingImportDiscrepancy }
  | { type: 'lot-hold-release'; account: BillingAccountSummary };

export interface BillingTableProps {
  accounts: BillingAccountSummary[];
  onSelectAccount: (accountId: string) => void;
  onOpenPaymentModal: (account: BillingAccountSummary) => void;
  onOpenRestructureModal: (account: BillingAccountSummary) => void;
  canEdit: boolean;
}

export interface BillingAccountWorkspaceProps {
  account: BillingAccountSummary;
  initialTab?: BillingWorkspaceTab;
  onRefresh?: () => Promise<void>;
  canEdit?: boolean;
}

export interface BillingPdcTrackerProps {
  onRefresh?: () => Promise<void>;
  canEdit?: boolean;
}

export interface BillingDiscrepancyQueueProps {
  onResolveDiscrepancy: (discrepancy: BillingImportDiscrepancy) => void;
  onRefresh?: () => Promise<void>;
  canEdit?: boolean;
}

export interface BillingKpiCardsProps {
  accounts: BillingAccountSummary[];
  pendingDiscrepanciesCount?: number;
  maturingPdcsCount?: number;
}
