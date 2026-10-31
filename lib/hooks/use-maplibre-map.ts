'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

export interface MapLibrePadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface UseMapLibreMapOptions {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  padding?: Partial<MapLibrePadding>;
  backgroundColor?: string;
  maxBounds?: [[number, number], [number, number]];
  minZoom?: number;
}

/**
 * Global handle on the live map instance, published for end-to-end tests only.
 *
 * Lots are drawn as WebGL polygons on a canvas, so Playwright cannot locate them with a
 * selector. Tests would otherwise have to walk React's internal fiber tree to reach the
 * instance; this exposes it directly. Stripped from production builds by the `NODE_ENV` check.
 */
export const E2E_MAP_HANDLE = '__fdmMap';

export function useMapLibreMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseMapLibreMapOptions = {}
) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let isMounted = true;

    async function initMap() {
      // Dynamically load MapLibre GL on client to prevent SSR window reference errors
      const { Map, setWorkerUrl } = await import('maplibre-gl');
      setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      if (!isMounted || !containerRef.current) return;

      const {
        center = [125.5844925, 7.0447193], // Default 36km regional overview
        zoom = 11.8,
        padding = {},
        backgroundColor = '#0b1120',
        maxBounds,
        minZoom,
      } = optionsRef.current;

      const fullPadding: MapLibrePadding = {
        top: padding.top ?? 0,
        bottom: padding.bottom ?? 0,
        left: padding.left ?? 0,
        right: padding.right ?? 0,
      };

      const map = new Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': backgroundColor },
            },
          ],
        },
        center,
        zoom,
        maxBounds,
        minZoom,
        attributionControl: false,
      });

      map.setPadding(fullPadding);

      map.on('load', () => {
        if (!isMounted) return;
        mapRef.current = map;
        setMapInstance(map);
        setIsReady(true);
        if (process.env.NODE_ENV !== 'production') {
          (window as unknown as Record<string, unknown>)[E2E_MAP_HANDLE] = map;
        }
      });
    }

    initMap();

    return () => {
      isMounted = false;
      const instance = mapRef.current;
      if (instance) {
        instance.remove();
        mapRef.current = null;
        setMapInstance(null);
        setIsReady(false);
        // Only clear the handle if it still points at this instance, so a map torn down after its
        // replacement mounted does not unpublish the live one.
        if ((window as unknown as Record<string, unknown>)[E2E_MAP_HANDLE] === instance) {
          delete (window as unknown as Record<string, unknown>)[E2E_MAP_HANDLE];
        }
      }
    };
  }, [containerRef]);

  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 250 });
  }, []);

  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 250 });
  }, []);

  return {
    map: mapInstance,
    isReady,
    zoomIn,
    zoomOut,
  };
}

