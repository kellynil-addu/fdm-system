import { roundCentavos } from "./money";

export interface PenaltyArrangementView {
  arrangement_id: string;
  policy_id: string;
  policy_name: string;
  rate_percent: number;
  basis: "overdue_installment" | "remaining_balance";
  grace_period_days: number;
  start_date: string;
  end_date: string | null;
  authority: string;
  extends_contract_term: boolean;
}

export function resolveEffectivePenaltyArrangement(
  arrangements: PenaltyArrangementView[],
  periodDate: string
): PenaltyArrangementView | null {
  const target = new Date(periodDate).getTime();

  for (const arr of arrangements) {
    const start = new Date(arr.start_date).getTime();
    const end = arr.end_date ? new Date(arr.end_date).getTime() : Infinity;
    if (target >= start && target <= end) {
      return arr;
    }
  }

  return null;
}

export function computeMonthlyPenalty(params: {
  arrangement: PenaltyArrangementView;
  overdueInstallmentAmount: number;
  remainingBalance: number;
}): {
  amount: number;
  rateApplied: number;
  basisApplied: string;
} {
  const { arrangement, overdueInstallmentAmount, remainingBalance } = params;
  if (arrangement.rate_percent <= 0) {
    return {
      amount: 0,
      rateApplied: 0,
      basisApplied: arrangement.basis,
    };
  }

  const baseAmount =
    arrangement.basis === "remaining_balance" ? remainingBalance : overdueInstallmentAmount;
  const penalty = roundCentavos(baseAmount * (arrangement.rate_percent / 100));

  return {
    amount: penalty,
    rateApplied: arrangement.rate_percent,
    basisApplied: arrangement.basis,
  };
}
