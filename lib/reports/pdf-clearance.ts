import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ClearancePdfParams {
  buyerName: string;
  projectArea: string;
  blockNumber: string | number;
  lotNumber: string | number;
  lotArea: string | number;
  totalPrice?: string | number;

  tctNumber: string;
  titleName: string;
  actualLotArea?: string | number;
  spaDetails?: string;
  titlingFee?: string | number;

  dateRequested?: string;

  cashierPaymentDetails?: string;
  cashierRemarks?: string;
  cashierCheckedBy?: string;
  cashierDate?: string;

  billingDateFullPayment?: string;
  billingRemarks?: string;
  billingVerifiedBy?: string;
  billingDate?: string;

  legalDeedOfSale?: string;
  legalWaiverOfRights?: string;
  legalRemarks?: string;
  legalNotedBy?: string;
  legalDate?: string;

  adminRemarks?: string;
  adminApprovedBy?: string;
  adminDate?: string;

  receivedByName?: string;
  receivedIdNumber?: string;
  receivedDate?: string;
  tctAssumedNumber?: string;
}

const FDM_LOGO_BASE64 =
  'data:image/png;base64,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';

export const DEFAULT_CLEARANCE_SAMPLE: ClearancePdfParams = {
  buyerName: 'PASCUA, CHARLES',
  projectArea: 'Kaputian',
  blockNumber: '09',
  lotNumber: '08',
  lotArea: '150 sq.m',
  totalPrice: '148,500.00',

  tctNumber: 'T-142-2026013841',
  titleName: 'PASCUA, CHARLES',
  actualLotArea: '150 sq.m',
  spaDetails: 'Doc 349, Page 70, Book 27 (Atty. De Leon)',
  titlingFee: '18,000.00',

  dateRequested: 'August 26, 2026',

  cashierPaymentDetails: 'Paid in full via Official Receipts',
  cashierRemarks: 'All titling fees settled',
  cashierCheckedBy: 'MALVIN C. TAHUDAN',
  cashierDate: '08/26/2026',

  billingDateFullPayment: 'January 24, 2014',
  billingRemarks: 'Zero balance reconciled on ledger',
  billingVerifiedBy: 'ERWIN R. CENIZA',
  billingDate: '08/28/2026',

  legalDeedOfSale: 'Executed & ready for release',
  legalWaiverOfRights: 'N/A',
  legalRemarks: '30-day internal clearance verified',
  legalNotedBy: 'KRIS L. ANGELIA',
  legalDate: '09/02/2026',

  adminRemarks: 'Approved for title physical turnover',
  adminApprovedBy: 'JETRUDE G. CENIZA',
  adminDate: '09/18/2026',

  tctAssumedNumber: 'T-142-2026013841',
};

