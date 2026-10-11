import jsPDF from 'jspdf';

export interface DoasPdfParams {
  executionDay?: string;
  executionMonth?: string;
  executionYear?: string;
  executionVenue?: string;

  vendorName?: string;
  vendorRepresentative?: string;
  vendorRepTitle?: string;
  vendorRepCivilStatus?: string;
  vendorRepResCertNo?: string;
  vendorRepResCertDate?: string;
  vendorRepResCertPlace?: string;
  vendorTin?: string;

  vendeeName: string;
  vendeeCivilStatus?: string;
  vendeeSpouseName?: string | null;
  vendeeAddress: string;
  vendeeTin?: string | null;
  vendeeIdNumber?: string | null;

  motherTitleNumber?: string;
  motherAreaWords?: string;
  motherAreaSqm?: string | number;
  projectLocation?: string;
  spaDocNo?: string;
  spaPageNo?: string;
  spaBookNo?: string;
  spaSeries?: string;
  spaNotary?: string;

  blockNumber: string | number;
  lotNumber: string | number;
  lotAreaWords?: string;
  lotAreaSqm: string | number;
  considerationWords?: string;
  considerationAmount: string | number;

  technicalDescription?: string;
  boundaryMarkers?: string;
}

export const DEFAULT_DOAS_SAMPLE: DoasPdfParams = {
  executionDay: '24th',
  executionMonth: 'January',
  executionYear: '2014',
  executionVenue: 'Davao City',

  vendorName: 'FIRST DAVAO MILLENNIUM PROPERTY VENTURES SERVICES, INC.',
  vendorRepresentative: 'JETRUDE A. GARCIA',
  vendorRepTitle: 'Executive Vice-President',
  vendorRepCivilStatus: 'single',
  vendorRepResCertNo: '01665165',
  vendorRepResCertDate: 'January 06, 2014',
  vendorRepResCertPlace: 'IGACOS',
  vendorTin: '005-212-468',

  vendeeName: 'CHARLES GREGOR T. PASCUA',
  vendeeCivilStatus: 'married',
  vendeeSpouseName: 'Melody C. Pascua',
  vendeeAddress: '#12 Belowra St., Brgy. Morales, Koronadal City',
  vendeeTin: '271-546-760',
  vendeeIdNumber: 'Res. Cert. No. 0927-5846772',

  motherTitleNumber: 'T-14913 & 14914',
  motherAreaWords: 'ONE HUNDRED NINETY FOUR THOUSAND FOUR HUNDRED SIXTY SIX',
  motherAreaSqm: '194,466',
  projectLocation: 'Kaputian District, Island Garden City of Samal',
  spaDocNo: '349',
  spaPageNo: '70',
  spaBookNo: '27',
  spaSeries: '2002',
  spaNotary: 'ATTY. RODOLFTON S.J. DE LEON',

  blockNumber: '09',
  lotNumber: '08',
  lotAreaWords: 'ONE HUNDRED FIFTY',
  lotAreaSqm: '150',
  considerationWords: 'ONE HUNDRED FORTY EIGHT THOUSAND FIVE HUNDRED',
  considerationAmount: '148,500.00',

  technicalDescription:
    'Beginning at a point marked "1" on plan being N. 14 deg. 24\' W., 1970. 41 m from corner 1, of E-135, thence N. 38°E ., 397.01 m to point 2 ; thence N. 3 deg. 45\'W., 123.41 m. to the point of beginning.;',
  boundaryMarkers:
    'point 1 by old P. L.S./ B.L. conc, Mons., point 2 by old cross on trees; points 3 and 4 by P.L.S . cyl mons., and point 5 by old corner.',
};

