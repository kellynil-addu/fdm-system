import type { ContactInfo } from '@/lib/types/client';

export type PaymentMode = 'Cash' | 'Check' | 'Bank Transfer' | 'Online Deposit';
export type CompromiseStatus = 'Pending' | 'Approved' | 'Fulfilled' | 'Lapsed' | 'Voided';
export type NoticeType = '1st Notice' | '2nd Notice' | 'Final Demand';
export type DeliveryStatus = 'Pending' | 'Dispatched' | 'Delivered' | 'Return to Sender (RTS)';

export interface LedgerPayment {
  payment_id: string;
  account_id: string;
  or_number: string;
  payment_date: string;
  payment_mode: PaymentMode;
  principal_amount: number;
  penalty_amount: number;
  storage_fee_amount: number;
  titling_fee_amount: number;
  total_amount: number;
  receipt_attachment_id: string | null;
  remarks: string | null;
  received_by: string | null;
  created_at: string;
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

export interface LedgerAccountNotice {
  notice_id: string;
  account_id: string;
  notice_type: NoticeType;
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
  updated_at: string;
}

export interface BillingAccountSummary {
  account_id: string;
  property_id: string;
  status: 'Active' | 'Matured' | 'Delinquent' | 'Cancelled' | 'Forfeited';
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
  client: {
    client_id: string;
    full_name: string;
    tin_number: string | null;
    address: string | null;
    civil_status?: string | null;
    spouse_name?: string | null;
    /**
     * Selected with `*` by `BILLING_ACCOUNT_SELECT`, so this is the whole row
     * and lines up with `ContactInfo` exactly — which is why a billing card can
     * show a phone number instead of a fallback.
     */
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
  total_principal_paid: number;
  total_penalty_paid: number;
  total_storage_paid: number;
  active_compromise: LedgerCompromise | null;
  payments: LedgerPayment[];
  notices: LedgerAccountNotice[];
}

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

export interface CsvImportRowResult {
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
}

export interface CsvImportSummary {
  total_rows: number;
  successful: number;
  failed: number;
  results: CsvImportRowResult[];
}
