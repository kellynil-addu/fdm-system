'use client';

import { useEffect, useRef, useState, useTransition, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Loader2, AlertCircle, LocateFixed } from 'lucide-react';
import { getArcGISToken } from '@/lib/actions/arcgis';
import { useMapLibreMap } from '@/lib/hooks/use-maplibre-map';
import { SAMAL_SUBDIVISION } from '@/lib/samal-subdivision';
import type { SiteWithLots } from '@/lib/types/property';
import { cn } from '@/lib/utils';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapSiteMapLibreProps {
  site: SiteWithLots;
  selectedLotId?: string | null;
  onSelectLot?: (lotId: string | null) => void;
  isSidebarOpen?: boolean;
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const SIDEBAR_WIDTH = 460;

export function MapSiteMapLibre({
  site,
  selectedLotId,
  onSelectLot,
  isSidebarOpen = true,
  className,
  initialCenter = [7.1053089, 125.668114],
  initialZoom = 17,
}: MapSiteMapLibreProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const [activeLotId, setActiveLotId] = useState<string | null>(
    selectedLotId ?? null
  );
  const activeLotIdRef = useRef<string | null>(activeLotId);
  activeLotIdRef.current = activeLotId;

  const [isPending, startTransition] = useTransition();

  // Convert [lat, lng] to [lng, lat] for MapLibre
  const centerLngLat: [number, number] = [initialCenter[1], initialCenter[0]];

  const { map, isReady, zoomIn, zoomOut } = useMapLibreMap(containerRef, {
    center: centerLngLat,
    zoom: initialZoom,
    padding: { top: 0, bottom: 0, left: isSidebarOpen ? SIDEBAR_WIDTH : 0, right: 0 },
  });

  // Keep internal selected lot in sync with parent prop
  useEffect(() => {
    if (selectedLotId !== undefined) {
      setActiveLotId(selectedLotId);
    }
  }, [selectedLotId]);

  // Subdivision bounding box coordinates
  const subdivisionBounds = useMemo(() => {
    const lats = SAMAL_SUBDIVISION.boundaryLonLat.map((p) => p[1]);
    const lngs = SAMAL_SUBDIVISION.boundaryLonLat.map((p) => p[0]);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, []);

  // Center view on subdivision geometry
  const focusSubdivision = useCallback(() => {
    if (!map) return;
    map.fitBounds(subdivisionBounds, {
      padding: { top: 70, bottom: 70, left: isSidebarOpen ? 500 : 70, right: 70 },
      maxZoom: 18.5,
      duration: 800,
    });
  }, [map, subdivisionBounds, isSidebarOpen]);

  const fetchToken = () => {
    startTransition(async () => {
      try {
        setTokenError(null);
        const result = await getArcGISToken();
        setToken(result.accessToken);
      } catch (err) {
        setTokenError(
          err instanceof Error ? err.message : 'Failed to retrieve ArcGIS token'
        );
      }
    });
  };

  useEffect(() => {
    fetchToken();
  }, []);

  // Animate map padding when sidebar expands or collapses
  useEffect(() => {
    if (!map) return;
    const paddingLeft = isSidebarOpen ? SIDEBAR_WIDTH : 0;
    map.easeTo({
      padding: { top: 0, bottom: 0, left: paddingLeft, right: 0 },
      duration: 350,
    });
  }, [map, isSidebarOpen]);

  // Track map zoom level
  useEffect(() => {
    if (!map) return;
    const handleZoom = () => setCurrentZoom(map.getZoom());
    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

  // GeoJSON features for subdivision perimeter and house lots
  const geojsonData = useMemo(() => {
    const boundaryFeature = {
      type: 'Feature' as const,
      properties: {
        type: 'subdivision-boundary',
        id: SAMAL_SUBDIVISION.id,
        name: SAMAL_SUBDIVISION.name,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [SAMAL_SUBDIVISION.boundaryLonLat],
      },
    };

    const lotFeatures = SAMAL_SUBDIVISION.lots.map((lot) => ({
      type: 'Feature' as const,
      properties: {
        type: 'house-lot',
        id: lot.id,
        name: lot.name,
        lotNumber: lot.lotNumber,
        blockNumber: lot.blockNumber,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [lot.polygonLonLat],
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features: [boundaryFeature, ...lotFeatures],
    };
  }, []);

  // Mount Samal Island GeoJSON vector layers and interactions
  useEffect(() => {
    if (!map || !isReady) return;

    let popupInstance: import('maplibre-gl').Popup | null = null;
    let handleMouseEnter: (e: import('maplibre-gl').MapLayerMouseEvent) => void;
    let handleMouseLeave: () => void;
    let handleClick: (e: import('maplibre-gl').MapLayerMouseEvent) => void;

    async function setupVectors() {
      if (!map) return;
      const { Popup } = await import('maplibre-gl');

      // Add Samal Island subdivision GeoJSON source
      if (!map.getSource('samal-data')) {
        map.addSource('samal-data', {
          type: 'geojson',
          data: geojsonData,
        });

        // Subdivision boundary perimeter
        map.addLayer({
          id: 'subdivision-boundary-fill',
          type: 'fill',
          source: 'samal-data',
          filter: ['==', ['get', 'type'], 'subdivision-boundary'],
          paint: {
            'fill-color': '#0284c7',
            'fill-opacity': 0.2,
            'fill-outline-color': '#38bdf8',
          },
        });

        map.addLayer({
          id: 'subdivision-boundary-stroke',
          type: 'line',
          source: 'samal-data',
          filter: ['==', ['get', 'type'], 'subdivision-boundary'],
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2,
            'line-dasharray': [4, 2],
          },
        });

        // House lots fill with selection expression
        map.addLayer({
          id: 'house-lots-fill',
          type: 'fill',
          source: 'samal-data',
          filter: ['==', ['get', 'type'], 'house-lot'],
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'id'], activeLotIdRef.current ?? ''],
              '#ef4444',
              '#22c55e',
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'id'], activeLotIdRef.current ?? ''],
              0.85,
              0.65,
            ],
            'fill-outline-color': '#ffffff',
          },
        });

        // High-contrast house lot outline
        map.addLayer({
          id: 'house-lots-stroke',
          type: 'line',
          source: 'samal-data',
          filter: ['==', ['get', 'type'], 'house-lot'],
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'id'], activeLotIdRef.current ?? ''],
              '#f87171',
              '#ffffff',
            ],
            'line-width': [
              'case',
              ['==', ['get', 'id'], activeLotIdRef.current ?? ''],
              3,
              2,
            ],
          },
        });

        // Auto-frame subdivision in visible screen area
        map.fitBounds(subdivisionBounds, {
          padding: { top: 70, bottom: 70, left: isSidebarOpen ? 500 : 70, right: 70 },
          maxZoom: 18.5,
          duration: 0,
        });
      }

      popupInstance = new Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'maplibre-lot-tooltip',
      });

      handleMouseEnter = (e: import('maplibre-gl').MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        if (!feature) return;

        const isSelected = activeLotIdRef.current === feature.properties.id;
        popupInstance
          ?.setLngLat(e.lngLat)
          .setHTML(
            `<div class="px-2 py-1 text-xs font-sans"><strong>${feature.properties.name}</strong><br/>${
              isSelected ? '<span class="text-red-600 font-medium">Selected</span>' : '<span class="text-emerald-600">Click to select</span>'
            }</div>`
          )
          .addTo(map);
      };

      handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
        popupInstance?.remove();
      };

      handleClick = (e: import('maplibre-gl').MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const lotId = feature.properties.id;
        const nextId = activeLotIdRef.current === lotId ? null : lotId;
        setActiveLotId(nextId);
        onSelectLot?.(nextId);
      };

      map.on('mouseenter', 'house-lots-fill', handleMouseEnter);
      map.on('mouseleave', 'house-lots-fill', handleMouseLeave);
      map.on('click', 'house-lots-fill', handleClick);
    }

    setupVectors();

    return () => {
      if (popupInstance) popupInstance.remove();
      if (map) {
        if (handleMouseEnter) map.off('mouseenter', 'house-lots-fill', handleMouseEnter);
        if (handleMouseLeave) map.off('mouseleave', 'house-lots-fill', handleMouseLeave);
        if (handleClick) map.off('click', 'house-lots-fill', handleClick);
      }
    };
  }, [map, isReady, geojsonData, subdivisionBounds, isSidebarOpen, onSelectLot]);

  // Mount ArcGIS satellite and labels tile layers underneath vector shapes
  useEffect(() => {
    if (!map || !isReady || !token) return;

    // Add ArcGIS satellite raster tile source
    if (!map.getSource('arcgis-imagery')) {
      map.addSource('arcgis-imagery', {
        type: 'raster',
        tiles: [
          `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${token}`,
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      });

      // Place raster underneath vector boundary
      const beforeId = map.getLayer('subdivision-boundary-fill') ? 'subdivision-boundary-fill' : undefined;
      map.addLayer(
        {
          id: 'arcgis-imagery-layer',
          type: 'raster',
          source: 'arcgis-imagery',
        },
        beforeId
      );
    }

    // Add ArcGIS 512px labels overlay raster tile source
    if (!map.getSource('arcgis-labels')) {
      map.addSource('arcgis-labels', {
        type: 'raster',
        tiles: [
          `https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/open/hybrid/detail/static/tile/{z}/{y}/{x}?token=${token}`,
        ],
        tileSize: 512,
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      });

      const beforeId = map.getLayer('subdivision-boundary-fill') ? 'subdivision-boundary-fill' : undefined;
      map.addLayer(
        {
          id: 'arcgis-labels-layer',
          type: 'raster',
          source: 'arcgis-labels',
        },
        beforeId
      );
    }
  }, [map, isReady, token]);

  // Update paint properties when activeLotId changes
  useEffect(() => {
    if (!map || !map.getLayer('house-lots-fill') || !map.getLayer('house-lots-stroke')) return;

    map.setPaintProperty('house-lots-fill', 'fill-color', [
      'case',
      ['==', ['get', 'id'], activeLotId ?? ''],
      '#ef4444',
      '#22c55e',
    ]);

    map.setPaintProperty('house-lots-fill', 'fill-opacity', [
      'case',
      ['==', ['get', 'id'], activeLotId ?? ''],
      0.85,
      0.65,
    ]);

    map.setPaintProperty('house-lots-stroke', 'line-color', [
      'case',
      ['==', ['get', 'id'], activeLotId ?? ''],
      '#f87171',
      '#ffffff',
    ]);

    map.setPaintProperty('house-lots-stroke', 'line-width', [
      'case',
      ['==', ['get', 'id'], activeLotId ?? ''],
      3,
      2,
    ]);
  }, [map, activeLotId]);

  return (
    <div
      className={cn(
        'relative flex flex-1 h-full min-h-0 w-full flex-col overflow-hidden bg-[#0b1120]',
        className
      )}
      data-site-id={site.site_id}
      data-engine="maplibre"
    >
      {/* MapLibre WebGL canvas */}
      <div ref={containerRef} className="h-full w-full z-0" />

      {/* Floating zoom controls (top-right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 shadow-md">
        <Button
          variant="outline"
          size="icon"
          onClick={focusSubdivision}
          disabled={!isReady}
          aria-label="Focus Samal subdivision"
          title="Focus Samal subdivision"
          className="h-9 w-9 rounded-xl border-border bg-card text-foreground hover:bg-row-hover shadow-sm"
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={zoomIn}
          disabled={!isReady}
          aria-label="Zoom in"
          className="h-9 w-9 rounded-xl border-border bg-card text-foreground hover:bg-row-hover shadow-sm"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={zoomOut}
          disabled={!isReady}
          aria-label="Zoom out"
          className="h-9 w-9 rounded-xl border-border bg-card text-foreground hover:bg-row-hover shadow-sm"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Current zoom level & LOD indicator (bottom-left) */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-xs text-foreground shadow-md backdrop-blur-xs">
        <span className="font-semibold text-primary">MapLibre GL (WebGL)</span>
        <span className="text-muted-foreground">|</span>
        <span>Zoom: {Math.round(currentZoom * 10) / 10}</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">12 House Lots</span>
      </div>

      {/* Loading overlay */}
      {isPending && !token && !tokenError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-xs">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium text-foreground">
              Connecting to ArcGIS (MapLibre)...
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {tokenError && (
        <div className="absolute bottom-4 right-4 z-20 flex max-w-sm items-center gap-3 rounded-xl border border-destructive/40 bg-card p-3 shadow-lg">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-foreground">Map connection error</p>
            <p className="text-muted-foreground">{tokenError}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchToken}
            className="text-xs border-border bg-card hover:bg-row-hover"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
