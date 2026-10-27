import type {
  BillingAccountSummary,
  InstallmentScheduleRow,
  ReconciledLedgerSummary,
  LedgerPayment,
} from '@/lib/types/billing';

/** Reconstructs the exact FDM monthly installment schedule and computes contract vs post-contract penalties */
export function calculateAccountLedgerSchedule(
  account: BillingAccountSummary,
  asOfDate: Date = new Date()
): ReconciledLedgerSummary {
  const tsp = Number(account.total_contract_price) || 0;
  const termsMonths = Number(account.terms_months) || 60;
  const monthlyDue = Number(account.monthly_amortization) || (termsMonths > 0 ? tsp / termsMonths : 0);
  const penaltyRate = (Number(account.penalty_rate_percent) || 3.5) / 100;
  
  // Baseline payments from migrated accounts
  let runningTspBalance = tsp - (Number(account.baseline_principal_paid) || 0);
  const rows: InstallmentScheduleRow[] = [];
  
  // Group itemized payments by date
  const sortedPayments = [...(account.payments || [])].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  let totalPaidDuringContract = Number(account.baseline_principal_paid) || 0;
  let totalPaidAfterContract = 0;
  let penaltiesDuringContract = Number(account.baseline_penalties_accrued) || 0;
  let penaltiesAfterContract = 0;

  // Determine contract cycle start and end dates
  const startDate = account.first_due_date
    ? new Date(account.first_due_date)
    : account.cts_date
    ? addMonths(new Date(account.cts_date), 1)
    : new Date();
  
  const contractEndDate = account.contract_end_date
    ? new Date(account.contract_end_date)
    : addMonths(startDate, termsMonths);

  let accumulatedPenaltyBalance = penaltiesDuringContract;
  let paymentIndex = 0;

  // 1. Contract Period: generate rows for installments 1 to termsMonths
  for (let i = 1; i <= termsMonths; i++) {
    const dueDate = addMonths(startDate, i - 1);
    const dueDateStr = formatDateOnly(dueDate);
    const isPastDue = dueDate.getTime() <= asOfDate.getTime();

    // Consume all payments made on or before this due date's month cycle
    const cycleEndDate = addMonths(dueDate, 1);
    const cyclePayments: LedgerPayment[] = [];
    while (
      paymentIndex < sortedPayments.length &&
      new Date(sortedPayments[paymentIndex].payment_date).getTime() < cycleEndDate.getTime()
    ) {
      cyclePayments.push(sortedPayments[paymentIndex]);
      paymentIndex++;
    }

    const totalCyclePaid = cyclePayments.reduce((acc, p) => acc + Number(p.principal_amount), 0);
    const cycleReceipts = cyclePayments.map((p) => p.or_number).join(', ');
    const lastPayDate = cyclePayments.length > 0 ? cyclePayments[cyclePayments.length - 1].payment_date : undefined;

    totalPaidDuringContract += totalCyclePaid;
    runningTspBalance -= totalCyclePaid;

    // Contract penalty: 3.5% on overdue installment amount
    let penaltyCharged = 0;
    if (isPastDue && totalPaidDuringContract < i * monthlyDue) {
      const delinquentPrincipal = Math.min(monthlyDue, (i * monthlyDue) - totalPaidDuringContract);
      penaltyCharged = delinquentPrincipal * penaltyRate;
    }
    accumulatedPenaltyBalance += penaltyCharged;
    penaltiesDuringContract += penaltyCharged;

    rows.push({
      installment_no: i,
      due_date: dueDateStr,
      monthly_due: monthlyDue,
      paid_date: lastPayDate,
      amount_paid: totalCyclePaid,
      penalty_charged: penaltyCharged,
      penalty_balance: accumulatedPenaltyBalance,
      total_monthly_due: monthlyDue + penaltyCharged,
      tsp_outstanding_balance: runningTspBalance,
      receipt_no: cycleReceipts || undefined,
    });
  }

  // 2. Post-Contract Period: monthly cycles after contract maturation
  const isMatured = asOfDate.getTime() > contractEndDate.getTime();
  let postMonth = 1;
  let currentPostDate = addMonths(contractEndDate, 1);
  const remainingAtContractEnd = Math.max(0, runningTspBalance);

  while (currentPostDate.getTime() <= asOfDate.getTime() || paymentIndex < sortedPayments.length) {
    const dueDateStr = formatDateOnly(currentPostDate);
    const cycleEndDate = addMonths(currentPostDate, 1);
    const cyclePayments: LedgerPayment[] = [];

    while (
      paymentIndex < sortedPayments.length &&
      new Date(sortedPayments[paymentIndex].payment_date).getTime() < cycleEndDate.getTime()
    ) {
      cyclePayments.push(sortedPayments[paymentIndex]);
      paymentIndex++;
    }

    const totalCyclePaid = cyclePayments.reduce((acc, p) => acc + Number(p.principal_amount), 0);
    const cycleReceipts = cyclePayments.map((p) => p.or_number).join(', ');
    const lastPayDate = cyclePayments.length > 0 ? cyclePayments[cyclePayments.length - 1].payment_date : undefined;

    totalPaidAfterContract += totalCyclePaid;
    runningTspBalance -= totalCyclePaid;

    // Post-contract penalty: 3.5% on remaining TSP principal balance at maturity
    const penaltyCharged = remainingAtContractEnd > 0 ? remainingAtContractEnd * penaltyRate : 0;
    accumulatedPenaltyBalance += penaltyCharged;
    penaltiesAfterContract += penaltyCharged;

    rows.push({
      installment_no: termsMonths + postMonth,
      due_date: dueDateStr,
      monthly_due: 0,
      paid_date: lastPayDate,
      amount_paid: totalCyclePaid,
      penalty_charged: penaltyCharged,
      penalty_balance: accumulatedPenaltyBalance,
      total_monthly_due: penaltyCharged,
      tsp_outstanding_balance: runningTspBalance,
      receipt_no: cycleReceipts || undefined,
    });

    currentPostDate = addMonths(currentPostDate, 1);
    postMonth++;
    if (postMonth > 120) break; // Safeguard against runaway loops for historical dates
  }

  const totalAmountPaid = totalPaidDuringContract + totalPaidAfterContract;
  const principalBalance = tsp - totalAmountPaid;
  const totalPenalties = penaltiesDuringContract + penaltiesAfterContract;

  // Evaluate executive compromise eligibility and deadlines
  let effectivePenalties = totalPenalties;
  let waiverSavings = 0;
  if (account.active_compromise && account.active_compromise.status === 'Approved') {
    const isLapsed = account.active_compromise.valid_until && new Date(account.active_compromise.valid_until).getTime() < asOfDate.getTime();
    if (!isLapsed) {
      effectivePenalties = Number(account.active_compromise.agreed_penalty);
      waiverSavings = Math.max(0, totalPenalties - effectivePenalties);
    }
  }

  const totalAmountDue = principalBalance + effectivePenalties;

  return {
    tsp,
    total_paid_during_contract: totalPaidDuringContract,
    total_paid_after_contract: totalPaidAfterContract,
    total_amount_paid: totalAmountPaid,
    principal_balance: principalBalance,
    penalties_during_contract: penaltiesDuringContract,
    penalties_after_contract: penaltiesAfterContract,
    total_penalties: totalPenalties,
    effective_penalties: effectivePenalties,
    waiver_savings: waiverSavings,
    total_amount_due: totalAmountDue,
    is_matured: isMatured,
    schedule_rows: rows,
  };
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}
