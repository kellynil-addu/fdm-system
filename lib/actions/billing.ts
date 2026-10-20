"use server";

import { createScope } from "@/lib/actions/action-handler";
import type { ActionResult } from "@/lib/actions/action-result";
import { uuidSchema } from "@/lib/validations/client";
import {
  recordPaymentSchema,
  createCompromiseSchema,
  setBaselineCutoffSchema,
  recordNoticeSchema,
  updateInstallmentTermsSchema,
  importCsvSchema,
  type RecordPaymentInput,
  type CreateCompromiseInput,
  type SetBaselineCutoffInput,
  type RecordNoticeInput,
  type UpdateInstallmentTermsInput,
  type ImportCsvInput,
} from "@/lib/validations/billing";
import { parseFdmSoaCsv } from "@/lib/billing/csv-importer";
import type {
  BillingAccountSummary,
  LedgerPayment,
  LedgerCompromise,
  LedgerAccountNotice,
  CsvImportSummary,
  CompromiseStatus,
} from "@/lib/types/billing";
import type { LedgerAccount } from "@/lib/types/property";
import { z } from "zod";

const billingRead = createScope(["billing.read"]);
const billingCreate = createScope(["billing.create"]);
const billingUpdate = createScope(["billing.update"]);

const clearanceInputSchema = z.preprocess(
  (val) => (typeof val === "string" ? { account_id: val } : val),
  z.object({
    account_id: uuidSchema,
    remarks: z.string().optional().nullable(),
  })
);

interface RawBillingAccountRow {
  account_id: string;
  property_id: string;
  status: "Active" | "Matured" | "Delinquent" | "Cancelled" | "Forfeited";
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
  property: BillingAccountSummary["property"];
  parties: Array<{
    role: string;
    is_primary: boolean;
    client: BillingAccountSummary["client"];
  }> | null;
  payments: LedgerPayment[] | null;
  compromises: LedgerCompromise[] | null;
  notices: LedgerAccountNotice[] | null;
}

const BILLING_ACCOUNT_SELECT = `
  account_id,
  property_id,
  status,
  total_contract_price,
  remaining_balance,
  monthly_amortization,
  terms_months,
  amortization_day,
  penalty_rate_percent,
  titling_fee,
  titling_fee_paid,
  storage_fee_rate,
  cts_date,
  first_due_date,
  contract_end_date,
  baseline_date,
  baseline_principal_paid,
  baseline_penalties_accrued,
  baseline_notes,
  cleared_at,
  cleared_by,
  property:property_lot (
    property_id,
    location,
    block_number,
    lot_number,
    area_size,
    price_per_sqm,
    status,
    title_number
  ),
  parties:account_party (
    role,
    is_primary,
    client:client (
      client_id,
      full_name,
      tin_number,
      address,
      civil_status,
      spouse_name
    )
  ),
  payments:ledger_payment (*),
  compromises:ledger_compromise (*),
  notices:ledger_account_notice (*)
`;

function mapRawAccountToSummary(account: RawBillingAccountRow): BillingAccountSummary {
  const parties = account.parties;
  const primaryParty = parties?.find((p) => p.is_primary) ?? parties?.[0];
  const compromises = account.compromises || [];
  const activeCompromise = compromises.find((c) => c.status === "Approved") ?? null;
  const payments = account.payments || [];
  const notices = account.notices || [];

  const totalPrincipal = payments.reduce((sum, p) => sum + Number(p.principal_amount), 0);
  const totalPenalty = payments.reduce((sum, p) => sum + Number(p.penalty_amount), 0);
  const totalStorage = payments.reduce((sum, p) => sum + Number(p.storage_fee_amount), 0);

  return {
    ...account,
    client: primaryParty?.client ?? null,
    property: account.property,
    total_principal_paid: totalPrincipal,
    total_penalty_paid: totalPenalty,
    total_storage_paid: totalStorage,
    active_compromise: activeCompromise,
    payments: payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
    notices: notices.sort((a, b) => new Date(b.notice_date).getTime() - new Date(a.notice_date).getTime()),
  };
}

