import jsPDF from 'jspdf';
import { PDF_COLORS } from './pdf-theme';

export interface NoticePdfParams {
  noticeNumber: 1 | 2 | 3;
  clientName: string;
  clientAddress?: string | null;
  propertyLocation: string;
  lotDescription: string;
  titleNumber?: string | null;
  titleId: string;
}

export function generateNoticePdf({
  noticeNumber,
  clientName,
  clientAddress,
  propertyLocation,
  lotDescription,
  titleNumber,
  titleId,
}: NoticePdfParams): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 20;

  // Header branding bar
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text('FIRST DAVAO MILLENNIUM REAL ESTATE SYSTEMS', 14, cursorY);
  doc.text('LEGAL & TITLING DIVISION', pageWidth - 14, cursorY, { align: 'right' });

  cursorY += 4;
  doc.line(14, cursorY, pageWidth - 14, cursorY);

  // Document Title
  cursorY += 12;
  const noticeTitles: Record<1 | 2 | 3, string> = {
    1: 'FIRST NOTICE TO CLAIM TITLE',
    2: 'SECOND NOTICE TO CLAIM TITLE',
    3: 'FINAL DEMAND NOTICE TO CLAIM TITLE',
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text(noticeTitles[noticeNumber], 14, cursorY);

  // Metadata Reference
  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  const dateStr = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Date: ${dateStr}`, 14, cursorY);
  const refCode = `REF: FDM-TIT-${titleId.slice(0, 8).toUpperCase()}-N${noticeNumber}`;
  doc.text(refCode, pageWidth - 14, cursorY, { align: 'right' });

  cursorY += 4;
  doc.line(14, cursorY, pageWidth - 14, cursorY);

  // Addressee Block
  cursorY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text('TO:', 14, cursorY);
  doc.text(clientName.toUpperCase(), 24, cursorY);

  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text(clientAddress || 'Registered Client Address on File', 24, cursorY);

  // Property Details Card
  cursorY += 10;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setFillColor(...PDF_COLORS.cardBg);
  doc.roundedRect(14, cursorY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text('PROPERTY PARCEL DETAILS', 18, cursorY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text(`Parcel: ${lotDescription} • ${propertyLocation}`, 18, cursorY + 12);
  doc.text(`TCT Number: ${titleNumber || 'Registered on Lot'}`, 18, cursorY + 17);

  cursorY += 30;

  // Body Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.textPrimary);

  const bodyParagraphs = getNoticeBody(noticeNumber);
  for (const para of bodyParagraphs) {
    const lines = doc.splitTextToSize(para, pageWidth - 28);
    doc.text(lines, 14, cursorY);
    cursorY += lines.length * 5 + 4;
  }

  // Signatory Block
  cursorY += 10;
  doc.setFont('helvetica', 'normal');
  doc.text('Respectfully yours,', 14, cursorY);

  cursorY += 14;
  doc.setFont('helvetica', 'bold');
  doc.text('LEGAL & TITLING DEPARTMENT', 14, cursorY);
  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text('First Davao Millennium Real Estate Systems', 14, cursorY);

  // Footer note
  doc.setDrawColor(...PDF_COLORS.border);
  doc.line(14, 280, pageWidth - 14, 280);
  doc.setFontSize(8);
  doc.text('This is an official communication dispatched from the FDM Management System.', 14, 285);

  const cleanName = clientName.replace(/[^\w.-]+/g, '_');
  doc.save(`Notice_${noticeNumber}_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function getNoticeBody(noticeNumber: 1 | 2 | 3): string[] {
  if (noticeNumber === 1) {
    return [
      'Greetings from First Davao Millennium.',
      'This is to formally notify you that the thirty (30) day internal clearance period for your property account has been concluded. Your original Transfer Certificate of Title (TCT) along with the fully executed Deed of Absolute Sale (DOAS) are now cleared and ready for claim at our administrative office.',
      'Please claim your documents at your earliest convenience during regular office hours. Kindly present two (2) valid government-issued identification cards. Should you authorize a representative to claim on your behalf, an original notarized Special Power of Attorney (SPA) and valid IDs of both parties must be presented.',
      'Thank you for your cooperation and continued trust.',
    ];
  }

  if (noticeNumber === 2) {
    return [
      'We refer to our earlier notice regarding the availability of your original Transfer Certificate of Title (TCT) and executed Deed of Absolute Sale (DOAS) for the subject property.',
      'According to our records, the initial registered notice was returned to sender (RTS) and the documents remain unclaimed in our vault. We hereby reiterate our advice for you to visit our office to formally receive your physical title documents.',
      'Please coordinate with our Legal Department to schedule your document handover or update your delivery coordinates.',
      'We look forward to completing your turnover promptly.',
    ];
  }

  return [
    'FINAL DEMAND TO CLAIM ORIGINAL LAND TITLE DOCUMENTS.',
    'Despite multiple formal notices dispatched to your registered address, your original Transfer Certificate of Title (TCT) and notarized Deed of Absolute Sale (DOAS) remain unclaimed in our vault custody.',
    'Please be reminded that under company policy and contract provisions, title documents left unclaimed in custody beyond thirty (30) days from this final notice are subject to a monthly storage and safe-keeping fee of PHP 540.00, in addition to prospective administrative escalation.',
    'You are hereby given thirty (30) calendar days from receipt of this notice to claim your title packet at our main office. Failure to do so will compel management to assess storage fees and initiate appropriate legal escalation.',
  ];
}
