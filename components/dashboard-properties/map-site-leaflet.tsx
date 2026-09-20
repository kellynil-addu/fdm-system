'use client';

import { useEffect, useRef, useState, useTransition, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';
import { getArcGISToken } from '@/lib/actions/arcgis';
import { useLeafletMap } from '@/lib/hooks/use-leaflet-map';
import { SAMAL_SUBDIVISION } from '@/lib/samal-subdivision';
import type { SiteWithLots } from '@/lib/types/property';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

export interface MapSiteLeafletProps {
  site: SiteWithLots;
  selectedLotId?: string | null;
  onSelectLot?: (lotId: string | null) => void;
  isSidebarOpen?: boolean;
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const SIDEBAR_WIDTH = 460;

export function MapSiteLeaflet({
  site,
  selectedLotId,
  onSelectLot,
  isSidebarOpen = true,
  className,
  initialCenter = [7.1053089, 125.668114],
  initialZoom = 15,
}: MapSiteLeafletProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const [activeLotId, setActiveLotId] = useState<string | null>(
    selectedLotId ?? null
  );
  const [isPending, startTransition] = useTransition();

  const { map, isReady } = useLeafletMap(containerRef, {
    center: initialCenter,
    zoom: initialZoom,
    scrollWheelZoom: true,
    zoomControl: false,
    fadeAnimation: false,
  });

  // Keep internal selected lot in sync with parent prop
  useEffect(() => {
    if (selectedLotId !== undefined) {
      setActiveLotId(selectedLotId);
    }
  }, [selectedLotId]);

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

  // Listen to zoom changes for LOD rendering
  useEffect(() => {
    if (!map) return;
    const updateZoom = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  // Recalculate size when sidebar expands or collapses
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 320);
    return () => clearTimeout(timer);
  }, [map, isSidebarOpen]);

  // Zoom centered on visible screen space (compensating for floating sidebar)
  const zoomAtVisualCenter = useCallback(
    (delta: number) => {
      if (!map || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const sidebarOffset = isSidebarOpen && rect.width > 768 ? SIDEBAR_WIDTH : 0;
      const visualCenterX = sidebarOffset + (rect.width - sidebarOffset) / 2;
      const visualCenterY = rect.height / 2;

      // Dynamically import Leaflet point to calculate focal zoom
      import('leaflet').then((module) => {
        const L = module.default;
        const focalPoint = L.point(visualCenterX, visualCenterY);
        const targetZoom = map.getZoom() + delta;
        map.setZoomAround(focalPoint, targetZoom);
      });
    },
    [map, isSidebarOpen]
  );

  // Mount ArcGIS base satellite and label overlay layers
  useEffect(() => {
    if (!map || !isReady || !token) return;

    let isMounted = true;
    let satelliteLayer: import('leaflet').TileLayer | null = null;
    let labelsLayer: import('leaflet').TileLayer | null = null;

    async function addTileLayers() {
      const L = (await import('leaflet')).default;
      if (!isMounted || !map || !map.getContainer()) return;

      // Satellite raster basemap
      satelliteLayer = L.tileLayer(
        `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${token}`,
        {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
          tileSize: 256,
          keepBuffer: 8,
          updateWhenIdle: false,
          updateWhenZooming: true,
        }
      ).addTo(map);

      // 512px labels raster overlay
      labelsLayer = L.tileLayer(
        `https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/open/hybrid/detail/static/tile/{z}/{y}/{x}?token=${token}`,
        {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
          tileSize: 512,
          zoomOffset: -1,
          keepBuffer: 8,
          updateWhenIdle: false,
          updateWhenZooming: true,
        }
      ).addTo(map);
    }

    addTileLayers();

    return () => {
      isMounted = false;
      if (map && map.getContainer()) {
        if (satelliteLayer) map.removeLayer(satelliteLayer);
        if (labelsLayer) map.removeLayer(labelsLayer);
      }
    };
  }, [map, isReady, token]);

  // Mount Samal Island shapes with zoom-dependent LOD and red focus selection
  useEffect(() => {
    if (!map || !isReady) return;

    let isMounted = true;
    let layerGroup: import('leaflet').LayerGroup | null = null;

    async function renderSamalGeometry() {
      const L = (await import('leaflet')).default;
      if (!isMounted || !map || !map.getContainer()) return;

      layerGroup = L.layerGroup().addTo(map);

      // When zoomed out, merge into a single subdivision boundary
      if (currentZoom < SAMAL_SUBDIVISION.zoomThreshold) {
        const boundaryPolygon = L.polygon(SAMAL_SUBDIVISION.boundaryLatLon, {
          color: '#38bdf8',
          weight: 2,
          dashArray: '5, 5',
          fillColor: '#0284c7',
          fillOpacity: 0.25,
        });

        boundaryPolygon.bindTooltip(
          `<strong>${SAMAL_SUBDIVISION.name}</strong><br/><span class="text-xs">Zoom in to view house lots</span>`,
          { sticky: true }
        );

        boundaryPolygon.addTo(layerGroup);
        return;
      }

      // When zoomed in, render individual house polygons
      SAMAL_SUBDIVISION.lots.forEach((lot) => {
        const isSelected = activeLotId === lot.id;

        const housePolygon = L.polygon(lot.polygonLatLon, {
          color: isSelected ? '#dc2626' : '#22c55e',
          weight: isSelected ? 3 : 1.5,
          fillColor: isSelected ? '#ef4444' : '#16a34a',
          fillOpacity: isSelected ? 0.75 : 0.45,
        });

        housePolygon.bindTooltip(
          `<strong>${lot.name}</strong><br/>${isSelected ? 'Selected' : 'Click to select'}`,
          { sticky: true }
        );

        housePolygon.on('click', () => {
          const nextId = activeLotId === lot.id ? null : lot.id;
          setActiveLotId(nextId);
          onSelectLot?.(nextId);
        });

        housePolygon.addTo(layerGroup!);
      });
    }

    renderSamalGeometry();

    return () => {
      isMounted = false;
      if (map && map.getContainer() && layerGroup) {
        map.removeLayer(layerGroup);
      }
    };
  }, [map, isReady, currentZoom, activeLotId, onSelectLot]);

  return (
    <div
      className={cn(
        'relative flex flex-1 h-full min-h-0 w-full flex-col overflow-hidden bg-background',
        className
      )}
      data-site-id={site.site_id}
      data-engine="leaflet"
    >
      {/* Map canvas */}
      <div
        ref={containerRef}
        className="h-full w-full z-0 bg-[#0b1120] [&_.leaflet-container]:!bg-[#0b1120] [&_.leaflet-tile]:!transition-none"
      />

      {/* Floating zoom controls (top-right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 shadow-md">
        <Button
          variant="outline"
          size="icon"
          onClick={() => zoomAtVisualCenter(1)}
          disabled={!isReady}
          aria-label="Zoom in"
          className="h-9 w-9 rounded-xl border-border bg-card text-foreground hover:bg-row-hover shadow-sm"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => zoomAtVisualCenter(-1)}
          disabled={!isReady}
          aria-label="Zoom out"
          className="h-9 w-9 rounded-xl border-border bg-card text-foreground hover:bg-row-hover shadow-sm"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Current zoom level & LOD indicator (bottom-left) */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-xs text-foreground shadow-md backdrop-blur-xs">
        <span className="font-semibold text-primary">Leaflet</span>
        <span className="text-muted-foreground">|</span>
        <span>Zoom: {Math.round(currentZoom)}</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">
          {currentZoom >= SAMAL_SUBDIVISION.zoomThreshold
            ? 'Individual Houses (LOD 2)'
            : 'Subdivision Perimeter (LOD 1)'}
        </span>
      </div>

      {/* Loading overlay */}
      {isPending && !token && !tokenError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-xs">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium text-foreground">
              Connecting to ArcGIS (Leaflet)...
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