/** Fetches full billing account summary with lot, client, payments, compromises, and notices */
export async function getBillingAccountDetails(accountId: string): Promise<BillingAccountSummary> {
  return billingRead.query({
    schema: uuidSchema,
    input: accountId,
    handler: async (validId, { supabase }) => {
      const { data: account, error: accError } = await supabase
        .from("ledger_account")
        .select(BILLING_ACCOUNT_SELECT)
        .eq("account_id", validId)
        .single<RawBillingAccountRow>();

      if (accError || !account) {
        throw new Error(`Billing account not found: ${accError?.message}`);
      }

      return mapRawAccountToSummary(account);
    },
  });
}

/** Fetches all billing accounts with properties, clients, and payment history */
export async function getBillingAccounts(
  params?: { limit?: number; search?: string; status?: string }
): Promise<BillingAccountSummary[]> {
  return billingRead.query(async ({ supabase }) => {
    let query = supabase
      .from("ledger_account")
      .select(BILLING_ACCOUNT_SELECT)
      .order("created_at", { ascending: false })
      .limit(params?.limit ?? 500);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query.returns<RawBillingAccountRow[]>();
    if (error) {
      throw new Error(`Failed to fetch billing accounts: ${error.message}`);
    }

    return (data ?? []).map(mapRawAccountToSummary);
  });
}

/** Records an official payment receipt and updates remaining balance via database trigger */
export async function recordLedgerPayment(input: RecordPaymentInput): Promise<ActionResult<LedgerPayment>> {
  return billingCreate.run({
    schema: recordPaymentSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const { data, error } = await supabase
        .from("ledger_payment")
        .insert({
          ...validInput,
          received_by: userId,
        })
        .select()
        .single<LedgerPayment>();

      if (error) {
        throw new Error(`Failed to record payment: ${error.message}`);
      }

      return data;
    },
  });
}

/** Creates an approved executive compromise settlement for penalty waivers */
export async function createCompromiseAgreement(input: CreateCompromiseInput): Promise<ActionResult<LedgerCompromise>> {
  return billingUpdate.run({
    schema: createCompromiseSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      // Mark any prior approved compromises as voided before recording the new one
      await supabase
        .from("ledger_compromise")
        .update({ status: "Voided" })
        .eq("account_id", validInput.account_id)
        .eq("status", "Approved");

      const { data, error } = await supabase
        .from("ledger_compromise")
        .insert({
          ...validInput,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          status: "Approved",
        })
        .select()
        .single<LedgerCompromise>();

      if (error) {
        throw new Error(`Failed to create compromise: ${error.message}`);
      }

      return data;
    },
  });
}

/** Updates the status of an existing compromise agreement */
export async function updateCompromiseStatus(
  compromiseId: string,
  status: CompromiseStatus
): Promise<ActionResult<void>> {
  return billingUpdate.run({
    schema: z.object({
      compromise_id: uuidSchema,
      status: z.enum(["Pending", "Approved", "Fulfilled", "Lapsed", "Voided"]),
    }),
    input: { compromise_id: compromiseId, status },
    handler: async ({ compromise_id, status: newStatus }, { supabase }) => {
      const { error } = await supabase
        .from("ledger_compromise")
        .update({ status: newStatus })
        .eq("compromise_id", compromise_id);

      if (error) {
        throw new Error(`Failed to update compromise status: ${error.message}`);
      }
    },
  });
}

