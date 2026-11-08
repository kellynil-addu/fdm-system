import * as XLSX from "xlsx";
import { addMoney, roundCentavos, subtractMoney } from "./money";

export interface ParsedStatementDiscrepancy {
  type:
    | "total_mismatch"
    | "date_precedes_due"
    | "duplicate_receipt"
    | "missing_receipt"
    | "installment_amount_mismatch"
    | "matured_with_balance";
  description: string;
  details: Record<string, unknown>;
}

export interface ParsedStatementRow {
  installmentNumber?: number;
  dueDate?: string;
  monthlyDue?: number;
  paymentDate?: string;
  orNumber?: string;
  amountPaid?: number;
  penaltyCharged?: number;
}

export interface ParsedStatement {
  accountName?: string;
  projectArea?: string;
  blockNumber?: number;
  lotNumber?: number;
  contractDate?: string;
  totalSellingPrice?: number;
  termsMonths?: number;
  monthlyInstallment?: number;
  printedTotalDue?: number;
  recomputedTotalPaid: number;
  recomputedTotalPrincipal: number;
  recomputedTotalPenalties: number;
  rows: ParsedStatementRow[];
  discrepancies: ParsedStatementDiscrepancy[];
}

export function parseLegacyExcelWorkbook(buffer: Buffer): ParsedStatement[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const statements: ParsedStatement[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    if (!rawRows || rawRows.length < 3) continue;

    const parsed = parseSingleSheet(sheetName, rawRows);
    if (parsed) {
      statements.push(parsed);
    }
  }

  return statements;
}

function parseSingleSheet(sheetName: string, rows: unknown[][]): ParsedStatement | null {
  const discrepancies: ParsedStatementDiscrepancy[] = [];
  const statementRows: ParsedStatementRow[] = [];
  let printedTotalDue = 0;
  let totalSellingPrice = 0;
  let monthlyInstallment = 0;
  let blockNumber = 0;
  let lotNumber = 0;
  let accountName = sheetName;

  // Scan metadata rows at the top of the sheet
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || "").trim().toUpperCase();
      if (cell.includes("NAME") && row[c + 1]) {
        accountName = String(row[c + 1]).trim();
      }
      if (cell.includes("LOT") && row[c + 1]) {
        lotNumber = parseInt(String(row[c + 1])) || 0;
      }
      if (cell.includes("BLK") && row[c + 1]) {
        blockNumber = parseInt(String(row[c + 1])) || 0;
      }
      if (cell.includes("TSP") && row[c + 1]) {
        totalSellingPrice = roundCentavos(Number(row[c + 1]) || 0);
      }
      if (cell.includes("MONTHLY") && row[c + 1]) {
        monthlyInstallment = roundCentavos(Number(row[c + 1]) || 0);
      }
    }
  }

  let totalPrincipalPaid = 0;
  let totalPenaltiesCharged = 0;
  const seenReceipts = new Set<string>();

  // Extract table rows
  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || "").trim();
    if (col0.toUpperCase().includes("TOTAL")) {
      printedTotalDue = roundCentavos(Number(row[row.length - 1]) || 0);
      continue;
    }

    const instNo = parseInt(col0);
    if (isNaN(instNo)) continue;

    const dueDateStr = row[1] instanceof Date ? row[1].toISOString().split("T")[0] : String(row[1] || "");
    const dueAmount = roundCentavos(Number(row[2]) || 0);
    const payDateStr = row[3] instanceof Date ? row[3].toISOString().split("T")[0] : String(row[3] || "");
    const orNo = String(row[4] || "").trim();
    const paidAmount = roundCentavos(Number(row[5]) || 0);
    const penaltyAmount = roundCentavos(Number(row[6]) || 0);

    // Validate date sequence: payment preceding installment due date
    if (payDateStr && dueDateStr && new Date(payDateStr) < new Date(dueDateStr)) {
      discrepancies.push({
        type: "date_precedes_due",
        description: `Installment #${instNo}: payment date (${payDateStr}) precedes due date (${dueDateStr})`,
        details: { installmentNumber: instNo, payDate: payDateStr, dueDate: dueDateStr },
      });
    }

    // Validate receipt numbers
    if (paidAmount > 0) {
      if (!orNo) {
        discrepancies.push({
          type: "missing_receipt",
          description: `Installment #${instNo}: paid ${paidAmount} without official receipt number`,
          details: { installmentNumber: instNo, amount: paidAmount },
        });
      } else if (seenReceipts.has(orNo)) {
        discrepancies.push({
          type: "duplicate_receipt",
          description: `Duplicate receipt number ${orNo} found on installment #${instNo}`,
          details: { orNumber: orNo, installmentNumber: instNo },
        });
      } else {
        seenReceipts.add(orNo);
      }
    }

    // Validate installment amount vs monthly contract
    if (monthlyInstallment > 0 && dueAmount > 0 && dueAmount !== monthlyInstallment) {
      discrepancies.push({
        type: "installment_amount_mismatch",
        description: `Installment #${instNo} due amount (${dueAmount}) differs from contract monthly due (${monthlyInstallment})`,
        details: { installmentNumber: instNo, expected: monthlyInstallment, actual: dueAmount },
      });
    }

    totalPrincipalPaid = addMoney(totalPrincipalPaid, paidAmount);
    totalPenaltiesCharged = addMoney(totalPenaltiesCharged, penaltyAmount);

    statementRows.push({
      installmentNumber: instNo,
      dueDate: dueDateStr,
      monthlyDue: dueAmount,
      paymentDate: payDateStr,
      orNumber: orNo,
      amountPaid: paidAmount,
      penaltyCharged: penaltyAmount,
    });
  }

  // Validate printed totals against recomputed sum of rows
  const recomputedTotalDue = roundCentavos(
    Math.max(0, subtractMoney(totalSellingPrice, totalPrincipalPaid)) + totalPenaltiesCharged
  );
  if (printedTotalDue > 0 && Math.abs(subtractMoney(printedTotalDue, recomputedTotalDue)) > 0.01) {
    discrepancies.push({
      type: "total_mismatch",
      description: `Workbook printed total (${printedTotalDue}) disagrees with recomputed sum of rows (${recomputedTotalDue})`,
      details: { printed: printedTotalDue, recomputed: recomputedTotalDue, variance: subtractMoney(printedTotalDue, recomputedTotalDue) },
    });
  }

  return {
    accountName,
    blockNumber,
    lotNumber,
    totalSellingPrice,
    monthlyInstallment,
    printedTotalDue,
    recomputedTotalPaid: totalPrincipalPaid,
    recomputedTotalPrincipal: totalPrincipalPaid,
    recomputedTotalPenalties: totalPenaltiesCharged,
    rows: statementRows,
    discrepancies,
  };
}
