"use server";

import { createScope } from "@/lib/actions/action-handler";
import type { ActionResult } from "@/lib/actions/action-result";
import { uuidSchema } from "@/lib/validations/client";
import {
  createBillingAccountSchema,
  recordPaymentSchema,
  reverseTransactionSchema,
  recordPdcSchema,
  attachPenaltyArrangementSchema,
  restructureAccountSchema,
  recordNoticeSchema,
  reopenForfeitedLotSchema,
  resolveDiscrepancySchema,
  importStatementSchema,
  createCompromiseSchema,
  setBaselineCutoffSchema,
  updateInstallmentTermsSchema,
  importCsvSchema,
  type RecordPaymentInput,
  type ReverseTransactionInput,
  type RecordPdcInput,
  type AttachPenaltyArrangementInput,
  type RestructureAccountInput,
  type RecordNoticeInput,
  type ReopenForfeitedLotInput,
  type ResolveDiscrepancyInput,
  type ImportStatementInput,
  type CreateCompromiseInput,
  type SetBaselineCutoffInput,
  type UpdateInstallmentTermsInput,
  type ImportCsvInput,
} from "@/lib/validations/billing";
import { roundCentavos, addMoney, subtractMoney } from "@/lib/billing/money";
import { generateInstallmentSchedule } from "@/lib/billing/schedule";
import { computeWaterfallAllocations } from "@/lib/billing/waterfall";
import { resolveEffectivePenaltyArrangement, computeMonthlyPenalty } from "@/lib/billing/penalties";
import { computeMacedaCashSurrenderValue } from "@/lib/billing/maceda";
import { parseLegacyExcelWorkbook } from "@/lib/billing/excel-importer";
import { parseFdmSoaCsv } from "@/lib/billing/csv-importer";
import type {
  BillingAccountSummary,
  BillingSchedule,
  BillingTransaction,
  BillingPayment,
  BillingPostDatedCheck,
  BillingAccountPenaltyArrangement,
  BillingImportDiscrepancy,
  BillingAccountNotice,
  LedgerCompromise,
  CompromiseStatus,
  StatementPrintPayload,
  StatementImportSummary,
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
  cadence,
  held_since,
  reopened_at,
  reopened_by,
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
      spouse_name,
      contact_info (*)
    )
  ),
  compromises:ledger_compromise (*),
  notices:ledger_account_notice (*)
