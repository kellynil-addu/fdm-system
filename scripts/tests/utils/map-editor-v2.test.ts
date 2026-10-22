import { describe, it, expect, beforeEach } from 'vitest';
import { pointInPolygon, isPolygonContained, calculatePolygonAreaSqm } from '@/lib/geometry';
import { updateSubdivisionBoundarySchema } from '@/lib/validations/property';
import { getSiteDraft, saveSiteDraft, clearSiteDraft } from '@/lib/storage/map-draft-storage';

describe('Map Editor v2 Utilities & Algorithms', () => {
  // A test site boundary around Samal Island coordinates
  const siteRing: [number, number][] = [
    [125.70, 7.04],
    [125.75, 7.04],
    [125.75, 7.08],
    [125.70, 7.08],
  ];

  describe('Ray-casting pointInPolygon & isPolygonContained', () => {
    it('accurately identifies points inside the polygon', () => {
      const insidePoint: [number, number] = [125.72, 7.06];
      expect(pointInPolygon(insidePoint, siteRing)).toBe(true);
    });

    it('accurately rejects points outside the polygon', () => {
      const outsidePointNorth: [number, number] = [125.72, 7.10];
      const outsidePointWest: [number, number] = [125.68, 7.06];
      expect(pointInPolygon(outsidePointNorth, siteRing)).toBe(false);
      expect(pointInPolygon(outsidePointWest, siteRing)).toBe(false);
    });

    it('validates entire shape containment correctly', () => {
      const fullyContainedShape: [number, number][] = [
        [125.71, 7.05],
        [125.73, 7.05],
        [125.73, 7.07],
        [125.71, 7.07],
      ];

      const partiallyOutOfBoundsShape: [number, number][] = [
        [125.71, 7.05],
        [125.73, 7.05],
        [125.76, 7.07], // Outside (> 125.75)
        [125.71, 7.07],
      ];

      expect(isPolygonContained(fullyContainedShape, siteRing)).toBe(true);
      expect(isPolygonContained(partiallyOutOfBoundsShape, siteRing)).toBe(false);
    });

    it('returns false for empty shapes', () => {
      expect(isPolygonContained([], siteRing)).toBe(false);
      expect(isPolygonContained([[125.72, 7.06]], [])).toBe(false);
    });
  });

  describe('Area recalculation during vertex manipulation', () => {
    it('recalculates metric square meters as vertices are adjusted', () => {
      const initialQuad: [number, number][] = [
        [125.7000, 7.0400],
        [125.7010, 7.0400],
        [125.7010, 7.0410],
        [125.7000, 7.0410],
      ];
      const initialArea = calculatePolygonAreaSqm(initialQuad);
      expect(initialArea).toBeGreaterThan(1000);

      // Stretch right edge
      const stretchedQuad: [number, number][] = [
        [125.7000, 7.0400],
        [125.7020, 7.0400], // stretched by 2x
        [125.7020, 7.0410],
        [125.7000, 7.0410],
      ];
      const stretchedArea = calculatePolygonAreaSqm(stretchedQuad);
      expect(stretchedArea).toBeGreaterThan(initialArea);
    });
  });

  describe('LocalStorage draft persistence', () => {
    const siteId = '11111111-2222-3333-4444-555555555555';
    const store = new Map<string, string>();

    beforeEach(() => {
      store.clear();
      (globalThis as unknown as { localStorage: unknown }).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      };
      clearSiteDraft(siteId);
    });

    it('saves, retrieves, and clears draft payloads per site', () => {
      expect(getSiteDraft(siteId)).toBeNull();

      const mockPayload = {
        siteId,
        draftLots: [
          {
            draftId: 'draft-1',
            siteId,
            boundary: [[125.71, 7.05], [125.72, 7.05], [125.72, 7.06]] as [number, number][],
            block: 1,
            lot: 5,
            areaSize: 250,
            createdAt: Date.now(),
          },
        ],
        pendingBoundaryUpdates: [],
      };

      saveSiteDraft(siteId, mockPayload);

      const retrieved = getSiteDraft(siteId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.siteId).toBe(siteId);
      expect(retrieved?.draftLots).toHaveLength(1);
      expect(retrieved?.draftLots[0].block).toBe(1);
      expect(retrieved?.draftLots[0].lot).toBe(5);

      clearSiteDraft(siteId);
      expect(getSiteDraft(siteId)).toBeNull();
    });
  });

  describe('Zod boundary update schema', () => {
    it('validates correct subdivision boundary input', () => {
      const valid = {
        subdivision_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        site_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        block_number: 2,
        lot_number: 14,
        boundary: [
          [125.71, 7.05],
          [125.72, 7.05],
          [125.72, 7.06],
        ],
      };

      const result = updateSubdivisionBoundarySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid boundaries with fewer than 3 vertices', () => {
      const invalid = {
        subdivision_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        site_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        block_number: 2,
        lot_number: 14,
        boundary: [
          [125.71, 7.05],
          [125.72, 7.05],
        ],
      };

      const result = updateSubdivisionBoundarySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
