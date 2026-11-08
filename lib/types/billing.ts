import type { ContactInfo } from '@/lib/types/client';

export type PaymentMode = 'Cash' | 'Check' | 'Bank Transfer' | 'Online Deposit';
export type CompromiseStatus = 'Pending' | 'Approved' | 'Fulfilled' | 'Lapsed' | 'Voided';
export type NoticeType = '1st Notice' | '2nd Notice' | 'Final Demand';
export type DeliveryStatus = 'Pending' | 'Dispatched' | 'Delivered' | 'Return to Sender (RTS)';
export type PdcStatus = 'expected' | 'holding' | 'deposited' | 'cleared' | 'returned';

export type CanonicalAccountStatus =
  | 'active'
  | 'matured'
  | 'fully_paid'
  | 'fully_paid_unclaimed'
  | 'cancelled'
  | 'restructured'
  | 'forfeited';

export interface BillingScheduleInstallment {
  installment_id: string;
  schedule_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  created_at: string;
}

export interface BillingSchedule {
  schedule_id: string;
  account_id: string;
  version: number;
  effective_date: string;
  is_active: boolean;
  term_months: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  installments?: BillingScheduleInstallment[];
}

export interface BillingTransaction {
  transaction_id: string;
  account_id: string;
  transaction_sequence: number;
  transaction_type: 'payment' | 'penalty_charge' | 'fee_charge' | 'adjustment' | 'reversal';
  value_date: string;
  amount: number;
  reverses_transaction_id: string | null;
  is_reversed: boolean;
  posted_by: string;
  remarks: string | null;
  created_at: string;
}

export interface BillingPaymentApplication {
  application_id: string;
  payment_id: string;
  allocation_type:
    | 'penalty'
    | 'interest'
    | 'tax'
    | 'principal'
    | 'titling_fee'
    | 'storage_fee'
    | 'overpayment_credit';
  installment_id: string | null;
  amount: number;
  created_at: string;
}

export interface BillingPayment {
  payment_id: string;
  account_id?: string;
  transaction_id: string;
  or_series: string;
  or_number: string;
  payment_mode: PaymentMode;
  total_received: number;
  receipt_attachment_id: string | null;
  is_historical_split: boolean;
  created_at: string;
  payment_date?: string;
  principal_amount?: number;
  penalty_amount?: number;
  storage_fee_amount?: number;
  titling_fee_amount?: number;
  total_amount?: number;
  remarks?: string | null;
  received_by?: string | null;
  applications?: BillingPaymentApplication[];
}

export interface BillingPostDatedCheck {
  check_id: string;
  account_id: string;
  check_number: string;
  bank_name: string;
  check_date: string;
  amount: number;
  status: PdcStatus;
  cleared_payment_id: string | null;
  returned_reason: string | null;
  received_by: string | null;
  created_at: string;
}

export interface BillingPenaltyPolicy {
  policy_id: string;
  name: string;
  rate_percent: number;
  basis: 'overdue_installment' | 'remaining_balance';
  grace_period_days: number;
  description: string | null;
  created_at: string;
}

export interface BillingAccountPenaltyArrangement {
  arrangement_id: string;
  account_id: string;
  policy_id: string;
  start_date: string;
  end_date: string | null;
  authority: string;
  extends_contract_term: boolean;
  approved_by: string | null;
  reason: string;
  created_at: string;
  policy?: BillingPenaltyPolicy;
}

export interface BillingHoldingCharge {
  holding_charge_id: string;
  account_id: string;
  period_month: string;
  amount: number;
  is_paid: boolean;
  created_at: string;
}

