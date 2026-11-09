import type {
  BillingAccountSummary,
  BillingPaymentApplication,
  PaymentMode,
  CanonicalAccountStatus,
} from '@/lib/types/billing';

export interface WaterfallItem {
  key: string;
  category: 'penalty' | 'installment' | 'storage_fee' | 'titling_fee' | 'overpayment_credit';
  label: string;
  originalDue: number;
  allocatedAmount: number;
  remainingDue: number;
  isFullyCovered: boolean;
  installmentNumber?: number;
  dueDate?: string;
}

export interface WaterfallComputation {
  tenderedAmount: number;
  allocatedTotal: number;
  delta: number;
  isBalanced: boolean;
  items: WaterfallItem[];
}

export const FIXTURE_ARREARS_ACCOUNT: BillingAccountSummary = {
  account_id: 'acc-demo-arrears',
  property_id: 'prop-demo-1',
  status: 'active' as CanonicalAccountStatus,
  total_contract_price: 510000,
  remaining_balance: 382500,
  monthly_amortization: 8500,
  terms_months: 60,
  amortization_day: 15,
  penalty_rate_percent: 3.5,
  titling_fee: 25000,
  titling_fee_paid: 0,
  storage_fee_rate: 540,
  cts_date: '2023-03-15',
  first_due_date: '2023-04-15',
  contract_end_date: '2028-03-15',
  baseline_date: '2026-01-01',
  baseline_principal_paid: 110500,
  baseline_penalties_accrued: 0,
  baseline_notes: 'Transferred from legacy manual ledger.',
  cleared_at: null,
  cleared_by: null,

  client: {
    client_id: 'cli-demo-1',
    full_name: 'Juan Dela Cruz',
    tin_number: '123-456-789-000',
    address: 'Purok 4, Babak, IGACOS, Davao del Norte',
    civil_status: 'Married',
    spouse_name: 'Elena Dela Cruz',
  },
  property: {
    property_id: 'prop-demo-1',
    location: 'Mountain Breeze Subd, Babak',
    block_number: 4,
    lot_number: 12,
    area_size: 150,
    price_per_sqm: 3400,
    status: 'Sold',
    title_number: 'T-184920',
  },

  total_principal_paid: 127500,
  total_penalty_paid: 0,
  total_storage_paid: 0,
  penalties_accrued: 2400,
  penalties_due: 2400,
  installments_behind: 2,
  oldest_unpaid_due_date: '2026-09-15',
  days_past_due: 54,

  active_compromise: null,
  payments: [],
  notices: [],
};

export const FIXTURE_CURRENT_ACCOUNT: BillingAccountSummary = {
  account_id: 'acc-demo-current',
  property_id: 'prop-demo-2',
  status: 'active' as CanonicalAccountStatus,
  total_contract_price: 432000,
  remaining_balance: 288000,
  monthly_amortization: 7200,
  terms_months: 60,
  amortization_day: 15,
  penalty_rate_percent: 3.0,
  titling_fee: 22000,
  titling_fee_paid: 5000,
  storage_fee_rate: 540,
  cts_date: '2024-05-15',
  first_due_date: '2024-06-15',
  contract_end_date: '2029-05-15',
  baseline_date: null,
  baseline_principal_paid: 0,
  baseline_penalties_accrued: 0,
  baseline_notes: null,
  cleared_at: null,
  cleared_by: null,

  client: {
    client_id: 'cli-demo-2',
    full_name: 'Maria Clara Santos',
    tin_number: '234-567-890-000',
    address: 'Sitio Balet, Peñaplata, IGACOS',
    civil_status: 'Single',
    spouse_name: null,
  },
  property: {
    property_id: 'prop-demo-2',
    location: 'Green Valley Phase 1, Peñaplata',
    block_number: 2,
    lot_number: 8,
    area_size: 120,
    price_per_sqm: 3600,
    status: 'Sold',
    title_number: 'T-190412',
  },

  total_principal_paid: 144000,
  total_penalty_paid: 0,
  total_storage_paid: 0,
  penalties_accrued: 0,
  penalties_due: 0,
  installments_behind: 0,
  oldest_unpaid_due_date: '2026-11-15',
  days_past_due: 0,

  active_compromise: null,
  payments: [],
  notices: [],
};

