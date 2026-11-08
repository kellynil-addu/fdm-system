import { z } from 'zod';
import { roundCentavos } from '@/lib/billing/money';

export const centavoAmountSchema = z
  .number()
  .nonnegative()
  .transform((val) => roundCentavos(val));

export const paymentModeSchema = z.enum([
  'Cash',
  'Check',
  'Bank Transfer',
  'Online Deposit',
]);

export const accountStatusSchema = z.enum([
  'active',
  'matured',
  'fully_paid',
  'fully_paid_unclaimed',
  'cancelled',
  'restructured',
  'forfeited',
]);

export const createBillingAccountSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
  client_id: z.string().uuid('Invalid client ID'),
  total_contract_price: centavoAmountSchema.refine((v) => v > 0, 'Total selling price must be positive'),
  terms_months: z.number().int().min(1).max(120).default(60),
  amortization_day: z.number().int().min(1).max(31).default(28),
  cadence: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']).default('monthly'),
  first_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  cts_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export type CreateBillingAccountInput = z.infer<typeof createBillingAccountSchema>;

export const recordPaymentSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  or_series: z.string().optional(),
  or_number: z.string().min(1, 'Receipt/OR number is required'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  payment_mode: paymentModeSchema,
  total_received: centavoAmountSchema.optional(),
  principal_amount: centavoAmountSchema.optional(),
  penalty_amount: centavoAmountSchema.optional(),
  storage_fee_amount: centavoAmountSchema.optional(),
  titling_fee_amount: centavoAmountSchema.optional(),
  receipt_attachment_id: z.string().uuid().optional().nullable(),
  remarks: z.string().optional().nullable(),
  custom_allocations: z
    .array(
      z.object({
        allocation_type: z.enum([
          'penalty',
          'interest',
          'tax',
          'principal',
          'titling_fee',
          'storage_fee',
          'overpayment_credit',
        ]),
        installment_id: z.string().uuid().optional().nullable(),
        amount: centavoAmountSchema,
      })
    )
    .optional(),
});

export const reverseTransactionSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  transaction_id: z.string().uuid('Invalid transaction ID'),
  reason: z.string().min(3, 'Reason for reversal is required'),
});

export const recordPdcSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  check_number: z.string().min(1, 'Check number is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  check_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  amount: centavoAmountSchema.refine((v) => v > 0, 'Amount must be positive'),
});

export const attachPenaltyArrangementSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  policy_id: z.string().uuid('Invalid policy ID'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  authority: z.string().min(1, 'Authority is required'),
  extends_contract_term: z.boolean(),
  reason: z.string().min(1, 'Reason is required'),
});

export const restructureAccountSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  term_months: z.number().int().min(1).max(12, 'Restructuring cannot exceed 12 months'),
  amortization_day: z.number().int().min(1).max(31),
  reason: z.string().min(3, 'Reason for restructuring is required'),
});

export const recordNoticeSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  notice_type: z.enum(['1st Notice', '2nd Notice', 'Final Demand']),
  notice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  dispatch_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  courier_name: z.string().min(1, 'Courier name is required'),
  tracking_number: z.string().optional().nullable(),
  delivery_status: z.enum(['Pending', 'Dispatched', 'Delivered', 'Return to Sender (RTS)']),
  rts_attachment_id: z.string().uuid().optional().nullable(),
  rts_reason: z.string().optional().nullable(),
  proof_attachment_id: z.string().uuid().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const reopenForfeitedLotSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  checklist_confirmed: z.literal(true),
  remarks: z.string().optional().nullable(),
});

export const resolveDiscrepancySchema = z.object({
  discrepancy_id: z.string().uuid('Invalid discrepancy ID'),
  status: z.enum(['resolved', 'dismissed']),
  resolution_notes: z.string().min(3, 'Resolution notes required'),
});

export const importStatementSchema = z.object({
  format: z.enum(['xlsx', 'xls', 'csv']),
  file_base64: z.string().min(1, 'File content is required'),
  file_name: z.string().min(1, 'File name is required'),
  dry_run: z.boolean().optional(),
});

export const createCompromiseSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  original_penalty: z.number().min(0),
  agreed_penalty: z.number().min(0, 'Agreed penalty cannot be negative'),
  restructured_months: z.number().int().min(0).max(12, 'Restructuring cannot exceed 12 months'),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const setBaselineCutoffSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  baseline_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  baseline_principal_paid: z.number().min(0, 'Principal paid cannot be negative'),
  baseline_penalties_accrued: z.number().min(0, 'Accrued penalties cannot be negative'),
  baseline_notes: z.string().optional().nullable(),
});

export const billingClearanceSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  remarks: z.string().optional().nullable(),
});

export const updateInstallmentTermsSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  monthly_amortization: z.number().min(0),
  terms_months: z.number().int().min(1).max(120),
  amortization_day: z.number().int().min(1).max(31),
  penalty_rate_percent: z.number().min(0).max(20),
  titling_fee: z.number().min(0),
  cts_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  first_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const importCsvSchema = z.object({
  csv_content: z.string().min(1, 'CSV content is required'),
  dry_run: z.boolean().optional().default(false),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ReverseTransactionInput = z.infer<typeof reverseTransactionSchema>;
export type RecordPdcInput = z.infer<typeof recordPdcSchema>;
export type AttachPenaltyArrangementInput = z.infer<typeof attachPenaltyArrangementSchema>;
export type RestructureAccountInput = z.infer<typeof restructureAccountSchema>;
export type RecordNoticeInput = z.infer<typeof recordNoticeSchema>;
export type ReopenForfeitedLotInput = z.infer<typeof reopenForfeitedLotSchema>;
export type ResolveDiscrepancyInput = z.infer<typeof resolveDiscrepancySchema>;
export type ImportStatementInput = z.infer<typeof importStatementSchema>;
export type CreateCompromiseInput = z.infer<typeof createCompromiseSchema>;
export type SetBaselineCutoffInput = z.infer<typeof setBaselineCutoffSchema>;
export type UpdateInstallmentTermsInput = z.infer<typeof updateInstallmentTermsSchema>;
export type ImportCsvInput = z.infer<typeof importCsvSchema>;