export function generateDoasPdf(customParams?: Partial<DoasPdfParams>): jsPDF {
  const p: DoasPdfParams = { ...DEFAULT_DOAS_SAMPLE, ...customParams };
  const doc = new jsPDF({ unit: 'mm', format: 'legal' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 22;
  const rightMargin = 22;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Render Page 1
  let y = 28;

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text('DEED OF SALE WITH RESERVATION OF TITLE', pageWidth / 2, y, { align: 'center' });

  y += 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text('KNOW ALL MEN BY THESE PRESENTS:', leftMargin, y);

  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);

  const introText = `This DEED, made and entered into this ${p.executionDay} day of ${p.executionMonth}, ${p.executionYear} at ${p.executionVenue}, Philippines, by and between:`;
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, leftMargin, y);
  y += introLines.length * 5.2 + 3;

  const vendorRepPart = `, represented by its ${p.vendorRepTitle}, ${p.vendorRepresentative}, of legal age, Filipino, ${p.vendorRepCivilStatus} and a resident of Davao City, Philippines, hereinafter referred to as the VENDOR;`;
  const vendorFull = `${p.vendorName}${vendorRepPart}`;
  const vendorLines = doc.splitTextToSize(vendorFull, contentWidth - 16);
  doc.text(vendorLines, leftMargin + 8, y);
  y += vendorLines.length * 5.2 + 4;

  doc.setFont('times', 'normal');
  doc.text('- And -', pageWidth / 2, y, { align: 'center' });
  y += 6;

  const isMarried = p.vendeeCivilStatus?.toLowerCase() === 'married' && Boolean(p.vendeeSpouseName);
  const civilClause = isMarried
    ? `married to ${p.vendeeSpouseName}`
    : (p.vendeeCivilStatus ?? 'single');
  const vendeeFull = `${p.vendeeName}, of legal age, Filipino, ${civilClause} and a resident of ${p.vendeeAddress}, Philippines, hereinafter referred to as the VENDEE;`;
  const vendeeLines = doc.splitTextToSize(vendeeFull, contentWidth - 16);
  doc.text(vendeeLines, leftMargin + 8, y);
  y += vendeeLines.length * 5.2 + 6;

  doc.setFont('times', 'bold');
  doc.text('W I T N E S S E T H :', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('times', 'normal');
  const rec1 = `WHEREAS, THE VENDOR is the Atty. In-fact of the Real Estate Property Owner by virtue of the Exclusive Marketing Agreement & Special Power of Attorney denominated as Doc. No. ${p.spaDocNo}, Page No. ${p.spaPageNo} , Book No. ${p.spaBookNo}, Series of ${p.spaSeries} by ${p.spaNotary}, that certain parcel of land embraced in and covered by OCT No. ${p.motherTitleNumber} of the Registry of Deeds for Davao Province, containing an approximate area of ${p.motherAreaWords} (${p.motherAreaSqm}) SQUARE METERS, more or less, situated at ${p.projectLocation}.`;
  const rec1Lines = doc.splitTextToSize(rec1, contentWidth);
  doc.text(rec1Lines, leftMargin, y);
  y += rec1Lines.length * 5.2 + 4;

  const rec2 = `WHEREAS, by authority thereof, the said VENDOR subdivided the aforestated property into home lots partitioning for sale and disposition to willing and interested buyers:`;
  const rec2Lines = doc.splitTextToSize(rec2, contentWidth);
  doc.text(rec2Lines, leftMargin, y);
  y += rec2Lines.length * 5.2 + 4;

  const operative = `NOW THEREFORE, for and in consideration of the sum of ${p.considerationWords} (Php${p.considerationAmount}) PESOS, Philippine Currency, paid in hand to the VENDOR by the VENDEE, do hereby SELL, TRANSFER & CONVEY, absolutely and unconditionally, unto and in favor the said VENDEE, that certain real property consisting of ONE (1) lot, under Block ${p.blockNumber}, Lot ${p.lotNumber} with an approximate area or a total of ${p.lotAreaWords} (${p.lotAreaSqm}) SQUARE METERS, more or less, of which lot surveyed and being part and portion of OCT/TCT No. ${p.motherTitleNumber} of the above stated and described subject property. ${p.technicalDescription}`;
  const opLines = doc.splitTextToSize(operative, contentWidth);
  doc.text(opLines, leftMargin, y);
  y += opLines.length * 5.2 + 4;

  const points = `All points referred to as indicated on the plan and are marked on the ground as follows: ${p.boundaryMarkers}`;
  const ptLines = doc.splitTextToSize(points, contentWidth);
  doc.text(ptLines, leftMargin, y);
  y += ptLines.length * 5.2 + 4;

  const ownerRec = `And containing of the above-mentioned lot area of which the original owner of the Title is the registered absolute owner in accordance with the Land Registration Commission of the records of the Office of the Registry of Deeds, Davao Province, Philippines.`;
  const ownerLines = doc.splitTextToSize(ownerRec, contentWidth);
  doc.text(ownerLines, leftMargin, y);
  y += ownerLines.length * 5.2 + 4;

  const covenant = `It is hereby mutually agreed that the VENDOR shall provide the approval of survey and likewise the VENDEE shall bear the expenses for the issuance of the new title to the said subject property.`;
  const covLines = doc.splitTextToSize(covenant, contentWidth);
  doc.text(covLines, leftMargin, y);

  // Render Page 2
  doc.addPage('legal', 'portrait');
  y = 24;

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.text('Deed of Sale with Reservation of Title', leftMargin, y);
  doc.text('Page 2 of 2', leftMargin, y + 4);

  y += 14;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  const closingClause = `IN WITNESS WHEREOF, we have hereunto signed this Deed of Sale with Reservation of Title this ${p.executionDay} day of ${p.executionMonth}, ${p.executionYear} at ${p.executionVenue}, Philippines.`;
  const closingLines = doc.splitTextToSize(closingClause, contentWidth);
  doc.text(closingLines, leftMargin, y);
  y += closingLines.length * 5.2 + 14;

  const colWidth = (contentWidth - 14) / 2;
  const col1X = leftMargin;
  const col2X = leftMargin + colWidth + 14;

  // Vendee signature block
  doc.setFont('times', 'bold');
  doc.text(p.vendeeName, col1X, y + 10);
  doc.setFont('times', 'normal');
  doc.text('Vendee', col1X, y + 15);
  if (p.vendeeTin) {
    doc.text(`TIN: ${p.vendeeTin}`, col1X, y + 21);
  }

  // Vendor corporate signature block
  doc.setFont('times', 'bold');
  doc.text('FIRST DAVAO MILLENNIUM PROPERTY', col2X, y);
  doc.text('VENTURES SERVICES, INC.', col2X, y + 5);
  doc.setFont('times', 'normal');
  doc.text('BY: (Executive Vice-President)', col2X, y + 10);
  doc.setFont('times', 'bold');
  doc.text(p.vendorRepresentative ?? '', col2X, y + 24);
  doc.setFont('times', 'normal');
  doc.text('Vendor', col2X, y + 29);
  doc.text(`Co. TIN: ${p.vendorTin ?? '005-212-468'}`, col2X, y + 35);

  y += 38;
  if (isMarried && p.vendeeSpouseName) {
    doc.text('With my marital consent:', col1X, y);
    doc.setFont('times', 'bold');
    doc.text(p.vendeeSpouseName, col1X, y + 10);
    doc.setFont('times', 'normal');
    y += 16;
  }

  y += 8;
  doc.setFont('times', 'bold');
  doc.text('SIGNED IN THE PRESENCE OF:', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFont('times', 'normal');
  doc.text('__________________________________     &     __________________________________', pageWidth / 2, y, { align: 'center' });

  y += 12;
  doc.setFont('times', 'bold');
  doc.text('A C K N O W L E D G M E N T', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('times', 'normal');
  doc.text('REPUBLIC OF THE PHILIPPINES)', leftMargin, y);
  doc.text(`CITY OF DAVAO-------------------)S.S`, leftMargin, y + 5);
  doc.text(`X-------------------------------------X`, leftMargin, y + 10);
  y += 17;

  const ackBody = `BEFORE ME, a Notary Public for and in the city of Davao, this _____ day of ____________, ${p.executionYear} personally appeared ${p.vendeeName} with his/her ID/Res. Cert. No. ${p.vendeeIdNumber ?? '___________'} and ${p.vendorRepresentative} with his/her Res. Cert. No. ${p.vendorRepResCertNo} issued on ${p.vendorRepResCertDate} issued at ${p.vendorRepResCertPlace}, Philippines, known to me and to me known to be the same person who executed the foregoing instrument and acknowledged to me that the same is their own free and voluntary act and deed.`;
  const ackLines = doc.splitTextToSize(ackBody, contentWidth);
  doc.text(ackLines, leftMargin, y);
  y += ackLines.length * 5.2 + 4;

  const ackRef = `This instrument refers to the Deed of Sale with Reservation of Title consisting of two (2) pages including this page in which this acknowledgment is written, duly assigned by the parties together with their instrumental witnesses on each and every page hereof.`;
  const ackRefLines = doc.splitTextToSize(ackRef, contentWidth);
  doc.text(ackRefLines, leftMargin, y);
  y += ackRefLines.length * 5.2 + 6;

  doc.text('WITNESS MY HAND AND SEAL, on the date, place above - written.', leftMargin, y);
  y += 14;

  const notaryX = pageWidth - rightMargin - 45;
  doc.setFont('times', 'bold');
  doc.text('NOTARY PUBLIC', notaryX, y);
  doc.setFont('times', 'normal');

  doc.text('Doc. No. ________;', leftMargin, y + 8);
  doc.text('Page No. ________;', leftMargin, y + 14);
  doc.text('Book No. ________;', leftMargin, y + 20);
  doc.text(`Series of ${p.executionYear}.`, leftMargin, y + 26);

  return doc;
}

export function downloadDoasPdf(
  customParams?: Partial<DoasPdfParams>,
  filename?: string
): void {
  const doc = generateDoasPdf(customParams);
  const targetName =
    filename ??
    `DOAS_${(customParams?.vendeeName ?? 'Client').replace(/[^\w.-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(targetName);
}