export const FIXTURE_MATURED_ACCOUNT: BillingAccountSummary = {
  account_id: 'acc-demo-matured',
  property_id: 'prop-demo-3',
  status: 'matured' as CanonicalAccountStatus,
  total_contract_price: 600000,
  remaining_balance: 45000,
  monthly_amortization: 10000,
  terms_months: 60,
  amortization_day: 20,
  penalty_rate_percent: 3.5,
  titling_fee: 28000,
  titling_fee_paid: 0,
  storage_fee_rate: 540,
  cts_date: '2021-02-20',
  first_due_date: '2021-03-20',
  contract_end_date: '2026-02-20',
  baseline_date: '2026-01-01',
  baseline_principal_paid: 555000,
  baseline_penalties_accrued: 6800,
  baseline_notes: 'Matured past contract term. Final payoff requested.',
  cleared_at: null,
  cleared_by: null,

  client: {
    client_id: 'cli-demo-3',
    full_name: 'Antonio Reyes',
    tin_number: '345-678-901-000',
    address: 'Brgy. San Jose, Samal District, IGACOS',
    civil_status: 'Married',
    spouse_name: 'Lourdes Reyes',
  },
  property: {
    property_id: 'prop-demo-3',
    location: 'Sunrise Hills, Samal District',
    block_number: 7,
    lot_number: 3,
    area_size: 200,
    price_per_sqm: 3000,
    status: 'Sold',
    title_number: 'T-178221',
  },

  total_principal_paid: 555000,
  total_penalty_paid: 0,
  total_storage_paid: 0,
  penalties_accrued: 6800,
  penalties_due: 6800,
  installments_behind: 4,
  oldest_unpaid_due_date: '2025-11-20',
  days_past_due: 260,

  active_compromise: null,
  payments: [],
  notices: [],
};

export const DEMO_ACCOUNTS = [
  { id: 'arrears', label: 'In Arrears (2 mos overdue + ₱2.4k penalty)', account: FIXTURE_ARREARS_ACCOUNT },
  { id: 'current', label: 'Active / Current (0 penalty, next due Nov 15)', account: FIXTURE_CURRENT_ACCOUNT },
  { id: 'matured', label: 'Matured with Balance (₱45k balance + ₱6.8k penalty)', account: FIXTURE_MATURED_ACCOUNT },
] as const;

/**
 * Calculates default waterfall allocation according to FDM domain rules:
 * 1. Accrued penalties first (unless compromised or waived)
 * 2. Overdue installments in chronological sequence
 * 3. Current / Upcoming installment
 * 4. Excess to Overpayment Credit
 */
export function calculateWaterfall(account: BillingAccountSummary, tendered: number): WaterfallComputation {
  let remainingTender = Math.max(0, tendered);
  const items: WaterfallItem[] = [];

  // 1. Accrued penalty
  const penaltyDue = Number(account.penalties_due || 0);
  if (penaltyDue > 0) {
    const allocated = Math.min(remainingTender, penaltyDue);
    remainingTender -= allocated;
    items.push({
      key: 'penalty-accrued',
      category: 'penalty',
      label: 'Accrued Penalty Due',
      originalDue: penaltyDue,
      allocatedAmount: allocated,
      remainingDue: penaltyDue - allocated,
      isFullyCovered: allocated >= penaltyDue,
    });
  }

  // 2. Overdue or upcoming installments
  const monthly = Number(account.monthly_amortization || 0);
  const arrearsCount = Math.max(1, account.installments_behind || 1);
  const startInstallment = 14; // representative installment sequence

  for (let i = 0; i < arrearsCount + 1; i++) {
    if (remainingTender <= 0 && i >= arrearsCount) break;

    const installmentNum = startInstallment + i;
    const dueAmount = monthly;
    const allocated = Math.min(remainingTender, dueAmount);
    remainingTender -= allocated;

    const isPastDue = i < arrearsCount;
    const dateLabel = isPastDue ? `Overdue (Month ${i + 1})` : 'Current / Next Due';

    items.push({
      key: `installment-${installmentNum}`,
      category: 'installment',
      label: `Installment #${installmentNum} (${dateLabel})`,
      originalDue: dueAmount,
      allocatedAmount: allocated,
      remainingDue: dueAmount - allocated,
      isFullyCovered: allocated >= dueAmount,
      installmentNumber: installmentNum,
    });
  }

  // 3. Excess to overpayment credit
  if (remainingTender > 0) {
    items.push({
      key: 'overpayment-credit',
      category: 'overpayment_credit',
      label: 'Overpayment Credit (Advance Balance)',
      originalDue: 0,
      allocatedAmount: remainingTender,
      remainingDue: 0,
      isFullyCovered: true,
    });
  }

  const allocatedTotal = items.reduce((sum, item) => sum + item.allocatedAmount, 0);
  const delta = Math.round((tendered - allocatedTotal) * 100) / 100;

  return {
    tenderedAmount: tendered,
    allocatedTotal,
    delta,
    isBalanced: Math.abs(delta) < 0.01,
    items,
  };
}

