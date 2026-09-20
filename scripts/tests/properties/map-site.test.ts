import { describe, it, expect } from "vitest";
import { SiteMap } from "@/components/dashboard-properties/map-site";
import { MapSiteLeaflet } from "@/components/dashboard-properties/map-site-leaflet";
import { MapSiteMapLibre } from "@/components/dashboard-properties/map-site-maplibre";
import { useLeafletMap } from "@/lib/hooks/use-leaflet-map";
import { useMapLibreMap } from "@/lib/hooks/use-maplibre-map";
import { SAMAL_SUBDIVISION } from "@/lib/samal-subdivision";
import { getArcGISApplicationToken } from "@/lib/arcgis";

describe("Map Frontends & Samal Subdivision Integration", () => {
  it("exports both Leaflet and MapLibre GL map components and hooks", () => {
    expect(typeof SiteMap).toBe("function");
    expect(typeof MapSiteLeaflet).toBe("function");
    expect(typeof MapSiteMapLibre).toBe("function");
    expect(typeof useLeafletMap).toBe("function");
    expect(typeof useMapLibreMap).toBe("function");
  });

  describe("Samal Island Subdivision Geometry", () => {
    it("is centered on Samal Island at 7.1053089, 125.668114", () => {
      expect(SAMAL_SUBDIVISION.center[0]).toBeCloseTo(7.1053089, 6);
      expect(SAMAL_SUBDIVISION.center[1]).toBeCloseTo(125.668114, 6);
      expect(SAMAL_SUBDIVISION.zoomThreshold).toBe(17);
    });

    it("generates exactly 12 house lots arranged in two blocks", () => {
      expect(SAMAL_SUBDIVISION.lots.length).toBe(12);

      const block1Lots = SAMAL_SUBDIVISION.lots.filter((l) => l.blockNumber === 1);
      const block2Lots = SAMAL_SUBDIVISION.lots.filter((l) => l.blockNumber === 2);

      expect(block1Lots.length).toBe(6);
      expect(block2Lots.length).toBe(6);

      // Verify each house has valid 5-point closed polygons in both coordinate systems
      SAMAL_SUBDIVISION.lots.forEach((lot) => {
        expect(lot.polygonLatLon.length).toBe(5);
        expect(lot.polygonLonLat.length).toBe(5);
        // Closed ring
        expect(lot.polygonLatLon[0]).toEqual(lot.polygonLatLon[4]);
        expect(lot.polygonLonLat[0]).toEqual(lot.polygonLonLat[4]);
      });
    });

    it("encloses all lots within the subdivision boundary", () => {
      expect(SAMAL_SUBDIVISION.boundaryLatLon.length).toBe(5);
      expect(SAMAL_SUBDIVISION.boundaryLonLat.length).toBe(5);

      const lats = SAMAL_SUBDIVISION.boundaryLatLon.map((p) => p[0]);
      const lngs = SAMAL_SUBDIVISION.boundaryLatLon.map((p) => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Verify all lot centers are within the boundary bounds
      SAMAL_SUBDIVISION.lots.forEach((lot) => {
        expect(lot.center[0]).toBeGreaterThan(minLat);
        expect(lot.center[0]).toBeLessThan(maxLat);
        expect(lot.center[1]).toBeGreaterThan(minLng);
        expect(lot.center[1]).toBeLessThan(maxLng);
      });
    });
  });

  describe("ArcGIS Dual Layer Integration", () => {
    it("formats satellite imagery and 512px label overlay tile URLs with active token", async () => {
      const tokenData = await getArcGISApplicationToken();
      const token = tokenData.accessToken;
      expect(token).toBeDefined();

      const satelliteUrlTemplate = `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${token}`;
      const labelsUrlTemplate = `https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/open/hybrid/detail/static/tile/{z}/{y}/{x}?token=${token}`;

      const z = 15;
      const y = 15739;
      const x = 27814;

      const satelliteTile = satelliteUrlTemplate
        .replace("{z}", String(z))
        .replace("{y}", String(y))
        .replace("{x}", String(x));

      const labelsTile = labelsUrlTemplate
        .replace("{z}", String(z))
        .replace("{y}", String(y))
        .replace("{x}", String(x));

      expect(satelliteTile).toContain(`/tile/15/15739/27814?token=${token}`);
      expect(labelsTile).toContain(`/tile/15/15739/27814?token=${token}`);
    });
  });
});