/** Sets an audited legacy cut-off baseline snapshot for migration */
export async function setAccountBillingBaseline(input: SetBaselineCutoffInput): Promise<ActionResult<void>> {
  return billingUpdate.run({
    schema: setBaselineCutoffSchema,
    input,
    handler: async (validInput, { supabase }) => {
      const { account_id, ...baselineFields } = validInput;

      const { data: account, error: fetchErr } = await supabase
        .from("ledger_account")
        .select("total_contract_price")
        .eq("account_id", account_id)
        .single();

      if (fetchErr || !account) {
        throw new Error(`Account not found: ${fetchErr?.message}`);
      }

      // Sum any existing transaction payments
      const { data: payments } = await supabase
        .from("ledger_payment")
        .select("principal_amount")
        .eq("account_id", account_id);

      const paidTransactions = (payments || []).reduce((sum, p) => sum + Number(p.principal_amount), 0);
      const newRemaining = Math.max(
        0,
        Number(account.total_contract_price) - (Number(validInput.baseline_principal_paid) + paidTransactions)
      );

      const { error } = await supabase
        .from("ledger_account")
        .update({
          ...baselineFields,
          remaining_balance: newRemaining,
        })
        .eq("account_id", account_id);

      if (error) {
        throw new Error(`Failed to set baseline: ${error.message}`);
      }
    },
  });
}

/** Records a 1st, 2nd, or Final Demand notice dispatch */
export async function recordAccountNotice(input: RecordNoticeInput): Promise<ActionResult<LedgerAccountNotice>> {
  return billingCreate.run({
    schema: recordNoticeSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const { data, error } = await supabase
        .from("ledger_account_notice")
        .insert({
          ...validInput,
          generated_by: userId,
        })
        .select()
        .single<LedgerAccountNotice>();

      if (error) {
        throw new Error(`Failed to record notice: ${error.message}`);
      }

      return data;
    },
  });
}

/** Updates contract installment schedule terms */
export async function updateInstallmentTerms(input: UpdateInstallmentTermsInput): Promise<ActionResult<void>> {
  return billingUpdate.run({
    schema: updateInstallmentTermsSchema,
    input,
    handler: async (validInput, { supabase }) => {
      const { account_id, ...updates } = validInput;
      const { error } = await supabase
        .from("ledger_account")
        .update(updates)
        .eq("account_id", account_id);

      if (error) {
        throw new Error(`Failed to update installment terms: ${error.message}`);
      }
    },
  });
}

