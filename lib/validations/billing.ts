import { z } from 'zod';

export const recordPaymentSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  or_number: z.string().min(1, 'Receipt/OR number is required'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  payment_mode: z.enum(['Cash', 'Check', 'Bank Transfer', 'Online Deposit']),
  principal_amount: z.number().min(0, 'Principal cannot be negative').default(0),
  penalty_amount: z.number().min(0, 'Penalty cannot be negative').default(0),
  storage_fee_amount: z.number().min(0, 'Storage fee cannot be negative').default(0),
  titling_fee_amount: z.number().min(0, 'Titling fee cannot be negative').default(0),
  receipt_attachment_id: z.string().uuid().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const createCompromiseSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  original_penalty: z.number().min(0),
  agreed_penalty: z.number().min(0, 'Agreed penalty cannot be negative'),
  restructured_months: z.number().int().min(0).max(12, 'Restructuring cannot exceed 12 months').default(0),
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

export const recordNoticeSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  notice_type: z.enum(['1st Notice', '2nd Notice', 'Final Demand']),
  notice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  dispatch_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  courier_name: z.string().min(1, 'Courier name is required').default('LBC Express'),
  tracking_number: z.string().optional().nullable(),
  delivery_status: z.enum(['Pending', 'Dispatched', 'Delivered', 'Return to Sender (RTS)']).default('Pending'),
  rts_attachment_id: z.string().uuid().optional().nullable(),
  rts_reason: z.string().optional().nullable(),
  proof_attachment_id: z.string().uuid().optional().nullable(),
  remarks: z.string().optional().nullable(),
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
  contract_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const importCsvSchema = z.object({
  csv_content: z.string().min(10, 'CSV content is empty'),
});

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
export type CreateCompromiseInput = z.input<typeof createCompromiseSchema>;
export type SetBaselineCutoffInput = z.input<typeof setBaselineCutoffSchema>;
export type RecordNoticeInput = z.input<typeof recordNoticeSchema>;
export type BillingClearanceInput = z.input<typeof billingClearanceSchema>;
export type UpdateInstallmentTermsInput = z.input<typeof updateInstallmentTermsSchema>;
export type ImportCsvInput = z.input<typeof importCsvSchema>;
