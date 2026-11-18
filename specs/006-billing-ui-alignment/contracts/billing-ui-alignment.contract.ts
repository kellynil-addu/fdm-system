import type { BillingAccountSummary } from '@/lib/types/billing';
import type { ListControllerValue } from '@/lib/hooks/use-list-controller';

export interface BillingFilterState {
  status: 'all' | 'Active' | 'in_arrears' | 'Matured' | 'Cleared' | 'Forfeited';
  search: string;
  [key: string]: unknown;
}

/**
 * Props for the master billing records section coordinating top tabs and portfolio views.
 */
export interface BillingRecordsSectionProps {
  initialAccounts: BillingAccountSummary[];
}

/**
 * Props for the primary accounts table composing from Card, CardStickyHeader, and FilterToolbar.
 */
export interface BillingAccountsTableProps {
  controller: ListControllerValue<BillingAccountSummary, BillingFilterState>;
  onOpenPaymentModal: (account: BillingAccountSummary) => void;
  onOpenRestructureModal: (account: BillingAccountSummary) => void;
  onOpenLotHoldDialog: (account: BillingAccountSummary) => void;
  canEdit: boolean;
}

/**
 * Props for the KPI summary metrics cards composing from Card variant="canvas".
 */
export interface BillingKpiCardsProps {
  accounts: BillingAccountSummary[];
  maturingPdcCount?: number;
  pendingDiscrepancyCount?: number;
}

/**
 * Props for the two-column Account Detail Workspace.
 */
export interface BillingAccountDetailWorkspaceProps {
  account: BillingAccountSummary;
  canEdit: boolean;
  canReverse: boolean;
}

/**
 * Standard tab interface for workspace tables composing from Card and EmptyState.
 */
export interface BillingWorkspaceTabProps {
  account: BillingAccountSummary;
  canEdit: boolean;
  canReverse?: boolean;
  onSuccess?: () => void;
}