export const FORMAT_CURRENCY = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface MockPdc {
  check_id: string;
  account_id: string;
  client_name: string;
  lot_label: string;
  bank_name: string;
  check_number: string;
  check_date: string;
  amount: number;
  status: 'holding' | 'deposited' | 'cleared' | 'returned';
  days_until_maturity: number;
}

export const FIXTURE_PDCS: MockPdc[] = [
  {
    check_id: 'pdc-1',
    account_id: 'acc-demo-arrears',
    client_name: 'Juan Dela Cruz',
    lot_label: 'Blk 4 Lot 12',
    bank_name: 'BDO - Samal Branch',
    check_number: '0049281',
    check_date: '2026-11-12',
    amount: 8500,
    status: 'holding',
    days_until_maturity: 3,
  },
  {
    check_id: 'pdc-2',
    account_id: 'acc-demo-current',
    client_name: 'Maria Clara Santos',
    lot_label: 'Blk 2 Lot 8',
    bank_name: 'Metrobank - Davao',
    check_number: '1192834',
    check_date: '2026-11-20',
    amount: 7200,
    status: 'holding',
    days_until_maturity: 11,
  },
  {
    check_id: 'pdc-3',
    account_id: 'acc-demo-3',
    client_name: 'Pedro Alvarez',
    lot_label: 'Blk 5 Lot 14',
    bank_name: 'BPI - Tagum',
    check_number: '8839201',
    check_date: '2026-10-30',
    amount: 9000,
    status: 'returned',
    days_until_maturity: -10,
  },
];

export interface MockDiscrepancy {
  discrepancy_id: string;
  account_id: string;
  client_name: string;
  lot_label: string;
  source_filename: string;
  sheet_name: string;
  discrepancy_type: 'total_mismatch' | 'matured_with_balance' | 'duplicate_receipt';
  raw_file_value: string;
  recomputed_system_value: string;
  delta_amount: number;
  status: 'pending' | 'resolved';
  explanation: string;
}

export const FIXTURE_DISCREPANCIES: MockDiscrepancy[] = [
  {
    discrepancy_id: 'disc-1',
    account_id: 'acc-demo-arrears',
    client_name: 'Juan Dela Cruz',
    lot_label: 'Blk 4 Lot 12',
    source_filename: 'MountainBreeze_MasterLedger_2025.xlsx',
    sheet_name: 'Block 4',
    discrepancy_type: 'total_mismatch',
    raw_file_value: '₱390,000.00 (Printed Balance in Cell G42)',
    recomputed_system_value: '₱382,500.00 (Sum of 15 verified receipts)',
    delta_amount: 7500,
    status: 'pending',
    explanation: 'Legacy sheet had manual uncredited payment from receipt OR-2024-8119 missing from formula range SUM(G10:G40).',
  },
  {
    discrepancy_id: 'disc-2',
    account_id: 'acc-demo-matured',
    client_name: 'Antonio Reyes',
    lot_label: 'Blk 7 Lot 3',
    source_filename: 'SunriseHills_OldAccounts.xlsx',
    sheet_name: 'MaturedAccounts',
    discrepancy_type: 'matured_with_balance',
    raw_file_value: 'Status "PAID" (Manual column text note)',
    recomputed_system_value: '₱45,000.00 remaining principal + ₱6,800 penalty',
    delta_amount: 51800,
    status: 'pending',
    explanation: 'Staff wrote "PAID" in notes because contract reached 60 months, but buyer only paid 55 months of principal.',
  },
];