export function generateClearancePdf(customParams?: Partial<ClearancePdfParams>): jsPDF {
  const p: ClearancePdfParams = { ...DEFAULT_CLEARANCE_SAMPLE, ...customParams };
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 14;
  const right = pageWidth - 14;
  const contentWidth = right - left;

  // Header branding with company logo
  try {
    doc.addImage(FDM_LOGO_BASE64, 'PNG', left, 10, 24, 16);
  } catch {
    // Falls back silently if renderer lacks image support
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text('FIRST DAVAO MILLENNIUM', left + 28, 14);
  doc.text('PROPERTY VENTURES SERVICES, INC.', left + 28, 18.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text('No. 59 FDM Bldg. Bolton Ext. Davao City', left + 28, 22.5);
  doc.text('Tel. No. (082) 322-6657 Phone Number: 0964-059-0686', left + 28, 26);

  // Document Title
  let y = 33;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(
    "CLEARANCE FOR THE RELEASE OF BUYER'S INDIVIDUAL TITLE",
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  y += 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(left + 15, y, right - 15, y);

  // Side-by-side Buyer and Title Specifications
  y += 4;
  const colW = contentWidth / 2 - 1.5;

  autoTable(doc, {
    startY: y,
    margin: { left },
    tableWidth: colW,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: colW - 28 },
    },
    body: [
      ['Name of Buyer', p.buyerName],
      ['Project Area', p.projectArea],
      ['Block', String(p.blockNumber)],
      ['Lot', String(p.lotNumber)],
      ['Lot Area', String(p.lotArea)],
      ['Total Price', p.totalPrice ? `Php ${p.totalPrice}` : 'Php '],
    ],
  });

  autoTable(doc, {
    startY: y,
    margin: { left: left + colW + 3 },
    tableWidth: colW,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: colW - 38 },
    },
    body: [
      ['Transfer Certificate of Title No.', p.tctNumber],
      ['Title Name', p.titleName],
      ['Actual Lot Area', String(p.actualLotArea ?? p.lotArea)],
      ['Project Area', p.projectArea],
      ['Details of Special Power of Attorney', p.spaDetails ?? ''],
      ['Titling Fee', p.titlingFee ? `Php ${p.titlingFee}` : 'Php '],
    ],
  });

  const tableBottom = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 68;
  y = tableBottom + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Date Requested: ${p.dateRequested ?? 'August 26, 2026'}`, left, y);

  // Section 1: CASHIER
  y += 6;
  doc.text('1.  CASHIER', left, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`a.  Details of Payment for Titling:  ${p.cashierPaymentDetails ?? ''}`, left + 4, y);
  y += 4.5;
  doc.text(`b.  Remarks:  ${p.cashierRemarks ?? ''}`, left + 4, y);

  y += 6;
  doc.line(left + 24, y, left + 85, y);
  doc.line(right - 55, y, right - 10, y);
  doc.setFont('helvetica', 'bold');
  doc.text(p.cashierCheckedBy ?? 'MALVIN C. TAHUDAN', left + 54.5, y - 1, { align: 'center' });
  doc.text(p.cashierDate ?? '', right - 32.5, y - 1, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Checked by', left + 54.5, y + 3.5, { align: 'center' });
  doc.text('Date', right - 32.5, y + 3.5, { align: 'center' });

  // Section 2: BILLING
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('2.  BILLING', left, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`a.  Date of Full Payment:  ${p.billingDateFullPayment ?? ''}`, left + 4, y);
  y += 4.5;
  doc.text(`b.  Remarks:  ${p.billingRemarks ?? ''}`, left + 4, y);

  y += 6;
  doc.line(left + 24, y, left + 85, y);
  doc.line(right - 55, y, right - 10, y);
  doc.setFont('helvetica', 'bold');
  doc.text(p.billingVerifiedBy ?? 'ERWIN R. CENIZA', left + 54.5, y - 1, { align: 'center' });
  doc.text(p.billingDate ?? '', right - 32.5, y - 1, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Verified by', left + 54.5, y + 3.5, { align: 'center' });
  doc.text('Date', right - 32.5, y + 3.5, { align: 'center' });

  // Section 3: LEGAL DOCUMENTATION
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('3.  LEGAL DOCUMENTATION', left, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`a.  Deed of Sale:  ${p.legalDeedOfSale ?? ''}`, left + 4, y);
  y += 4;
  doc.text(`b.  Waiver of Rights:  ${p.legalWaiverOfRights ?? ''}`, left + 4, y);
  y += 4;
  doc.text(`c.  Remarks:  ${p.legalRemarks ?? ''}`, left + 4, y);

  y += 6;
  doc.line(left + 24, y, left + 85, y);
  doc.line(right - 55, y, right - 10, y);
  doc.setFont('helvetica', 'bold');
  doc.text(p.legalNotedBy ?? 'KRIS L. ANGELIA', left + 54.5, y - 1, { align: 'center' });
  doc.text(p.legalDate ?? '', right - 32.5, y - 1, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Noted by', left + 54.5, y + 3.5, { align: 'center' });
  doc.text('Date', right - 32.5, y + 3.5, { align: 'center' });

  // Section 4: ADMINISTRATIVE DEPARTMENT
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('4.  ADMINISTRATIVE DEPARTMENT', left, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`a.  Remarks:  ${p.adminRemarks ?? ''}`, left + 4, y);

  y += 6;
  doc.line(left + 24, y, left + 85, y);
  doc.line(right - 55, y, right - 10, y);
  doc.setFont('helvetica', 'bold');
  doc.text(p.adminApprovedBy ?? 'JETRUDE G. CENIZA', left + 54.5, y - 1, { align: 'center' });
  doc.text(p.adminDate ?? '', right - 32.5, y - 1, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Approved by', left + 54.5, y + 3.5, { align: 'center' });
  doc.text('Date', right - 32.5, y + 3.5, { align: 'center' });

  // Legal Boundary Disclaimer Note
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const note = `Note: Should the Title Name is not under the name of the Buyer, the Buyer hereby assumes the responsibility to process and transfer the above-mentioned title in favor to his/her name upon after receipt of the herein subject Transfer Certificate of Title No. T-${p.tctAssumedNumber ?? '___________________'}.`;
  const noteLines = doc.splitTextToSize(note, contentWidth);
  doc.text(noteLines, left, y);
  y += noteLines.length * 3.8 + 8;

  // Release Handover Acknowledgement
  const colA = left;
  const colB = left + contentWidth * 0.38;
  const colC = left + contentWidth * 0.72;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Received by:', colA, y);
  doc.text('Identification Card No:', colB, y);
  doc.text('Date of Receipt:', colC, y);

  y += 8;
  doc.line(colA, y, colA + 55, y);
  doc.line(colB, y, colB + 50, y);
  doc.line(colC, y, right, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(p.receivedByName ?? 'Signature over Printed Name', colA + 27.5, y + 3.5, { align: 'center' });
  doc.text(p.receivedIdNumber ?? "Gov't Valid ID", colB + 25, y + 3.5, { align: 'center' });
  doc.text(p.receivedDate ?? '', colC + 20, y - 1.5);

  // Bottom reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DBISA', left, 285);

  return doc;
}

export function downloadClearancePdf(
  customParams?: Partial<ClearancePdfParams>,
  filename?: string
): void {
  const doc = generateClearancePdf(customParams);
  const targetName =
    filename ??
    `Clearance_${(customParams?.buyerName ?? 'Buyer').replace(/[^\w.-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(targetName);
}
