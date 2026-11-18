/**
 * Contract Interfaces & Validation Schemas for Billing Server Actions
 * Path: specs/002-billing-ledger-rewrite/contracts/billing-actions.ts
 */

import { z } from "zod";

// ============================================================================
// Core Primitive Schemas
// ============================================================================

export const centavoAmountSchema = z
  .number()
  .nonnegative()
  .transform((val) => Math.round((val + Number.EPSILON) * 100) / 100);

export const paymentModeSchema = z.enum([
  "Cash",
  "Check",
  "Bank Transfer",
  "Online Deposit",
]);

export const accountStatusSchema = z.enum([
  "active",
  "matured",
  "fully_paid",
  "fully_paid_unclaimed",
  "cancelled",
  "restructured",
  "forfeited",
]);

// ============================================================================
// Action Input Schemas
// ============================================================================

/**
 * Record a financial payment against an account with contract waterfall allocation
 */
export const recordPaymentInputSchema = z.object({
  accountId: z.string().uuid(),
  orSeries: z.string().default("Main"),
  orNumber: z.string().min(1, "Receipt number is required"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  paymentMode: paymentModeSchema,
  totalReceived: centavoAmountSchema.refine((v) => v > 0, "Payment must be greater than zero"),
  receiptAttachmentId: z.string().uuid().optional().nullable(),
  remarks: z.string().optional().nullable(),
  // Explicit allocations (optional: system calculates default waterfall if omitted)
  customAllocations: z
    .array(
      z.object({
        allocationType: z.enum([
          "penalty",
          "interest",
          "tax",
          "principal",
          "titling_fee",
          "storage_fee",
          "overpayment_credit",
        ]),
        installmentId: z.string().uuid().optional().nullable(),
        amount: centavoAmountSchema,
      })
    )
    .optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentInputSchema>;

/**
 * Reverse a posted transaction (non-destructive correction)
 */
export const reverseTransactionInputSchema = z.object({
  accountId: z.string().uuid(),
  transactionId: z.string().uuid(),
  reason: z.string().min(3, "Reason for reversal is required"),
});
export type ReverseTransactionInput = z.infer<typeof reverseTransactionInputSchema>;

/**
 * Attach or update an effective-dated penalty arrangement
 */
export const attachPenaltyArrangementInputSchema = z.object({
  accountId: z.string().uuid(),
  policyId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  authority: z.string().min(1, "Authority is required (e.g. Bayanihan Act, Board Res)"),
  extendsContractTerm: z.boolean().default(false),
  reason: z.string().min(1, "Reason is required"),
});
export type AttachPenaltyArrangementInput = z.infer<typeof attachPenaltyArrangementInputSchema>;

/**
 * Record a post-dated check (PDC) instrument (record-only)
 */
export const recordPdcInputSchema = z.object({
  accountId: z.string().uuid(),
  checkNumber: z.string().min(1),
  bankName: z.string().min(1),
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: centavoAmountSchema.refine((v) => v > 0),
});
export type RecordPdcInput = z.infer<typeof recordPdcInputSchema>;

/**
 * Restructure an account with a re-spread schedule (principal only)
 */
export const restructureAccountInputSchema = z.object({
  accountId: z.string().uuid(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  termMonths: z.number().int().min(1).max(12, "Restructuring capped at 12 months"),
  amortizationDay: z.number().int().min(1).max(31).default(28),
  reason: z.string().min(3, "Reason for restructuring is required"),
});
export type RestructureAccountInput = z.infer<typeof restructureAccountInputSchema>;

/**
 * Demand Notice logging and dispatch
 */
export const recordNoticeInputSchema = z.object({
  accountId: z.string().uuid(),
  noticeType: z.enum(["1st Notice", "2nd Notice", "Final Demand"]),
  noticeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dispatchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  courierName: z.string().default("LBC Express"),
  trackingNumber: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});
export type RecordNoticeInput = z.infer<typeof recordNoticeInputSchema>;

/**
 * Legacy Excel/CSV Statement Import
 */
export const importStatementsInputSchema = z.object({
  format: z.enum(["xlsx", "xls", "csv"]),
  fileBase64: z.string().min(1, "File content is required"),
  fileName: z.string().min(1),
  dryRun: z.boolean().default(false),
});
export type ImportStatementsInput = z.infer<typeof importStatementsInputSchema>;

/**
 * Resolve Legacy Discrepancy Queue Item
 */
export const resolveDiscrepancyInputSchema = z.object({
  discrepancyId: z.string().uuid(),
  status: z.enum(["resolved", "dismissed"]),
  resolutionNotes: z.string().min(3, "Resolution notes required"),
});
export type ResolveDiscrepancyInput = z.infer<typeof resolveDiscrepancyInputSchema>;

/**
 * Reopen a Held Forfeited Lot
 */
export const reopenForfeitedLotInputSchema = z.object({
  accountId: z.string().uuid(),
  checklistConfirmed: z.literal(true),
  remarks: z.string().optional().nullable(),
});
export type ReopenForfeitedLotInput = z.infer<typeof reopenForfeitedLotInputSchema>;