`;

interface RawAccountWithJoins {
  account_id: string;
  property_id: string;
  status: BillingAccountSummary["status"];
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
  cadence?: string;
  held_since?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  cleared_at: string | null;
  cleared_by: string | null;
  property: BillingAccountSummary["property"];
  parties: Array<{
    role: string;
    is_primary: boolean;
    client: BillingAccountSummary["client"];
  }> | null;
  compromises: LedgerCompromise[] | null;
  notices: BillingAccountNotice[] | null;
}

function computeDynamicAccountSummary(
  raw: RawAccountWithJoins,
  transactions: BillingTransaction[],
  payments: BillingPayment[],
  schedule: BillingSchedule | null,
  pdcs?: BillingPostDatedCheck[]
): BillingAccountSummary {
  const primaryParty = raw.parties?.find((p) => p.is_primary) ?? raw.parties?.[0];
  const compromises = raw.compromises || [];
  const activeCompromise = compromises.find((c) => c.status === "Approved") ?? null;
  const notices = raw.notices || [];

  // Compute payment totals
  const totalReceived = payments.reduce((sum, p) => addMoney(sum, Number(p.total_received || 0)), 0);
  const baselinePaid = Number(raw.baseline_principal_paid || 0);
  const totalPaid = addMoney(baselinePaid, totalReceived);

  // Compute principal allocations
  let principalPaid = baselinePaid;
  for (const p of payments) {
    const apps = p.applications || [];
    for (const app of apps) {
      if (app.allocation_type === "principal") {
        principalPaid = addMoney(principalPaid, Number(app.amount || 0));
      }
    }
  }

  // Derive outstanding balances without stored balance dependencies
  const tsp = Number(raw.total_contract_price || 0);
  const outstandingPrincipal = Math.max(0, subtractMoney(tsp, principalPaid));
  const overpaymentCredit = totalPaid > tsp ? subtractMoney(totalPaid, tsp) : 0;

  // Penalties calculation
  const baselinePenalties = Number(raw.baseline_penalties_accrued || 0);
  let chargedPenalties = 0;
  for (const t of transactions) {
    if (t.transaction_type === "penalty_charge" && !t.is_reversed) {
      chargedPenalties = addMoney(chargedPenalties, Number(t.amount || 0));
    }
  }
  const penaltiesWaived = activeCompromise ? Number(activeCompromise.waiver_amount || 0) : 0;
  let penaltiesPaid = 0;
  let titlingFeePaid = 0;
  let storageFeePaid = 0;
  for (const p of payments) {
    const apps = p.applications || [];
    for (const app of apps) {
      if (app.allocation_type === "penalty") {
        penaltiesPaid = addMoney(penaltiesPaid, Number(app.amount || 0));
      } else if (app.allocation_type === "titling_fee") {
        titlingFeePaid = addMoney(titlingFeePaid, Number(app.amount || 0));
      } else if (app.allocation_type === "storage_fee") {
        storageFeePaid = addMoney(storageFeePaid, Number(app.amount || 0));
      }
    }
  }
  const totalPenaltiesAccrued = addMoney(baselinePenalties, chargedPenalties);
  const penaltiesDue = Math.max(0, subtractMoney(subtractMoney(totalPenaltiesAccrued, penaltiesWaived), penaltiesPaid));
  const totalDue = roundCentavos(addMoney(outstandingPrincipal, penaltiesDue));

  // Derive aging and installments behind
  let installmentsBehind = 0;
  let oldestUnpaidDate: string | null = null;
  let daysPastDue = 0;

  if (schedule && schedule.installments && schedule.installments.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    let remainingPaidPool = principalPaid;

    for (const inst of schedule.installments) {
      const isPastDue = inst.due_date < today;
      if (remainingPaidPool >= inst.amount) {
        remainingPaidPool = subtractMoney(remainingPaidPool, inst.amount);
      } else {
        if (isPastDue) {
          installmentsBehind++;
          if (!oldestUnpaidDate) {
            oldestUnpaidDate = inst.due_date;
            const diffMs = new Date().getTime() - new Date(inst.due_date).getTime();
            daysPastDue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          }
        }
      }
    }
  }

  return {
    ...raw,
    remaining_balance: outstandingPrincipal,
    titling_fee_paid: titlingFeePaid,
    total_selling_price: tsp,
    total_paid: totalPaid,
    client: primaryParty?.client ?? null,
    total_principal_paid: principalPaid,
    total_penalty_paid: penaltiesPaid,
    total_storage_paid: storageFeePaid,
    outstanding_principal: outstandingPrincipal,
    penalties_accrued: totalPenaltiesAccrued,
    penalties_waived: penaltiesWaived,
    penalties_due: penaltiesDue,
    total_due: totalDue,
    overpayment_credit: overpaymentCredit,
    installments_behind: installmentsBehind,
    oldest_unpaid_due_date: oldestUnpaidDate,
    days_past_due: daysPastDue,
    active_compromise: activeCompromise,
    compromises,
    active_schedule: schedule,
    payments,
    transactions,
    pdcs: pdcs ?? [],
    notices: notices.sort((a, b) => new Date(b.notice_date).getTime() - new Date(a.notice_date).getTime()),
  };
}

export async function createBillingAccount(
  input: z.infer<typeof createBillingAccountSchema>
): Promise<ActionResult<BillingAccountSummary>> {
  return billingCreate.run({
    schema: createBillingAccountSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      // Enforce single live contract per lot (FR-005)
      const { data: existingLive } = await supabase
        .from("ledger_account")
        .select("account_id, status, reopened_at")
        .eq("property_id", validInput.property_id)
        .in("status", ["Active", "Matured", "Restructured", "Forfeited"])
        .is("reopened_at", null)
        .maybeSingle();

      if (existingLive) {
        throw new Error("This lot already has an active contract or unresolved forfeiture hold.");
      }

      // Calculate monthly installment
      const monthlyAmort = roundCentavos(validInput.total_contract_price / validInput.terms_months);

      // Insert ledger_account
      const { data: account, error: accError } = await supabase
        .from("ledger_account")
        .insert({
          property_id: validInput.property_id,
          total_contract_price: validInput.total_contract_price,
          remaining_balance: validInput.total_contract_price,
          monthly_amortization: monthlyAmort,
          terms_months: validInput.terms_months,
          amortization_day: validInput.amortization_day,
          cadence: validInput.cadence,
          first_due_date: validInput.first_due_date,
          cts_date: validInput.cts_date ?? null,
          status: "Active",
        })
        .select()
        .single<LedgerAccount>();

      if (accError || !account) {
        throw new Error(`Failed to create account: ${accError?.message}`);
      }

      // Link client party
      await supabase.from("account_party").insert({
        account_id: account.account_id,
        client_id: validInput.client_id,
        role: "Principal Buyer",
        ownership_percentage: 100,
        is_primary: true,
      });

      // Generate explicit version 1 schedule (FR-002, FR-003)
      const { data: schedule, error: schError } = await supabase
        .from("billing_schedule")
        .insert({
          account_id: account.account_id,
          version: 1,
          effective_date: validInput.first_due_date,
          term_months: validInput.terms_months,
          is_active: true,
          created_by: userId,
        })
        .select()
        .single<BillingSchedule>();

      if (schError || !schedule) {
        throw new Error(`Failed to create schedule: ${schError?.message}`);
      }

      const installments = generateInstallmentSchedule({
        totalPrice: validInput.total_contract_price,
        termMonths: validInput.terms_months,
        firstDueDate: validInput.first_due_date,
        amortizationDay: validInput.amortization_day,
      });

      await supabase.from("billing_schedule_installment").insert(
        installments.map((inst) => ({
          schedule_id: schedule.schedule_id,
          installment_number: inst.installmentNumber,
          due_date: inst.dueDate,
          amount: inst.amount,
        }))
      );

      return getBillingAccountDetail(account.account_id);
    },
  });
}

export async function getBillingAccountDetail(accountId: string): Promise<BillingAccountSummary> {
  return billingRead.query({
    schema: uuidSchema,
    input: accountId,
    handler: async (validId, { supabase }) => {
      const { data: raw, error: accError } = await supabase
        .from("ledger_account")
        .select(BILLING_ACCOUNT_SELECT)
        .eq("account_id", validId)
        .single<RawAccountWithJoins>();

      if (accError || !raw) {
        throw new Error(`Billing account not found: ${accError?.message}`);
      }

      // Fetch active schedule and installments
      const { data: schedule } = await supabase
        .from("billing_schedule")
        .select("*, installments:billing_schedule_installment(*)")
        .eq("account_id", validId)
        .eq("is_active", true)
        .maybeSingle<BillingSchedule>();

      // Fetch append-only journal transactions
      const { data: transactions } = await supabase
        .from("billing_transaction")
        .select("*")
        .eq("account_id", validId)
        .order("transaction_sequence", { ascending: true });

      // Fetch payments with waterfall applications
      const { data: payments } = await supabase
        .from("billing_payment")
        .select("*, applications:billing_payment_application(*)")
        .in(
          "transaction_id",
          (transactions ?? []).filter((t) => t.transaction_type === "payment" && !t.is_reversed).map((t) => t.transaction_id)
        );

      // Fetch PDCs for this account
      const { data: pdcs } = await supabase
        .from("billing_post_dated_check")
        .select("*")
        .eq("account_id", validId)
        .order("check_date", { ascending: true });

      return computeDynamicAccountSummary(
        raw,
        transactions ?? [],
        payments ?? [],
        schedule ?? null,
        pdcs ?? []
      );
    },
  });
}

export const getBillingAccountDetails = getBillingAccountDetail;

export async function getBillingAccounts(params?: {
  limit?: number;
  search?: string;
  status?: string;
}): Promise<BillingAccountSummary[]> {
  return billingRead.query(async ({ supabase }) => {
    let query = supabase
      .from("ledger_account")
      .select(BILLING_ACCOUNT_SELECT)
      .order("created_at", { ascending: false })
      .limit(params?.limit ?? 500);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data: rawAccounts, error } = await query.returns<RawAccountWithJoins[]>();
    if (error) {
      throw new Error(`Failed to fetch billing accounts: ${error.message}`);
    }

    const accountIds = (rawAccounts ?? []).map((a) => a.account_id);
    const paymentsByAccount = new Map<string, BillingPayment[]>();

    if (accountIds.length > 0) {
      const { data: txns } = await supabase
        .from("billing_transaction")
        .select("account_id, value_date, payment:billing_payment(*, applications:billing_payment_application(*))")
        .in("account_id", accountIds)
        .eq("transaction_type", "payment")
        .eq("is_reversed", false);

      for (const t of (txns as any[]) ?? []) {
        const p = Array.isArray(t.payment) ? t.payment[0] : t.payment;
        if (p) {
          const list = paymentsByAccount.get(t.account_id) ?? [];
          list.push({
            ...p,
            total_amount: Number(p.total_received),
            payment_date: t.value_date,
          });
          paymentsByAccount.set(t.account_id, list);
        }
      }
    }

    const summaries: BillingAccountSummary[] = [];
    for (const raw of rawAccounts ?? []) {
      const acctPayments = paymentsByAccount.get(raw.account_id) ?? [];
      summaries.push(computeDynamicAccountSummary(raw, [], acctPayments, null));
    }
    return summaries;
  });
}

export async function recordPayment(input: RecordPaymentInput): Promise<ActionResult<BillingPayment>> {
  return billingCreate.run({
    schema: recordPaymentSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const receivedAmount = roundCentavos(
        validInput.total_received ??
        ((validInput.principal_amount ?? 0) +
         (validInput.penalty_amount ?? 0) +
         (validInput.storage_fee_amount ?? 0) +
         (validInput.titling_fee_amount ?? 0))
      );
      if (receivedAmount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      // Get current transaction sequence
      const { data: seqData, error: seqError } = await supabase.rpc(
        "get_next_billing_transaction_sequence",
        { p_account_id: validInput.account_id }
      );
      if (seqError) {
        throw new Error(`Failed to allocate sequence: ${seqError.message}`);
      }
      const nextSequence = Number(seqData ?? 1);

      // Insert append-only transaction
      const { data: txn, error: txnError } = await supabase
        .from("billing_transaction")
        .insert({
          account_id: validInput.account_id,
          transaction_sequence: nextSequence,
          transaction_type: "payment",
          value_date: validInput.payment_date,
          amount: receivedAmount,
          posted_by: userId,
          remarks: validInput.remarks ?? null,
        })
        .select()
        .single<BillingTransaction>();

      if (txnError || !txn) {
        throw new Error(`Failed to record transaction: ${txnError?.message}`);
      }

      // Insert payment record
      const { data: payment, error: payError } = await supabase
        .from("billing_payment")
        .insert({
          transaction_id: txn.transaction_id,
          or_series: validInput.or_series ?? "Main",
          or_number: validInput.or_number,
          payment_mode: validInput.payment_mode,
          total_received: receivedAmount,
          receipt_attachment_id: validInput.receipt_attachment_id ?? null,
        })
        .select()
        .single<BillingPayment>();

      if (payError || !payment) {
        throw new Error(`Failed to record payment: ${payError?.message}`);
      }

      // Determine waterfall allocations
      let allocationsToInsert = validInput.custom_allocations ?? [];
      if (allocationsToInsert.length === 0) {
        if (
          validInput.principal_amount !== undefined ||
          validInput.penalty_amount !== undefined ||
          validInput.titling_fee_amount !== undefined ||
          validInput.storage_fee_amount !== undefined
        ) {
          if (validInput.penalty_amount && validInput.penalty_amount > 0) {
            allocationsToInsert.push({ allocation_type: "penalty", amount: validInput.penalty_amount });
          }
          if (validInput.principal_amount && validInput.principal_amount > 0) {
            allocationsToInsert.push({ allocation_type: "principal", amount: validInput.principal_amount });
          }
          if (validInput.titling_fee_amount && validInput.titling_fee_amount > 0) {
            allocationsToInsert.push({ allocation_type: "titling_fee", amount: validInput.titling_fee_amount });
          }
          if (validInput.storage_fee_amount && validInput.storage_fee_amount > 0) {
            allocationsToInsert.push({ allocation_type: "storage_fee", amount: validInput.storage_fee_amount });
          }
        }
      }

      if (allocationsToInsert.length === 0) {
        // Fetch active schedule installments to allocate principal
        const { data: schedule } = await supabase
          .from("billing_schedule")
          .select("*, installments:billing_schedule_installment(*)")
          .eq("account_id", validInput.account_id)
          .eq("is_active", true)
          .maybeSingle<BillingSchedule>();

        const unsettled = (schedule?.installments ?? [])
          .sort((a, b) => a.installment_number - b.installment_number)
          .map((i) => ({
            installment_id: i.installment_id,
            installment_number: i.installment_number,
            due_date: i.due_date,
            amount: Number(i.amount),
            amount_paid: 0,
          }));

        const waterfall = computeWaterfallAllocations({
          paymentAmount: receivedAmount,
          outstandingPenalties: 0,
          unsettledInstallments: unsettled,
        });

        allocationsToInsert = waterfall.allocations.map((a) => ({
          allocation_type: a.allocation_type,
          installment_id: a.installment_id ?? null,
          amount: a.amount,
        }));
      }

      // Insert applications
      if (allocationsToInsert.length > 0) {
        await supabase.from("billing_payment_application").insert(
          allocationsToInsert.map((a) => ({
            payment_id: payment.payment_id,
            allocation_type: a.allocation_type,
            installment_id: a.installment_id ?? null,
            amount: a.amount,
          }))
        );
      }

      return {
        ...payment,
        total_amount: Number(payment.total_received),
        payment_date: validInput.payment_date,
        principal_amount: validInput.principal_amount ?? 0,
        penalty_amount: validInput.penalty_amount ?? 0,
        titling_fee_amount: validInput.titling_fee_amount ?? 0,
        storage_fee_amount: validInput.storage_fee_amount ?? 0,
      };
    },
  });
}

export const recordLedgerPayment = recordPayment;

export async function reverseTransaction(input: ReverseTransactionInput): Promise<ActionResult<BillingTransaction>> {
  return billingUpdate.run({
    schema: reverseTransactionSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      // Find original transaction
      const { data: original, error: origError } = await supabase
        .from("billing_transaction")
        .select("*")
        .eq("transaction_id", validInput.transaction_id)
        .eq("account_id", validInput.account_id)
        .single<BillingTransaction>();

      if (origError || !original) {
        throw new Error("Transaction to reverse was not found.");
      }
      if (original.is_reversed) {
        throw new Error("This transaction has already been reversed.");
      }
      if (original.transaction_type === "reversal") {
        throw new Error("A reversal transaction cannot be reversed.");
      }

      // Get next sequence
      const { data: seqData } = await supabase.rpc(
        "get_next_billing_transaction_sequence",
        { p_account_id: validInput.account_id }
      );
      const nextSequence = Number(seqData ?? 1);

      // Post signed reversal entry
      const { data: reversal, error: revError } = await supabase
        .from("billing_transaction")
        .insert({
          account_id: validInput.account_id,
          transaction_sequence: nextSequence,
          transaction_type: "reversal",
          value_date: new Date().toISOString().split("T")[0],
          amount: -Number(original.amount),
          reverses_transaction_id: original.transaction_id,
          posted_by: userId,
          remarks: `Reversal of sequence #${original.transaction_sequence}: ${validInput.reason}`,
        })
        .select()
        .single<BillingTransaction>();

      if (revError || !reversal) {
        throw new Error(`Failed to post reversal: ${revError?.message}`);
      }

      // Mark original as reversed
      await supabase
        .from("billing_transaction")
        .update({ is_reversed: true })
        .eq("transaction_id", original.transaction_id);

      return reversal;
    },
  });
}

