import { addMoney, roundCentavos, subtractMoney } from "./money";

export interface WaterfallAllocation {
  allocation_type:
    | "penalty"
    | "interest"
    | "tax"
    | "principal"
    | "titling_fee"
    | "storage_fee"
    | "overpayment_credit";
  installment_id?: string | null;
  amount: number;
}

export interface UnsettledInstallment {
  installment_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  amount_paid: number;
}

export function computeWaterfallAllocations(params: {
  paymentAmount: number;
  outstandingPenalties: number;
  outstandingInterest?: number;
  outstandingTaxes?: number;
  outstandingTitlingFee?: number;
  outstandingStorageFee?: number;
  unsettledInstallments: UnsettledInstallment[];
}): {
  allocations: WaterfallAllocation[];
  allocatedPrincipal: number;
  allocatedPenalties: number;
  allocatedFees: number;
  allocatedCredit: number;
  remainingUnallocated: number;
} {
  let unallocated = roundCentavos(params.paymentAmount);
  const allocations: WaterfallAllocation[] = [];

  // 1. Penalties first per Contract to Sell waterfall
  const penaltyDue = roundCentavos(params.outstandingPenalties);
  if (unallocated > 0 && penaltyDue > 0) {
    const payPenalty = Math.min(unallocated, penaltyDue);
    allocations.push({ allocation_type: "penalty", amount: payPenalty });
    unallocated = subtractMoney(unallocated, payPenalty);
  }

  // 2. Interest
  const interestDue = roundCentavos(params.outstandingInterest ?? 0);
  if (unallocated > 0 && interestDue > 0) {
    const payInterest = Math.min(unallocated, interestDue);
    allocations.push({ allocation_type: "interest", amount: payInterest });
    unallocated = subtractMoney(unallocated, payInterest);
  }

  // 3. Taxes
  const taxesDue = roundCentavos(params.outstandingTaxes ?? 0);
  if (unallocated > 0 && taxesDue > 0) {
    const payTaxes = Math.min(unallocated, taxesDue);
    allocations.push({ allocation_type: "tax", amount: payTaxes });
    unallocated = subtractMoney(unallocated, payTaxes);
  }

  // 4. Principal applied sequentially to unpaid installments
  for (const inst of params.unsettledInstallments) {
    if (unallocated <= 0) break;
    const remainingInst = subtractMoney(inst.amount, inst.amount_paid);
    if (remainingInst <= 0) continue;

    const payInst = Math.min(unallocated, remainingInst);
    allocations.push({
      allocation_type: "principal",
      installment_id: inst.installment_id,
      amount: payInst,
    });
    unallocated = subtractMoney(unallocated, payInst);
  }

  // Fallback to principal when no schedule installments are specified
  if (params.unsettledInstallments.length === 0 && unallocated > 0) {
    allocations.push({
      allocation_type: "principal",
      amount: unallocated,
    });
    unallocated = 0;
  }

  // 5. Titling Fee
  const titlingDue = roundCentavos(params.outstandingTitlingFee ?? 0);
  if (unallocated > 0 && titlingDue > 0) {
    const payTitling = Math.min(unallocated, titlingDue);
    allocations.push({ allocation_type: "titling_fee", amount: payTitling });
    unallocated = subtractMoney(unallocated, payTitling);
  }

  // 6. Storage Fee
  const storageDue = roundCentavos(params.outstandingStorageFee ?? 0);
  if (unallocated > 0 && storageDue > 0) {
    const payStorage = Math.min(unallocated, storageDue);
    allocations.push({ allocation_type: "storage_fee", amount: payStorage });
    unallocated = subtractMoney(unallocated, payStorage);
  }

  // 7. Excess becomes overpayment credit held on account
  if (unallocated > 0) {
    allocations.push({
      allocation_type: "overpayment_credit",
      amount: unallocated,
    });
  }

  const allocatedPrincipal = allocations
    .filter((a) => a.allocation_type === "principal")
    .reduce((sum, a) => addMoney(sum, a.amount), 0);
  const allocatedPenalties = allocations
    .filter((a) => a.allocation_type === "penalty")
    .reduce((sum, a) => addMoney(sum, a.amount), 0);
  const allocatedFees = allocations
    .filter((a) => a.allocation_type === "titling_fee" || a.allocation_type === "storage_fee")
    .reduce((sum, a) => addMoney(sum, a.amount), 0);
  const allocatedCredit = allocations
    .filter((a) => a.allocation_type === "overpayment_credit")
    .reduce((sum, a) => addMoney(sum, a.amount), 0);

  return {
    allocations,
    allocatedPrincipal,
    allocatedPenalties,
    allocatedFees,
    allocatedCredit,
    remainingUnallocated: 0,
  };
}
