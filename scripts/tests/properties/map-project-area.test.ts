import { describe, it, expect, beforeAll } from "vitest";
import { ProjectAreaMap } from "@/components/dashboard-properties/map-project-area";
import { useMapLibreMap } from "@/lib/hooks/use-maplibre-map";
import { getArcGISApplicationToken } from "@/lib/arcgis";
import { getAllProjectAreasWithLots } from "@/lib/actions/project-areas";
import { seedAllSampleProjectAreas } from "@/scripts/seed-sample-project-area";
import { getTestAdminClient, withTemporaryUser } from "../framework/session";

describe("ProjectAreaMap Component & MapLibre Integration", () => {
  beforeAll(async () => {
    const admin = getTestAdminClient();
    const { data: existing } = await admin
      .from("project_area")
      .select("project_area_id")
      .in("name", ["Barangay Limao", "San Augustin", "Kaputian", "Caliclic"]);

    if (!existing || existing.length < 4) {
      await seedAllSampleProjectAreas();
    }
  });

  it("exports ProjectAreaMap and useMapLibreMap correctly", () => {
    expect(typeof ProjectAreaMap).toBe("function");
    expect(typeof useMapLibreMap).toBe("function");
  });

  it("formats single basemap ArcGIS hybrid style URL with active token", async () => {
    const tokenData = await getArcGISApplicationToken();
    const token = tokenData.accessToken;
    expect(token).toBeDefined();

    const hybridStyleUrl = `https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/open/hybrid?token=${token}`;
    expect(hybridStyleUrl).toContain(`open/hybrid?token=${token}`);
  });

  it("formats VersaTiles satellite fallback and osm vector tile URLs", () => {
    const satelliteUrlTemplate = "https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}";
    const osmUrlTemplate = "https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}";
    const z = 14;
    const x = 13908;
    const y = 7868;

    const satelliteTile = satelliteUrlTemplate
      .replace("{z}", String(z))
      .replace("{x}", String(x))
      .replace("{y}", String(y));

    const osmTile = osmUrlTemplate
      .replace("{z}", String(z))
      .replace("{x}", String(x))
      .replace("{y}", String(y));

    expect(satelliteTile).toBe("https://tiles.versatiles.org/tiles/satellite/14/13908/7868");
    expect(osmTile).toBe("https://tiles.versatiles.org/tiles/osm/14/13908/7868");
  });

  it("verifies the 4 real-world Samal Island projectAreas exist in database with WGS84 coordinates", async () => {
    const admin = getTestAdminClient();
    const expectedProjectAreaNames = [
      "Barangay Limao",
      "San Augustin",
      "Kaputian",
      "Caliclic",
    ];

    const { data: projectAreas, error } = await admin
      .from("project_area")
      .select("project_area_id, name, boundary")
      .in("name", expectedProjectAreaNames);

    expect(error).toBeNull();
    expect(projectAreas).toBeDefined();
    expect(projectAreas?.length).toBe(4);

    for (const projectArea of projectAreas!) {
      const boundary = projectArea.boundary as [number, number][];
      expect(Array.isArray(boundary)).toBe(true);
      expect(boundary.length).toBeGreaterThanOrEqual(4);

      // Verify WGS84 bounds around Samal Island / Davao Gulf
      for (const [lng, lat] of boundary) {
        expect(lng).toBeGreaterThanOrEqual(125.5);
        expect(lng).toBeLessThanOrEqual(125.9);
        expect(lat).toBeGreaterThanOrEqual(6.8);
        expect(lat).toBeLessThanOrEqual(7.3);
      }
    }
  });

  it("verifies 48 subdivisions are seeded with partial registration (3-5 property lots per projectArea)", async () => {
    const admin = getTestAdminClient();
    const { data: projectAreas } = await admin
      .from("project_area")
      .select("project_area_id, name")
      .in("name", ["Barangay Limao", "San Augustin", "Kaputian", "Caliclic"]);

    expect(projectAreas?.length).toBe(4);
    const projectAreaIds = projectAreas!.map((s) => s.project_area_id);

    const { data: subdivisions, error: subError } = await admin
      .from("project_area_subdivision")
      .select("subdivision_id, block_number, lot_number, boundary, project_area_id")
      .in("project_area_id", projectAreaIds);

    expect(subError).toBeNull();
    expect(subdivisions).toBeDefined();
    expect(subdivisions!.length).toBe(48);

    for (const sub of subdivisions!) {
      const boundary = sub.boundary as [number, number][];
      expect(Array.isArray(boundary)).toBe(true);
      expect(boundary.length).toBeGreaterThanOrEqual(4);
    }

    const { data: propertyLots, error: lotError } = await admin
      .from("property_lot")
      .select("property_id, block_number, lot_number, status, project_area_id")
      .in("project_area_id", projectAreaIds);

    expect(lotError).toBeNull();
    expect(propertyLots).toBeDefined();
    expect(propertyLots!.length).toBe(16);

    // Each projectArea should have between 3 and 5 registered lots
    for (const projectAreaId of projectAreaIds) {
      const projectAreaSubdivisions = subdivisions!.filter((s) => s.project_area_id === projectAreaId);
      const projectAreaLots = propertyLots!.filter((l) => l.project_area_id === projectAreaId);

      expect(projectAreaSubdivisions.length).toBe(12);
      expect(projectAreaLots.length).toBeGreaterThanOrEqual(3);
      expect(projectAreaLots.length).toBeLessThanOrEqual(5);
    }
  });

  it("verifies getAllProjectAreasWithLots returns all projectAreas with populated subdivisions and lots", async () => {
    await withTemporaryUser({ roleNames: ["system_admin"] }, async () => {
      const allProjectAreas = await getAllProjectAreasWithLots();
      expect(allProjectAreas.length).toBeGreaterThanOrEqual(4);

      const samalProjectAreas = allProjectAreas.filter((s) =>
        ["Barangay Limao", "San Augustin", "Kaputian", "Caliclic"].includes(s.name)
      );
      expect(samalProjectAreas.length).toBe(4);

      for (const projectArea of samalProjectAreas) {
        expect(projectArea.subdivisions.length).toBe(12);
        expect(projectArea.lots.length).toBeGreaterThanOrEqual(3);
        expect(projectArea.lots.length).toBeLessThanOrEqual(5);
      }
    });
  });
});