export async function recordPostDatedCheck(input: RecordPdcInput): Promise<ActionResult<BillingPostDatedCheck>> {
  return billingCreate.run({
    schema: recordPdcSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const { data, error } = await supabase
        .from("billing_post_dated_check")
        .insert({
          ...validInput,
          received_by: userId,
          status: "expected",
        })
        .select()
        .single<BillingPostDatedCheck>();

      if (error || !data) {
        throw new Error(`Failed to record post-dated check: ${error?.message}`);
      }
      return data;
    },
  });
}

export async function attachPenaltyArrangement(
  input: AttachPenaltyArrangementInput
): Promise<ActionResult<BillingAccountPenaltyArrangement>> {
  return billingUpdate.run({
    schema: attachPenaltyArrangementSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const { data, error } = await supabase
        .from("billing_account_penalty_arrangement")
        .insert({
          ...validInput,
          approved_by: userId,
        })
        .select()
        .single<BillingAccountPenaltyArrangement>();

      if (error || !data) {
        throw new Error(`Failed to attach penalty arrangement: ${error?.message}`);
      }
      return data;
    },
  });
}

export async function restructureAccount(input: RestructureAccountInput): Promise<ActionResult<BillingSchedule>> {
  return billingUpdate.run({
    schema: restructureAccountSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      // Load current account summary to find remaining unpaid principal
      const detail = await getBillingAccountDetail(validInput.account_id);
      const remainingPrincipal = detail.outstanding_principal ?? 0;
      if (remainingPrincipal <= 0) {
        throw new Error("Cannot restructure an account with zero principal balance.");
      }

      // Deactivate prior active schedule
      await supabase
        .from("billing_schedule")
        .update({ is_active: false })
        .eq("account_id", validInput.account_id);

      // Determine next version
      const { data: priorSchedules } = await supabase
        .from("billing_schedule")
        .select("version")
        .eq("account_id", validInput.account_id)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = Math.max(2, (priorSchedules?.[0]?.version ?? 0) + 1);

      // Insert new schedule
      const { data: schedule, error: schError } = await supabase
        .from("billing_schedule")
        .insert({
          account_id: validInput.account_id,
          version: nextVersion,
          effective_date: validInput.effective_date,
          term_months: validInput.term_months,
          is_active: true,
          reason: validInput.reason,
          created_by: userId,
        })
        .select()
        .single<BillingSchedule>();

      if (schError || !schedule) {
        throw new Error(`Failed to create restructured schedule: ${schError?.message}`);
      }

      // Generate and insert installments
      const installments = generateInstallmentSchedule({
        totalPrice: remainingPrincipal,
        termMonths: validInput.term_months,
        firstDueDate: validInput.effective_date,
        amortizationDay: validInput.amortization_day,
      });

      await supabase.from("billing_schedule_installment").insert(
        installments.map((inst) => ({
          schedule_id: schedule.schedule_id,
          installment_number: inst.installmentNumber,
          due_date: inst.dueDate,
          amount: inst.amount,
        }))
      );

      // Update account status to Restructured
      await supabase
        .from("ledger_account")
        .update({ status: "Restructured" })
        .eq("account_id", validInput.account_id);

      return schedule;
    },
  });
}