/** Ingests raw FDM Statement of Account CSV spreadsheet data */
export async function importBillingLedgerCsv(input: ImportCsvInput): Promise<ActionResult<CsvImportSummary>> {
  return billingCreate.run({
    schema: importCsvSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const parsedRecords = parseFdmSoaCsv(validInput.csv_content);
      const results: CsvImportSummary["results"] = [];

      for (let i = 0; i < parsedRecords.length; i++) {
        const rec = parsedRecords[i];
        try {
          // Find matching property lot
          const { data: lot } = await supabase
            .from("property_lot")
            .select("property_id")
            .ilike("location", `%${rec.projectArea}%`)
            .eq("block_number", rec.blockNo)
            .eq("lot_number", rec.lotNo)
            .maybeSingle();

          if (!lot) {
            results.push({
              row_number: i + 1,
              account_name: rec.accountName,
              project_area: rec.projectArea,
              block_no: rec.blockNo,
              lot_no: rec.lotNo,
              tsp: rec.totalSellingPrice,
              monthly_installment: rec.monthlyInstallment,
              payments_count: rec.payments.length,
              status: "error",
              error: `Property lot not found (Area: ${rec.projectArea}, Blk: ${rec.blockNo}, Lot: ${rec.lotNo})`,
            });
            continue;
          }

          // Locate active ledger account
          let accountId: string;
          const { data: existingAccount } = await supabase
            .from("ledger_account")
            .select("account_id")
            .eq("property_id", lot.property_id)
            .eq("status", "Active")
            .maybeSingle();

          if (existingAccount) {
            accountId = existingAccount.account_id;
            await supabase
              .from("ledger_account")
              .update({
                terms_months: rec.termsMonths,
                monthly_amortization: rec.monthlyInstallment,
                cts_date: rec.ctsDate || null,
                contract_end_date: rec.endOfContract || null,
              })
              .eq("account_id", accountId);
          } else {
            const { data: newAccount, error: createAccErr } = await supabase
              .from("ledger_account")
              .insert({
                property_id: lot.property_id,
                total_contract_price: rec.totalSellingPrice,
                remaining_balance: rec.totalSellingPrice,
                terms_months: rec.termsMonths,
                monthly_amortization: rec.monthlyInstallment,
                cts_date: rec.ctsDate || null,
                contract_end_date: rec.endOfContract || null,
                status: "Active",
              })
              .select("account_id")
              .single();

            if (createAccErr || !newAccount) {
              throw new Error(`Failed to create ledger account: ${createAccErr?.message}`);
            }
            accountId = newAccount.account_id;
          }

          // Insert batch payment records
          for (const pay of rec.payments) {
            await supabase.from("ledger_payment").insert({
              account_id: accountId,
              or_number: pay.receiptNo,
              payment_date: pay.datePaid,
              payment_mode: pay.paymentMode,
              principal_amount: pay.amountPaid,
              penalty_amount: pay.penaltyPaid,
              received_by: userId,
            });
          }

          results.push({
            row_number: i + 1,
            account_name: rec.accountName,
            project_area: rec.projectArea,
            block_no: rec.blockNo,
            lot_no: rec.lotNo,
            tsp: rec.totalSellingPrice,
            monthly_installment: rec.monthlyInstallment,
            payments_count: rec.payments.length,
            status: "matched",
            account_id: accountId,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({
            row_number: i + 1,
            account_name: rec.accountName,
            project_area: rec.projectArea,
            block_no: rec.blockNo,
            lot_no: rec.lotNo,
            tsp: rec.totalSellingPrice,
            monthly_installment: rec.monthlyInstallment,
            payments_count: rec.payments.length,
            status: "error",
            error: message,
          });
        }
      }

      const successful = results.filter((r) => r.status === "matched" || r.status === "created").length;
      return {
        total_rows: parsedRecords.length,
        successful,
        failed: parsedRecords.length - successful,
        results,
      };
    },
  });
}

/** Billing attestation that the client has settled. Lot becomes Sold and advances to Legal intake */
export async function markAccountClearedByBilling(
  input: string | { account_id: string; remarks?: string | null }
): Promise<ActionResult<LedgerAccount>> {
  return billingUpdate.run({
    schema: clearanceInputSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const validId = (validInput as { account_id: string }).account_id;

      const { data, error } = await supabase
        .from("ledger_account")
        .update({
          cleared_at: new Date().toISOString(),
          cleared_by: userId,
        })
        .eq("account_id", validId)
        .eq("status", "Active")
        .is("cleared_at", null)
        .select()
        .maybeSingle<LedgerAccount>();

      if (error) {
        throw new Error(`Failed to clear account: ${error.message}`);
      }
      if (!data) {
        throw new Error("Only an active account that has not been cleared yet can be cleared.");
      }

      return data;
    },
  });
}

/** Reverses clearance if discrepancy found by Legal review */
export async function undoBillingClearance(
  accountId: string
): Promise<ActionResult<LedgerAccount>> {
  return billingUpdate.run({
    schema: uuidSchema,
    input: accountId,
    handler: async (validId, { supabase }) => {
      const { data: account, error: lookupError } = await supabase
        .from("ledger_account")
        .select("property_id")
        .eq("account_id", validId)
        .maybeSingle<{ property_id: string }>();

      if (lookupError) {
        throw new Error(`Failed to load account: ${lookupError.message}`);
      }
      if (!account) {
        throw new Error("Account not found.");
      }

      const { data: title, error: titleError } = await supabase
        .from("land_title")
        .select("title_id")
        .eq("property_id", account.property_id)
        .maybeSingle<{ title_id: string }>();

      if (titleError) {
        throw new Error(`Failed to check the lot's title: ${titleError.message}`);
      }
      if (title) {
        throw new Error("Legal has already created the title for this lot, so the clearance cannot be undone.");
      }

      const { data, error } = await supabase
        .from("ledger_account")
        .update({ cleared_at: null, cleared_by: null })
        .eq("account_id", validId)
        .select()
        .single<LedgerAccount>();

      if (error || !data) {
        throw new Error(`Failed to undo clearance: ${error?.message ?? "Unknown error"}`);
      }

      return data;
    },
  });
}
