/**
 * Centavo Precision Money Utilities
 */

export function roundCentavos(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function toCentavos(pesos: number): number {
  return Math.round((pesos + Number.EPSILON) * 100);
}

export function fromCentavos(cents: number): number {
  return roundCentavos(cents / 100);
}

export function addMoney(a: number, b: number): number {
  return fromCentavos(toCentavos(a) + toCentavos(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromCentavos(toCentavos(a) - toCentavos(b));
}

export function multiplyMoney(amount: number, factor: number): number {
  return roundCentavos(amount * factor);
}

export function divideMoneyWithResidual(
  totalAmount: number,
  parts: number
): { regularAmount: number; residualAmount: number; amounts: number[] } {
  if (parts <= 0) throw new Error("Parts must be greater than zero");
  const totalCents = toCentavos(totalAmount);
  const baseCentsPerPart = Math.floor(totalCents / parts);
  const remainderCents = totalCents - baseCentsPerPart * parts;

  const amounts: number[] = [];
  for (let i = 0; i < parts - 1; i++) {
    amounts.push(fromCentavos(baseCentsPerPart));
  }
  // Absorb residual centavos in the final installment
  const finalCents = baseCentsPerPart + remainderCents;
  amounts.push(fromCentavos(finalCents));

  return {
    regularAmount: fromCentavos(baseCentsPerPart),
    residualAmount: fromCentavos(finalCents),
    amounts,
  };
}

export function formatCurrency(amount: number): string {
  const rounded = roundCentavos(amount);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}