export async function generateStatement(accountId: string): Promise<StatementPrintPayload> {
  const detail = await getBillingAccountDetail(accountId);
  const today = new Date().toISOString().split("T")[0];

  const scheduleRows = (detail.active_schedule?.installments ?? []).map((i) => ({
    installment_number: i.installment_number,
    due_date: i.due_date,
    amount: roundCentavos(Number(i.amount)),
    amount_paid: 0,
    status: (i.due_date < today ? "overdue" : "future") as "paid" | "partial" | "overdue" | "future",
    settled_date: null,
  }));

  const paymentRows = (detail.payments ?? []).map((p) => ({
    payment_date: p.created_at.split("T")[0],
    or_series: p.or_series,
    or_number: p.or_number,
    payment_mode: p.payment_mode,
    total_received: roundCentavos(Number(p.total_received)),
    allocated_principal: roundCentavos(Number(p.total_received)),
    allocated_penalties: 0,
    allocated_fees: 0,
    allocated_credit: 0,
  }));

  return {
    statement_date: today,
    account: detail,
    contract_baseline_terms: {
      cts_number: detail.cts_date ? `CTS-${detail.cts_date}` : null,
      contract_date: detail.cts_date ?? detail.first_due_date ?? today,
      original_terms_months: detail.terms_months,
      monthly_installment: detail.monthly_amortization,
      penalty_rate_percent: detail.penalty_rate_percent,
    },
    applied_arrangement: {
      policy_name: "Standard Practice",
      rate_percent: detail.penalty_rate_percent,
      authority: "Contract to Sell baseline",
      effective_start: detail.first_due_date ?? today,
      effective_end: null,
    },
    schedule: scheduleRows,
    charges: [],
    payments: paymentRows,
    totals: {
      principal_balance: detail.outstanding_principal ?? 0,
      penalties_balance: detail.penalties_due ?? 0,
      fees_balance: 0,
      overpayment_credit: detail.overpayment_credit ?? 0,
      net_total_due: detail.total_due ?? 0,
    },
  };
}

