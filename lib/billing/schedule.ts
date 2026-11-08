import { addMoney, divideMoneyWithResidual, roundCentavos } from "./money";

export interface GeneratedInstallment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

export function generateInstallmentSchedule(params: {
  totalPrice: number;
  termMonths: number;
  firstDueDate: string;
  amortizationDay: number;
}): GeneratedInstallment[] {
  const { totalPrice, termMonths, firstDueDate, amortizationDay } = params;
  if (termMonths <= 0) throw new Error("termMonths must be positive");
  if (totalPrice <= 0) throw new Error("totalPrice must be positive");

  const { amounts } = divideMoneyWithResidual(totalPrice, termMonths);
  const startDate = new Date(firstDueDate);
  const installments: GeneratedInstallment[] = [];

  for (let i = 0; i < termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);

    // Clamp amortization day for months with fewer days
    const maxDays = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(amortizationDay, maxDays);
    dueDate.setDate(clampedDay);

    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, "0");
    const day = String(dueDate.getDate()).padStart(2, "0");

    installments.push({
      installmentNumber: i + 1,
      dueDate: `${year}-${month}-${day}`,
      amount: amounts[i],
    });
  }

  // Verify total sums exactly to total selling price to the centavo
  const sum = installments.reduce((acc, curr) => addMoney(acc, curr.amount), 0);
  if (roundCentavos(sum) !== roundCentavos(totalPrice)) {
    throw new Error(`Schedule sum ${sum} does not match total price ${totalPrice}`);
  }

  return installments;
}
