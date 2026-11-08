import { roundCentavos } from "./money";

export interface MacedaSurrenderCalculation {
  installmentsPaidMonths: number;
  installmentsPaidYears: number;
  totalInstallmentsPaid: number;
  statutoryPercentage: number;
  grossSurrenderValue: number;
  netSurrenderValue: number;
  eligibleForRefund: boolean;
}

export function computeMacedaCashSurrenderValue(params: {
  totalInstallmentsPaid: number;
  installmentsPaidMonths: number;
  authorizedDeductions?: number;
}): MacedaSurrenderCalculation {
  const { totalInstallmentsPaid, installmentsPaidMonths, authorizedDeductions = 0 } = params;
  const years = Math.floor(installmentsPaidMonths / 12);

  // Buyers who paid less than 2 years are not entitled to cash surrender value
  if (years < 2) {
    return {
      installmentsPaidMonths,
      installmentsPaidYears: years,
      totalInstallmentsPaid: roundCentavos(totalInstallmentsPaid),
      statutoryPercentage: 0,
      grossSurrenderValue: 0,
      netSurrenderValue: 0,
      eligibleForRefund: false,
    };
  }

  // 50% for the first 5 years + 5% for every additional year up to 90%
  let percentage = 50;
  if (years > 5) {
    const additionalYears = years - 5;
    percentage = Math.min(90, 50 + additionalYears * 5);
  }

  const gross = roundCentavos(totalInstallmentsPaid * (percentage / 100));
  const net = Math.max(0, roundCentavos(gross - authorizedDeductions));

  return {
    installmentsPaidMonths,
    installmentsPaidYears: years,
    totalInstallmentsPaid: roundCentavos(totalInstallmentsPaid),
    statutoryPercentage: percentage,
    grossSurrenderValue: gross,
    netSurrenderValue: net,
    eligibleForRefund: true,
  };
}
