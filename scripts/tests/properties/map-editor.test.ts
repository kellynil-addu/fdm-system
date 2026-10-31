import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import {
  createProjectArea,
  deleteProjectArea,
  createSubdivisionLot,
  deleteSubdivisionLot,
  getProjectAreaWithLots,
} from "@/lib/actions/project-areas";
import { updatePropertyLot } from "@/lib/actions/properties";
import { calculatePolygonAreaSqm } from "@/lib/geometry";
import {
  loginAsAdmin,
  logoutUser,
  getTestAdminClient,
} from "../framework/session";
import { unwrap } from "../framework/action-helper";

describe("Map Editor Actions - Plotting Lots, Deleting Plots, Creating ProjectAreas", () => {
  const testProjectAreaIds: string[] = [];

  beforeAll(async () => {
    await loginAsAdmin();
  });

  afterAll(async () => {
    const admin = getTestAdminClient();
    for (const projectAreaId of testProjectAreaIds) {
      try {
        await admin.from("property_lot").delete().eq("project_area_id", projectAreaId);
        await admin.from("project_area_subdivision").delete().eq("project_area_id", projectAreaId);
        await admin.from("project_area").delete().eq("project_area_id", projectAreaId);
      } catch {
        // Ignore cleanup errors
      }
    }
    await logoutUser();
  });

  it("calculates polygon area in square metres accurately", () => {
    // 14m x 18m rectangle at lat ~7.1 deg N (1 deg lng = 110463m, 1 deg lat = 110574m)
    const lng0 = 125.7000;
    const lat0 = 7.1000;
    const dLng = 14 / 110463;
    const dLat = 18 / 110574;

    const points: [number, number][] = [
      [lng0, lat0],
      [lng0 + dLng, lat0],
      [lng0 + dLng, lat0 + dLat],
      [lng0, lat0 + dLat],
    ];

    const area = calculatePolygonAreaSqm(points);
    expect(area).toBeGreaterThan(245);
    expect(area).toBeLessThan(255);
  });

  it("creates a new projectArea by plotting its boundary and giving it a name", async () => {
    const projectAreaName = `Test ProjectArea ${faker.string.alphanumeric(8)}`;
    const boundary: [number, number][] = [
      [125.71, 7.10],
      [125.72, 7.10],
      [125.72, 7.11],
      [125.71, 7.11],
    ];

    const projectArea = unwrap(await createProjectArea({
      name: projectAreaName,
      description: "A newly plotted test subdivision projectArea",
      boundary,
    }));

    testProjectAreaIds.push(projectArea.project_area_id);

    expect(projectArea).toBeDefined();
    expect(projectArea.project_area_id).toBeDefined();
    expect(projectArea.name).toBe(projectAreaName);
    expect(Array.isArray(projectArea.boundary)).toBe(true);
    expect((projectArea.boundary as [number, number][]).length).toBe(4);
  });

  it("creates an available lot plot on the projectArea with block and lot number", async () => {
    const projectAreaId = testProjectAreaIds[0];
    expect(projectAreaId).toBeDefined();

    const lotBoundary: [number, number][] = [
      [125.712, 7.102],
      [125.713, 7.102],
      [125.713, 7.103],
      [125.712, 7.103],
    ];

    const { subdivision, lot } = unwrap(await createSubdivisionLot({
      project_area_id: projectAreaId,
      block_number: 1,
      lot_number: 1,
      boundary: lotBoundary,
    }));

    expect(subdivision).toBeDefined();
    expect(subdivision.block_number).toBe(1);
    expect(subdivision.lot_number).toBe(1);
    expect(subdivision.project_area_id).toBe(projectAreaId);

    // Lot is available by default (subdivision slot exists, property_lot row is null until claimed)
    expect(lot).toBeNull();

    // Verify it appears in getProjectAreaWithLots as an available subdivision
    const projectAreaWithLots = await getProjectAreaWithLots(projectAreaId);
    expect(projectAreaWithLots.subdivisions.some((s) => s.block_number === 1 && s.lot_number === 1)).toBe(true);
    expect(projectAreaWithLots.lots.some((l) => l.block_number === 1 && l.lot_number === 1)).toBe(false);
  });

  it("rejects duplicate block and lot number on the same projectArea", async () => {
    const projectAreaId = testProjectAreaIds[0];
    const lotBoundary: [number, number][] = [
      [125.712, 7.102],
      [125.713, 7.102],
      [125.713, 7.103],
      [125.712, 7.103],
    ];

    const dupRes = await createSubdivisionLot({
      project_area_id: projectAreaId,
      block_number: 1,
      lot_number: 1,
      boundary: lotBoundary,
    });
    expect(dupRes.success).toBe(false);
  });

  it("deletes the plot if it is wrong", async () => {
    const projectAreaId = testProjectAreaIds[0];

    // Plot a temporary lot to delete
    const lotBoundary: [number, number][] = [
      [125.714, 7.104],
      [125.715, 7.104],
      [125.715, 7.105],
      [125.714, 7.105],
    ];

    const { subdivision } = unwrap(await createSubdivisionLot({
      project_area_id: projectAreaId,
      block_number: 2,
      lot_number: 5,
      boundary: lotBoundary,
    }));

    // Verify it was created
    let projectAreaWithLots = await getProjectAreaWithLots(projectAreaId);
    expect(projectAreaWithLots.subdivisions.some((s) => s.block_number === 2 && s.lot_number === 5)).toBe(true);

    // Now delete the plot
    unwrap(await deleteSubdivisionLot({
      subdivision_id: subdivision.subdivision_id,
      project_area_id: projectAreaId,
      block_number: 2,
      lot_number: 5,
    }));

    // Verify it is completely removed
    projectAreaWithLots = await getProjectAreaWithLots(projectAreaId);
    expect(projectAreaWithLots.subdivisions.some((s) => s.block_number === 2 && s.lot_number === 5)).toBe(false);
    expect(projectAreaWithLots.lots.some((l) => l.block_number === 2 && l.lot_number === 5)).toBe(false);
  });

  it("refuses to register a lot without a real price rather than inventing one", async () => {
    const projectAreaId = testProjectAreaIds[0];

    const result = await createSubdivisionLot({
      project_area_id: projectAreaId,
      block_number: 9,
      lot_number: 9,
      boundary: [
        [125.718, 7.108],
        [125.719, 7.108],
        [125.719, 7.109],
        [125.718, 7.109],
      ],
      create_property_lot: true,
      // no price_per_sqm
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.price_per_sqm?.[0]).toMatch(/price per sqm is required/i);
    }

    // Nothing should have been written
    const projectAreaWithLots = await getProjectAreaWithLots(projectAreaId);
    expect(projectAreaWithLots.lots.some((l) => l.block_number === 9 && l.lot_number === 9)).toBe(false);
  });

  it("prevents deleting a plot if the lot is reserved or sold", async () => {
    const projectAreaId = testProjectAreaIds[0];

    // Create a lot
    const lotBoundary: [number, number][] = [
      [125.716, 7.106],
      [125.717, 7.106],
      [125.717, 7.107],
      [125.716, 7.107],
    ];

    const { subdivision, lot } = unwrap(await createSubdivisionLot({
      project_area_id: projectAreaId,
      block_number: 3,
      lot_number: 1,
      boundary: lotBoundary,
      create_property_lot: true,
      price_per_sqm: 5000,
    }));

    expect(lot).toBeDefined();
    // Mark it as Reserved
    unwrap(await updatePropertyLot(lot!.property_id, { status: "Reserved" }));

    // Attempt to delete the plot should fail
    const delRes = await deleteSubdivisionLot({
      subdivision_id: subdivision.subdivision_id,
      project_area_id: projectAreaId,
      block_number: 3,
      lot_number: 1,
    });
    expect(delRes.success).toBe(false);
    if (!delRes.success) {
      expect(delRes.error).toMatch(/reserved/i);
    }

    // Clean up by resetting to Open then deleting
    unwrap(await updatePropertyLot(lot!.property_id, { status: "Open" }));
    unwrap(await deleteSubdivisionLot({
      subdivision_id: subdivision.subdivision_id,
      project_area_id: projectAreaId,
      block_number: 3,
      lot_number: 1,
    }));
  });

  it("deletes the created projectArea during cleanup", async () => {
    const projectAreaId = testProjectAreaIds[0];
    unwrap(await deleteProjectArea(projectAreaId));

    const admin = getTestAdminClient();
    const { data: found } = await admin.from("project_area").select("project_area_id").eq("project_area_id", projectAreaId).maybeSingle();
    expect(found).toBeNull();
  });
});