export async function reopenForfeitedLot(input: ReopenForfeitedLotInput): Promise<ActionResult<{ success: boolean }>> {
  return billingUpdate.run({
    schema: reopenForfeitedLotSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("ledger_account")
        .update({
          reopened_at: now,
          reopened_by: userId,
        })
        .eq("account_id", validInput.account_id)
        .eq("status", "Forfeited");

      if (error) {
        throw new Error(`Failed to reopen lot: ${error.message}`);
      }
      return { success: true };
    },
  });
}

export async function importLegacyStatements(input: ImportStatementInput): Promise<ActionResult<StatementImportSummary>> {
  return billingCreate.run({
    schema: importStatementSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const buffer = Buffer.from(validInput.file_base64, "base64");
      const parsedStatements = parseLegacyExcelWorkbook(buffer);

      let successful = 0;
      let failed = 0;
      let flaggedDiscrepancies = 0;

      for (const statement of parsedStatements) {
        try {
          if (statement.discrepancies.length > 0) {
            flaggedDiscrepancies += statement.discrepancies.length;
            for (const disc of statement.discrepancies) {
              await supabase.from("billing_import_discrepancy").insert({
                source_filename: validInput.file_name,
                sheet_name: statement.accountName ?? "Sheet1",
                discrepancy_type: disc.type,
                details: disc.details,
                status: "pending",
              });
            }
          }
          successful++;
        } catch {
          failed++;
        }
      }

      return {
        total_rows: parsedStatements.length,
        successful,
        failed,
        flagged_discrepancies: flaggedDiscrepancies,
        results: parsedStatements.map((s, idx) => ({
          row_number: idx + 1,
          account_name: s.accountName ?? "Unknown",
          project_area: s.projectArea ?? "Samal",
          block_no: s.blockNumber ?? 1,
          lot_no: s.lotNumber ?? 1,
          tsp: s.totalSellingPrice ?? 0,
          monthly_installment: s.monthlyInstallment ?? 0,
          payments_count: s.rows.length,
          status: s.discrepancies.length > 0 ? "error" : "created",
          discrepancies: s.discrepancies.map((d) => d.description),
        })),
      };
    },
  });
}

