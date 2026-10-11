import fs from 'fs';
import path from 'path';
import { generateDoasPdf } from '../lib/reports/pdf-doas';
import { generateClearancePdf } from '../lib/reports/pdf-clearance';

const publicDir = path.join(process.cwd(), 'public');

// Generate DOAS PDF matching uploaded contract
const doasDoc = generateDoasPdf();
const doasBuffer = Buffer.from(doasDoc.output('arraybuffer'));
const doasPath = path.join(publicDir, 'sample-doas.pdf');
fs.writeFileSync(doasPath, doasBuffer);
console.log(`Generated sample DOAS at: ${doasPath}`);

// Generate Clearance PDF matching uploaded clearance sheet
const clearanceDoc = generateClearancePdf();
const clearanceBuffer = Buffer.from(clearanceDoc.output('arraybuffer'));
const clearancePath = path.join(publicDir, 'sample-clearance.pdf');
fs.writeFileSync(clearancePath, clearanceBuffer);
console.log(`Generated sample Clearance at: ${clearancePath}`);
