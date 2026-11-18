/**
 * scripts/seed-sample-project-area.ts
 *
 * Seeds four sample projectAreas across Samal Island:
 * - Barangay Limao (7.1036952, 125.7186842)
 * - San Augustin (7.121930, 125.704354)
 * - Kaputian (6.9684741, 125.7273606)
 * - Caliclic (7.1156161, 125.6753916)
 *
 * Each projectArea features 12 subdivisions, with 3 to 5 registered property lots
 * (and remaining subdivisions as unregistered/available slots in gray).
 *
 * Usage:
 *   npm run seed:sample-project-area          seed (or re-seed) all four projectAreas
 *   npm run seed:sample-project-area:clear    remove sample projectAreas and their lots
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;

const missing: string[] = [];
if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!SERVICE_ROLE_KEY) missing.push("SUPABASE_SECRET_KEY");
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables:\n   ${missing.join("\n   ")}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Pt = [number, number]; // [lng, lat]

const D_LAT_1M = 1 / 110574;
const D_LNG_1M = 1 / 110463;
const LOT_WIDTH_M = 14;
const LOT_DEPTH_M = 18;
const LOT_GAP_M = 3;
const ROAD_GAP_M = 8;
const LOTS_PER_ROW = 6;

type SubdivisionSeed = { block: number; lot: number; boundary: Pt[] };
type LotSeed = { block: number; lot: number; status: "Open" | "Reserved" | "Sold" | "Forfeited" };

interface ProjectAreaSeed {
  name: string;
  namePrefix: string;
  description: string;
  center: [number, number]; // [lat, lng]
  pricePerSqm: number;
  boundary: Pt[];
  subdivisions: SubdivisionSeed[];
  lots: LotSeed[];
}

function generateProjectAreaGeometry(
  centerLat: number,
  centerLng: number,
  pricePerSqm: number,
  name: string,
  desc: string,
  lots: LotSeed[]
): ProjectAreaSeed {
  const lotWidth = LOT_WIDTH_M * D_LNG_1M;
  const lotDepth = LOT_DEPTH_M * D_LAT_1M;
  const lotGap = LOT_GAP_M * D_LNG_1M;
  const roadGap = ROAD_GAP_M * D_LAT_1M;

  const totalWidth = LOTS_PER_ROW * lotWidth + (LOTS_PER_ROW - 1) * lotGap;
  const startLng = centerLng - totalWidth / 2;

  const subdivisions: SubdivisionSeed[] = [];

  // Block 1 (North row)
  const r1Lat = centerLat + roadGap / 2;
  for (let i = 0; i < LOTS_PER_ROW; i++) {
    const x0 = startLng + i * (lotWidth + lotGap);
    const x1 = x0 + lotWidth;
    const y0 = r1Lat;
    const y1 = y0 + lotDepth;
    subdivisions.push({
      block: 1,
      lot: i + 1,
      boundary: [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
    });
  }

  // Block 2 (South row)
  const r2Lat = centerLat - roadGap / 2 - lotDepth;
  for (let i = 0; i < LOTS_PER_ROW; i++) {
    const x0 = startLng + i * (lotWidth + lotGap);
    const x1 = x0 + lotWidth;
    const y0 = r2Lat;
    const y1 = y0 + lotDepth;
    subdivisions.push({
      block: 2,
      lot: i + 1,
      boundary: [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
    });
  }

  const padX = 14 * D_LNG_1M;
  const padY = 12 * D_LAT_1M;
  const bx0 = startLng - padX;
  const bx1 = startLng + totalWidth + padX;
  const by0 = r2Lat - padY;
  const by1 = r1Lat + lotDepth + padY;

  const boundary: Pt[] = [
    [bx0, by0],
    [bx1, by0],
    [bx1, by1],
    [bx0, by1],
  ];

  return {
    name,
    namePrefix: name,
    description: desc,
    center: [centerLat, centerLng],
    pricePerSqm,
    boundary,
    subdivisions,
    lots,
  };
}

const PROJECT_AREAS: ProjectAreaSeed[] = [
  generateProjectAreaGeometry(7.1036952, 125.7186842, 6500, "Barangay Limao", "Coastal subdivision development in Barangay Limao, Samal Island.", [
    { block: 1, lot: 1, status: "Sold" },
    { block: 1, lot: 2, status: "Reserved" },
    { block: 1, lot: 3, status: "Open" },
    { block: 1, lot: 4, status: "Forfeited" },
  ]),
  generateProjectAreaGeometry(7.121930, 125.704354, 7200, "San Augustin", "Overlook residential subdivision in San Augustin, Samal Island.", [
    { block: 1, lot: 1, status: "Open" },
    { block: 1, lot: 2, status: "Reserved" },
    { block: 2, lot: 1, status: "Sold" },
    { block: 2, lot: 2, status: "Open" },
  ]),
  generateProjectAreaGeometry(6.9684741, 125.7273606, 5800, "Kaputian", "Scenic southern subdivision estates located in Kaputian, Samal Island.", [
    { block: 1, lot: 1, status: "Open" },
    { block: 1, lot: 3, status: "Reserved" },
    { block: 2, lot: 1, status: "Forfeited" },
    { block: 2, lot: 4, status: "Sold" },
  ]),
  generateProjectAreaGeometry(7.1156161, 125.6753916, 8000, "Caliclic", "Prime western gateway subdivision in Caliclic, Samal Island.", [
    { block: 1, lot: 2, status: "Open" },
    { block: 1, lot: 4, status: "Sold" },
    { block: 2, lot: 2, status: "Reserved" },
    { block: 2, lot: 3, status: "Open" },
  ]),
];

const LEGACY_PREFIXES = ["Lui Pro", "San Vicente", "Murillo Old"];

async function clearLegacyProjectAreas(): Promise<void> {
  for (const prefix of LEGACY_PREFIXES) {
    const { data: projectAreas } = await supabase.from("project_area").select("project_area_id, name").like("name", `${prefix}%`);
    if (projectAreas && projectAreas.length > 0) {
      for (const s of projectAreas) {
        await supabase.from("property_lot").delete().eq("project_area_id", s.project_area_id);
        await supabase.from("project_area_subdivision").delete().eq("project_area_id", s.project_area_id);
        await supabase.from("project_area").delete().eq("project_area_id", s.project_area_id);
        console.log(`✅ Removed legacy projectArea "${s.name}".`);
      }
    }
  }
}

async function clearProjectArea(projectAreaSeed: ProjectAreaSeed): Promise<void> {
  const { data: projectAreas } = await supabase.from("project_area").select("project_area_id, name").like("name", `${projectAreaSeed.namePrefix}%`);
  if (!projectAreas || projectAreas.length === 0) return;

  for (const s of projectAreas) {
    await supabase.from("property_lot").delete().eq("project_area_id", s.project_area_id);
    await supabase.from("project_area_subdivision").delete().eq("project_area_id", s.project_area_id);
    await supabase.from("project_area").delete().eq("project_area_id", s.project_area_id);
    console.log(`✅ Removed projectArea "${s.name}".`);
  }
}

async function seedProjectArea(seed: ProjectAreaSeed): Promise<void> {
  const { data: projectArea, error: projectAreaError } = await supabase
    .from("project_area")
    .upsert({ name: seed.name, description: seed.description, boundary: seed.boundary }, { onConflict: "name" })
    .select("project_area_id, name")
    .single<{ project_area_id: string; name: string }>();

  if (projectAreaError || !projectArea) {
    throw new Error(`Failed to upsert "${seed.name}": ${projectAreaError?.message ?? "unknown"}`);
  }
  console.log(`✅ ProjectArea: ${projectArea.name}`);

  await supabase.from("project_area_subdivision").delete().eq("project_area_id", projectArea.project_area_id);
  await supabase.from("property_lot").update({ project_area_id: projectArea.project_area_id }).eq("location", seed.name).is("project_area_id", null);

  const subdivisionRows = seed.subdivisions.map((s) => ({
    project_area_id: projectArea.project_area_id,
    block_number: s.block,
    lot_number: s.lot,
    boundary: s.boundary,
  }));

  const { error: subError } = await supabase.from("project_area_subdivision").insert(subdivisionRows);
  if (subError) {
    throw new Error(`Failed to insert subdivisions for "${seed.name}": ${subError.message}`);
  }

  const lotRows = seed.lots.map((l) => ({
    project_area_id: projectArea.project_area_id,
    location: seed.name,
    block_number: l.block,
    lot_number: l.lot,
    area_size: LOT_WIDTH_M * LOT_DEPTH_M,
    price_per_sqm: seed.pricePerSqm,
    status: l.status,
  }));

  const { error: lotError } = await supabase
    .from("property_lot")
    .upsert(lotRows, { onConflict: "location,block_number,lot_number" });
  if (lotError) {
    throw new Error(`Failed to insert lots for "${seed.name}": ${lotError.message}`);
  }

  // Remove non-seed lots without ledger accounts
  const { data: existingLots } = await supabase
    .from("property_lot")
    .select("property_id, block_number, lot_number")
    .eq("project_area_id", projectArea.project_area_id);

  if (existingLots && existingLots.length > 0) {
    const seedKeys = new Set(seed.lots.map((l) => `${l.block}-${l.lot}`));
    for (const el of existingLots) {
      if (!seedKeys.has(`${el.block_number}-${el.lot_number}`)) {
        const { data: ledgers } = await supabase
          .from("ledger_account")
          .select("account_id")
          .eq("property_id", el.property_id);
        if (!ledgers || ledgers.length === 0) {
          await supabase.from("property_lot").delete().eq("property_id", el.property_id);
        }
      }
    }
  }
  console.log(`   ↳ ${subdivisionRows.length} subdivisions, ${lotRows.length} property lots`);
}

export async function seedAllSampleProjectAreas(): Promise<void> {
  await clearLegacyProjectAreas();
  for (const projectArea of PROJECT_AREAS) await seedProjectArea(projectArea);
}

async function main() {
  await clearLegacyProjectAreas();

  if (process.argv.includes("--clear")) {
    for (const projectArea of PROJECT_AREAS) await clearProjectArea(projectArea);
    console.log("All sample projectAreas cleared.");
    return;
  }

  await seedAllSampleProjectAreas();
  console.log("\nSample projectAreas seeded successfully. Open /dashboard/properties/map to view.");
}

if (process.argv[1]?.includes("seed-sample-project-area")) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}