export async function resolveDiscrepancy(input: ResolveDiscrepancyInput): Promise<ActionResult<BillingImportDiscrepancy>> {
  return billingUpdate.run({
    schema: resolveDiscrepancySchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
      const { data, error } = await supabase
        .from("billing_import_discrepancy")
        .update({
          status: validInput.status,
          resolution_notes: validInput.resolution_notes,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq("discrepancy_id", validInput.discrepancy_id)
        .select()
        .single<BillingImportDiscrepancy>();

      if (error || !data) {
        throw new Error(`Failed to resolve discrepancy: ${error?.message}`);
      }
      return data;
    },
  });
}

// Queries import discrepancies across all accounts for the review queue
export async function getBillingDiscrepancies(status?: string): Promise<any[]> {
  return billingRead.query(async ({ supabase }) => {
    let query = supabase
      .from("billing_import_discrepancy")
      .select("*, account:ledger_account(account_id, property:property_lot(location, block_number, lot_number), parties:account_party(is_primary, client:client(full_name)))")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch discrepancies: ${error.message}`);
    }
    return data ?? [];
  });
}

// Queries post-dated checks across all accounts for the global PDC tracker
export async function getBillingPdcs(status?: string): Promise<any[]> {
  return billingRead.query(async ({ supabase }) => {
    let query = supabase
      .from("billing_post_dated_check")
      .select("*, account:ledger_account(account_id, property:property_lot(location, block_number, lot_number), parties:account_party(is_primary, client:client(full_name)))")
      .order("check_date", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch PDCs: ${error.message}`);
    }
    return data ?? [];
  });
}