export interface BillingImportDiscrepancy {
  discrepancy_id: string;
  account_id: string | null;
  source_filename: string;
  sheet_name: string | null;
  discrepancy_type:
    | 'total_mismatch'
    | 'date_precedes_due'
    | 'duplicate_receipt'
    | 'missing_receipt'
    | 'installment_amount_mismatch'
    | 'matured_with_balance';
  details: Record<string, unknown>;
  status: 'pending' | 'resolved' | 'dismissed';
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface BillingAccountNotice {
  notice_id: string;
  account_id: string;
  notice_type: NoticeType;
  attempt_number?: number;
  notice_date: string;
  dispatch_date: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  delivery_status: DeliveryStatus;
  rts_attachment_id: string | null;
  rts_reason: string | null;
  proof_attachment_id: string | null;
  remarks: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LedgerCompromise {
  compromise_id: string;
  account_id: string;
  original_penalty: number;
  agreed_penalty: number;
  waiver_amount: number;
  restructured_months: number;
  valid_until: string | null;
  status: CompromiseStatus;
  approved_by: string | null;
  approved_at: string;
  notes: string | null;
  created_at: string;
}

export interface BillingAccountSummary {
  account_id: string;
  property_id: string;
  status: CanonicalAccountStatus | 'Active' | 'Matured' | 'Delinquent' | 'Cancelled' | 'Forfeited';
  total_contract_price: number;
  remaining_balance: number;
  monthly_amortization: number;
  terms_months: number;
  amortization_day: number;
  penalty_rate_percent: number;
  titling_fee: number;
  titling_fee_paid: number;
  storage_fee_rate: number;
  cts_date: string | null;
  first_due_date: string | null;
  contract_end_date: string | null;
  baseline_date: string | null;
  baseline_principal_paid: number;
  baseline_penalties_accrued: number;
  baseline_notes: string | null;
  cleared_at: string | null;
  cleared_by: string | null;
  cadence?: string;
  held_since?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;

  client: {
    client_id: string;
    full_name: string;
    tin_number: string | null;
    address: string | null;
    civil_status?: string | null;
    spouse_name?: string | null;
    contact_info?: ContactInfo[] | null;
  } | null;
  property: {
    property_id: string;
    location: string;
    block_number: number;
    lot_number: number;
    area_size: number;
    price_per_sqm: number;
    status: string;
    title_number: string | null;
  };

  // Dynamically derived totals
  total_selling_price?: number;
  total_paid?: number;
  total_principal_paid: number;
  total_penalty_paid: number;
  total_storage_paid: number;
  outstanding_principal?: number;
  penalties_accrued?: number;
  penalties_waived?: number;
  penalties_due?: number;
  total_due?: number;
  overpayment_credit?: number;
  installments_behind?: number;
  oldest_unpaid_due_date?: string | null;
  days_past_due?: number;

  active_compromise: LedgerCompromise | null;
  compromises?: LedgerCompromise[];
  active_schedule?: BillingSchedule | null;
  payments: BillingPayment[];
  transactions?: BillingTransaction[];
  pdcs?: BillingPostDatedCheck[];
  notices: BillingAccountNotice[];
}

export type LedgerPayment = BillingPayment;
export type LedgerAccountNotice = BillingAccountNotice;

export interface InstallmentScheduleRow {
  installment_no: number;
  due_date: string;
  monthly_due: number;
  paid_date?: string;
  amount_paid: number;
  penalty_charged: number;
  penalty_balance: number;
  total_monthly_due: number;
  tsp_outstanding_balance: number;
  receipt_no?: string;
}

export interface ReconciledLedgerSummary {
  tsp: number;
  total_paid_during_contract: number;
  total_paid_after_contract: number;
  total_amount_paid: number;
  principal_balance: number;
  penalties_during_contract: number;
  penalties_after_contract: number;
  total_penalties: number;
  effective_penalties: number;
  waiver_savings: number;
  total_amount_due: number;
  is_matured: boolean;
  schedule_rows: InstallmentScheduleRow[];
}

export interface StatementPrintPayload {
  statement_date: string;
  account: BillingAccountSummary;
  contract_baseline_terms: {
    cts_number: string | null;
    contract_date: string;
    original_terms_months: number;
    monthly_installment: number;
    penalty_rate_percent: number;
  };
  applied_arrangement: {
    policy_name: string;
    rate_percent: number;
    authority: string;
    effective_start: string;
    effective_end: string | null;
  };
  schedule: Array<{
    installment_number: number;
    due_date: string;
    amount: number;
    amount_paid: number;
    status: 'paid' | 'partial' | 'overdue' | 'future';
    settled_date: string | null;
  }>;
  charges: Array<{
    charge_date: string;
    charge_type: 'penalty' | 'storage_fee' | 'titling_fee';
    period_label: string;
    rate_applied: string;
    amount: number;
    amount_waived: number;
    amount_paid: number;
    balance: number;
  }>;
  payments: Array<{
    payment_date: string;
    or_series: string;
    or_number: string;
    payment_mode: string;
    total_received: number;
    allocated_principal: number;
    allocated_penalties: number;
    allocated_fees: number;
    allocated_credit: number;
  }>;
  totals: {
    principal_balance: number;
    penalties_balance: number;
    fees_balance: number;
    overpayment_credit: number;
    net_total_due: number;
  };
}

export interface StatementImportRowResult {
  row_number: number;
  account_name: string;
  project_area: string;
  block_no: number;
  lot_no: number;
  tsp: number;
  monthly_installment: number;
  payments_count: number;
  status: 'matched' | 'created' | 'skipped' | 'error';
  account_id?: string;
  error?: string;
  discrepancies?: string[];
}

export interface StatementImportSummary {
  total_rows: number;
  successful: number;
  failed: number;
  flagged_discrepancies: number;
  results: StatementImportRowResult[];
}

export type CsvImportSummary = StatementImportSummary;

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
