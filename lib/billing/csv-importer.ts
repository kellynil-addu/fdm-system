export interface ParsedBillingAccountRecord {
  accountName: string;
  projectArea: string;
  blockNo: number;
  lotNo: number;
  lotAreaSqm?: number;
  pricePerSqm?: number;
  ctsDate?: string;
  termsMonths: number;
  endOfContract?: string;
  totalSellingPrice: number;
  monthlyInstallment: number;
  payments: Array<{
    datePaid: string;
    amountPaid: number;
    penaltyPaid: number;
    receiptNo: string;
    paymentMode: 'Cash' | 'Check' | 'Bank Transfer' | 'Online Deposit';
  }>;
}

/** Parses raw CSV text exported from FDM Statement of Account spreadsheets */
export function parseFdmSoaCsv(csvContent: string): ParsedBillingAccountRecord[] {
  const records: ParsedBillingAccountRecord[] = [];
  const lines = csvContent.split(/\r?\n/);
  
  let currentRecord: Partial<ParsedBillingAccountRecord> | null = null;
  let inPaymentSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);

    // Detect new account block start
    if (cols[0]?.includes('FIRST DAVAO MILLENNIUM') || cols[0]?.includes('Statement of Account')) {
      if (currentRecord && currentRecord.accountName && currentRecord.blockNo !== undefined) {
        records.push(finalizeRecord(currentRecord));
      }
      currentRecord = { payments: [] };
      inPaymentSection = false;
      continue;
    }

    if (!currentRecord) {
      currentRecord = { payments: [] };
    }

    // Extract account header fields
    for (let c = 0; c < cols.length; c++) {
      const cell = cols[c]?.trim() || '';
      const nextCell = cols[c + 1]?.trim() || cols[c + 2]?.trim() || '';

      if (cell.startsWith('Account Name:')) {
        currentRecord.accountName = cleanQuotes(nextCell);
      } else if (cell.startsWith('Project Area:')) {
        currentRecord.projectArea = cleanQuotes(nextCell);
      } else if (cell.startsWith('Block No.:')) {
        currentRecord.blockNo = parseInt(nextCell, 10) || 0;
      } else if (cell.startsWith('Lot No.:')) {
        currentRecord.lotNo = parseInt(nextCell, 10) || 0;
      } else if (cell.startsWith('Lot Area (Sqm):')) {
        currentRecord.lotAreaSqm = parseFloat(nextCell) || 0;
      } else if (cell.startsWith('Price per Sqm')) {
        currentRecord.pricePerSqm = parseFloat(nextCell) || 0;
      } else if (cell.startsWith('CTS Date:')) {
        currentRecord.ctsDate = nextCell;
      } else if (cell.startsWith('Terms (Month):')) {
        currentRecord.termsMonths = parseInt(nextCell, 10) || 60;
      } else if (cell.startsWith('End of Contract:')) {
        currentRecord.endOfContract = nextCell;
      } else if (cell.startsWith('Total Selling Price(TSP):')) {
        currentRecord.totalSellingPrice = parseFloat(nextCell) || 0;
      } else if (cell.startsWith('Monthly Installment:')) {
        currentRecord.monthlyInstallment = parseFloat(nextCell) || 0;
      }
    }

    // Detect start of table rows
    if (cols.some((c) => c.includes('Inst. No')) && cols.some((c) => c.includes('Due Date'))) {
      inPaymentSection = true;
      continue;
    }

    // Parse payments inside transaction section
    if (inPaymentSection) {
      const datePaid = findDateInRow(cols);
      const receiptNo = findReceiptInRow(cols);
      const amountPaid = findAmountPaidInRow(cols);
      const penaltyPaid = findPenaltyPaidInRow(cols);

      if (datePaid && receiptNo && amountPaid > 0) {
        currentRecord.payments!.push({
          datePaid,
          amountPaid,
          penaltyPaid,
          receiptNo,
          paymentMode: 'Cash',
        });
      }
    }
  }

  if (currentRecord && currentRecord.accountName && currentRecord.blockNo !== undefined) {
    records.push(finalizeRecord(currentRecord));
  }

  return records;
}

function finalizeRecord(rec: Partial<ParsedBillingAccountRecord>): ParsedBillingAccountRecord {
  return {
    accountName: rec.accountName || 'Unknown Buyer',
    projectArea: rec.projectArea || 'General',
    blockNo: rec.blockNo || 0,
    lotNo: rec.lotNo || 0,
    lotAreaSqm: rec.lotAreaSqm,
    pricePerSqm: rec.pricePerSqm,
    ctsDate: rec.ctsDate,
    termsMonths: rec.termsMonths || 60,
    endOfContract: rec.endOfContract,
    totalSellingPrice: rec.totalSellingPrice || 0,
    monthlyInstallment: rec.monthlyInstallment || 0,
    payments: rec.payments || [],
  };
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function cleanQuotes(str: string): string {
  return str.replace(/^"+|"+$/g, '').trim();
}

function findDateInRow(cols: string[]): string | null {
  for (const c of cols) {
    const val = cleanQuotes(c).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
  }
  return null;
}

function findReceiptInRow(cols: string[]): string | null {
  for (const c of cols) {
    const val = cleanQuotes(c).trim();
    if (/(OR#|CR#|OR\s*#|CR\s*#)\w+/i.test(val)) {
      return val;
    }
  }
  return null;
}

function findAmountPaidInRow(cols: string[]): number {
  // Amount paid column is typically index 5 in FDM's 11-column SOA
  for (let i = 4; i < cols.length; i++) {
    const val = cleanQuotes(cols[i]).trim();
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && !val.includes('-') && !val.includes('OR#') && !val.includes('CR#')) {
      return num;
    }
  }
  return 0;
}

function findPenaltyPaidInRow(cols: string[]): number {
  for (let i = 6; i <= 7 && i < cols.length; i++) {
    const val = cleanQuotes(cols[i]).trim();
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }
  return 0;
}