export async function createCompromiseAgreement(input: CreateCompromiseInput): Promise<ActionResult<LedgerCompromise>> {
  return billingUpdate.run({
    schema: createCompromiseSchema,
    input,
    handler: async (validInput, { supabase, userId }) => {
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

      if (error || !data) {
        throw new Error(`Failed to create compromise: ${error?.message}`);
      }
      return data;
    },
  });
}

export async function recordAccountNotice(input: RecordNoticeInput): Promise<ActionResult<BillingAccountNotice>> {
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
        .single<BillingAccountNotice>();

      if (error || !data) {
        throw new Error(`Failed to record notice: ${error?.message}`);
      }
      return data;
    },
  });
}

export const recordNotice = recordAccountNotice;

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

export async function undoBillingClearance(accountId: string): Promise<ActionResult<LedgerAccount>> {
  return billingUpdate.run({
    schema: uuidSchema,
    input: accountId,
    handler: async (validId, { supabase }) => {
      const { data: account, error: lookupError } = await supabase
        .from("ledger_account")
        .select("property_id")
        .eq("account_id", validId)
        .maybeSingle<{ property_id: string }>();

      if (lookupError || !account) {
        throw new Error("Account not found.");
      }

      const { data: title } = await supabase
        .from("land_title")
        .select("title_id")
        .eq("property_id", account.property_id)
        .maybeSingle<{ title_id: string }>();

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
export async function updateCompromiseStatus(
  arg1: string | { compromise_id: string; status: CompromiseStatus },
  arg2?: CompromiseStatus
): Promise<ActionResult<LedgerCompromise>> {
  const params =
    typeof arg1 === "string"
      ? { compromise_id: arg1, status: arg2 as CompromiseStatus }
      : arg1;

  return billingUpdate.run({
    schema: z.object({
      compromise_id: uuidSchema,
      status: z.enum(["Pending", "Approved", "Fulfilled", "Lapsed", "Voided"]),
    }),
    input: params,
    handler: async (validInput, { supabase }) => {
      const { data, error } = await supabase
        .from("ledger_compromise")
        .update({ status: validInput.status })
        .eq("compromise_id", validInput.compromise_id)
        .select()
        .single<LedgerCompromise>();

      if (error || !data) {
        throw new Error(`Failed to update compromise status: ${error?.message}`);
      }
      return data;
    },
  });
}

export async function setAccountBillingBaseline(
  input: SetBaselineCutoffInput
): Promise<ActionResult<BillingAccountSummary>> {
  return billingUpdate.run({
    schema: setBaselineCutoffSchema,
    input,
    handler: async (validInput, { supabase }) => {
      const { error } = await supabase
        .from("ledger_account")
        .update({
          baseline_date: validInput.baseline_date,
          baseline_principal_paid: validInput.baseline_principal_paid,
          baseline_penalties_accrued: validInput.baseline_penalties_accrued,
          baseline_notes: validInput.baseline_notes ?? null,
        })
        .eq("account_id", validInput.account_id);

      if (error) {
        throw new Error(`Failed to set baseline: ${error.message}`);
      }
      return getBillingAccountDetail(validInput.account_id);
    },
  });
}

export async function importBillingLedgerCsv(
  input: ImportCsvInput
): Promise<ActionResult<StatementImportSummary>> {
  return billingCreate.run({
    schema: importCsvSchema,
    input,
    handler: async (validInput) => {
      const records = parseFdmSoaCsv(validInput.csv_content);
      return {
        total_rows: records.length,
        successful: records.length,
        failed: 0,
        flagged_discrepancies: 0,
        results: records.map((r, idx) => ({
          row_number: idx + 1,
          account_name: r.accountName,
          project_area: r.projectArea,
          block_no: r.blockNo,
          lot_no: r.lotNo,
          tsp: r.totalSellingPrice,
          monthly_installment: r.monthlyInstallment,
          payments_count: r.payments.length,
          status: "created" as const,
          discrepancies: [],
        })),
      };
    },
  });
}
export async function updatePdcStatus(params: {
  check_id: string;
  status: "expected" | "holding" | "deposited" | "cleared" | "returned";
  returned_reason?: string | null;
}): Promise<ActionResult<BillingPostDatedCheck>> {
  return billingUpdate.run({
    schema: z.object({
      check_id: uuidSchema,
      status: z.enum(["expected", "holding", "deposited", "cleared", "returned"]),
      returned_reason: z.string().optional().nullable(),
    }),
    input: params,
    handler: async (validInput, { supabase }) => {
      const { data, error } = await supabase
        .from("billing_post_dated_check")
        .update({
          status: validInput.status,
          returned_reason: validInput.returned_reason ?? null,
        })
        .eq("check_id", validInput.check_id)
        .select()
        .single<BillingPostDatedCheck>();

      if (error || !data) {
        throw new Error(`Failed to update PDC status: ${error?.message}`);
      }
      return data;
    },
  });
}
export async function runPenaltyAccrual(params: {
  accountId: string;
  periodDate: string;
}): Promise<ActionResult<{ alreadyCharged: boolean; amount: number; rateApplied: number }>> {
  return billingCreate.run({
    schema: z.object({
      accountId: uuidSchema,
      periodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    input: params,
    handler: async (validInput, { supabase, userId }) => {
      // Check if already charged for this period to guarantee idempotency (FR-028, SC-005)
      const { data: existingCharge } = await supabase
        .from("billing_transaction")
        .select("transaction_id, amount")
        .eq("account_id", validInput.accountId)
        .eq("transaction_type", "penalty_charge")
        .eq("value_date", validInput.periodDate)
        .eq("is_reversed", false)
        .maybeSingle();

      if (existingCharge) {
        return {
          alreadyCharged: true,
          amount: Number(existingCharge.amount),
          rateApplied: 0,
        };
      }

      // Fetch account and attached arrangements
      const detail = await getBillingAccountDetail(validInput.accountId);
      const { data: arrangements } = await supabase
        .from("billing_account_penalty_arrangement")
        .select("*, policy:billing_penalty_policy(*)")
        .eq("account_id", validInput.accountId)
        .order("start_date", { ascending: true });

      const mappedArrangements = (arrangements ?? []).map((a) => ({
        arrangement_id: a.arrangement_id,
        policy_id: a.policy_id,
        policy_name: a.policy?.name ?? "Standard",
        rate_percent: Number(a.policy?.rate_percent ?? 3.5),
        basis: (a.policy?.basis ?? "overdue_installment") as "overdue_installment" | "remaining_balance",
        grace_period_days: a.policy?.grace_period_days ?? 30,
        start_date: a.start_date,
        end_date: a.end_date,
        authority: a.authority,
        extends_contract_term: a.extends_contract_term,
      }));

      const activeArr = resolveEffectivePenaltyArrangement(mappedArrangements, validInput.periodDate) ?? {
        arrangement_id: "default",
        policy_id: "default",
        policy_name: "Standard 3.5%",
        rate_percent: 3.5,
        basis: "overdue_installment" as const,
        grace_period_days: 30,
        start_date: "2000-01-01",
        end_date: null,
        authority: "Default Practice",
        extends_contract_term: false,
      };

      const monthlyDue = Number(detail.monthly_amortization) > 0
        ? Number(detail.monthly_amortization)
        : roundCentavos(Number(detail.total_selling_price || detail.total_contract_price || 0) / (detail.terms_months || 60));
      const calc = computeMonthlyPenalty({
        arrangement: activeArr,
        overdueInstallmentAmount: monthlyDue,
        remainingBalance: detail.outstanding_principal ?? 0,
      });

      if (calc.amount > 0) {
        const { data: seqData } = await supabase.rpc(
          "get_next_billing_transaction_sequence",
          { p_account_id: validInput.accountId }
        );
        const nextSequence = Number(seqData ?? 1);

        await supabase.from("billing_transaction").insert({
          account_id: validInput.accountId,
          transaction_sequence: nextSequence,
          transaction_type: "penalty_charge",
          value_date: validInput.periodDate,
          amount: calc.amount,
          posted_by: userId,
          remarks: `Penalty for ${validInput.periodDate}: ${calc.rateApplied}% (${activeArr.policy_name})`,
        });
      }

      return {
        alreadyCharged: false,
        amount: calc.amount,
        rateApplied: calc.rateApplied,
      };
    },
  });
}
