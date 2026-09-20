'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';
import { getArcGISToken } from '@/lib/actions/arcgis';
import { useOpenLayersMap } from '@/lib/hooks/use-openlayers-map';
import { SAMAL_SUBDIVISION } from '@/lib/samal-subdivision';
import type { SiteWithLots } from '@/lib/types/property';
import { cn } from '@/lib/utils';
import 'ol/ol.css';

export interface MapSiteOpenLayersProps {
  site: SiteWithLots;
  selectedLotId?: string | null;
  onSelectLot?: (lotId: string | null) => void;
  isSidebarOpen?: boolean;
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const SIDEBAR_WIDTH = 460;

export function MapSiteOpenLayers({
  site,
  selectedLotId,
  onSelectLot,
  isSidebarOpen = true,
  className,
  initialCenter = [7.1053089, 125.668114],
  initialZoom = 15,
}: MapSiteOpenLayersProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const [activeLotId, setActiveLotId] = useState<string | null>(
    selectedLotId ?? null
  );
  const [isPending, startTransition] = useTransition();

  // Convert [lat, lng] to [lng, lat] for OpenLayers
  const centerLonLat: [number, number] = [initialCenter[1], initialCenter[0]];

  const { map, isReady, zoomIn, zoomOut, updatePadding } = useOpenLayersMap(
    containerRef,
    {
      centerLonLat,
      zoom: initialZoom,
      padding: [0, 0, 0, isSidebarOpen ? SIDEBAR_WIDTH : 0],
    }
  );

  // Sync internal selected lot with parent prop
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

  // Update view padding and size when sidebar toggles
  useEffect(() => {
    if (!map) return;
    const paddingLeft = isSidebarOpen ? SIDEBAR_WIDTH : 0;
    updatePadding([0, 0, 0, paddingLeft]);
  }, [map, isSidebarOpen, updatePadding]);

  // Track zoom changes on the OpenLayers view
  useEffect(() => {
    if (!map) return;
    const view = map.getView();
    const handleZoomChange = () => {
      const z = view.getZoom();
      if (z !== undefined) setCurrentZoom(z);
    };

    view.on('change:resolution', handleZoomChange);
    return () => {
      view.un('change:resolution', handleZoomChange);
    };
  }, [map]);

  // Mount ArcGIS Tile layers (satellite & 512px labels)
  useEffect(() => {
    if (!map || !isReady || !token) return;

    let isMounted = true;
    let tileLayerGroup: any = null;

    async function addTileLayers() {
      const [
        { default: TileLayer },
        { default: XYZ },
        { default: LayerGroup },
      ] = await Promise.all([
        import('ol/layer/Tile'),
        import('ol/source/XYZ'),
        import('ol/layer/Group'),
      ]);

      if (!isMounted || !map) return;

      const satellite = new TileLayer({
        source: new XYZ({
          url: `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${token}`,
          attributions: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
          tileSize: 256,
        }),
      });

      const labels = new TileLayer({
        source: new XYZ({
          url: `https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/open/hybrid/detail/static/tile/{z}/{y}/{x}?token=${token}`,
          attributions: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
          tileSize: 512,
        }),
      });

      tileLayerGroup = new LayerGroup({
        layers: [satellite, labels],
      });

      map.addLayer(tileLayerGroup);
    }

    addTileLayers();

    return () => {
      isMounted = false;
      if (map && tileLayerGroup) {
        map.removeLayer(tileLayerGroup);
      }
    };
  }, [map, isReady, token]);

  // Mount Samal Island vector features with zoom-dependent LOD and red selection
  useEffect(() => {
    if (!map || !isReady) return;

    let isMounted = true;
    let vectorLayer: any = null;

    async function addVectorLayer() {
      const [
        { default: VectorLayer },
        { default: VectorSource },
        { default: Feature },
        { default: Polygon },
        { fromLonLat },
        { Style, Fill, Stroke },
      ] = await Promise.all([
        import('ol/layer/Vector'),
        import('ol/source/Vector'),
        import('ol/Feature'),
        import('ol/geom/Polygon'),
        import('ol/proj'),
        import('ol/style'),
      ]);

      if (!isMounted || !map) return;

      // Subdivision boundary feature (LOD 1)
      const boundaryRing = SAMAL_SUBDIVISION.boundaryLonLat.map((coord) =>
        fromLonLat(coord)
      );
      const boundaryFeature = new Feature({
        geometry: new Polygon([boundaryRing]),
        type: 'subdivision-boundary',
        id: SAMAL_SUBDIVISION.id,
        name: SAMAL_SUBDIVISION.name,
      });

      // House lot features (LOD 2)
      const lotFeatures = SAMAL_SUBDIVISION.lots.map((lot) => {
        const ring = lot.polygonLonLat.map((coord) => fromLonLat(coord));
        return new Feature({
          geometry: new Polygon([ring]),
          type: 'house-lot',
          id: lot.id,
          name: lot.name,
          lotNumber: lot.lotNumber,
          blockNumber: lot.blockNumber,
        });
      });

      const source = new VectorSource({
        features: [boundaryFeature, ...lotFeatures],
      });

      // Style function dynamically switches between boundary and houses
      const styleFunction = (feature: any) => {
        const type = feature.get('type');
        const viewZoom = map.getView().getZoom() ?? initialZoom;

        if (viewZoom < SAMAL_SUBDIVISION.zoomThreshold) {
          if (type === 'subdivision-boundary') {
            return new Style({
              stroke: new Stroke({
                color: '#38bdf8',
                width: 2,
                lineDash: [6, 6],
              }),
              fill: new Fill({
                color: 'rgba(2, 132, 199, 0.25)',
              }),
            });
          }
          // Hide house lots when zoomed out
          return undefined;
        }

        // When zoomed in, hide the boundary and render house lots
        if (type === 'subdivision-boundary') {
          return undefined;
        }

        const isSelected = activeLotId === feature.get('id');
        return new Style({
          fill: new Fill({
            color: isSelected
              ? 'rgba(239, 68, 68, 0.75)'
              : 'rgba(34, 197, 94, 0.45)',
          }),
          stroke: new Stroke({
            color: isSelected ? '#dc2626' : '#16a34a',
            width: isSelected ? 3 : 1.5,
          }),
        });
      };

      vectorLayer = new VectorLayer({
        source,
        style: styleFunction,
        zIndex: 10,
      });

      map.addLayer(vectorLayer);
    }

    addVectorLayer();

    return () => {
      isMounted = false;
      if (map && vectorLayer) {
        map.removeLayer(vectorLayer);
      }
    };
  }, [map, isReady, initialZoom, activeLotId]);

  // Click interaction to select a house lot and turn it red
  useEffect(() => {
    if (!map) return;

    const handleClick = (event: any) => {
      let clickedLotId: string | null = null;

      map.forEachFeatureAtPixel(event.pixel, (feature: any) => {
        if (feature.get('type') === 'house-lot') {
          clickedLotId = feature.get('id');
          return true; // stop search
        }
      });

      const nextId = activeLotId === clickedLotId ? null : clickedLotId;
      setActiveLotId(nextId);
      onSelectLot?.(nextId);
    };

    const handlePointerMove = (event: any) => {
      const hit = map.forEachFeatureAtPixel(event.pixel, (feature: any) => {
        return feature.get('type') === 'house-lot';
      });
      const target = map.getTargetElement();
      if (target) {
        target.style.cursor = hit ? 'pointer' : '';
      }
    };

    map.on('click', handleClick);
    map.on('pointermove', handlePointerMove);

    return () => {
      map.un('click', handleClick);
      map.un('pointermove', handlePointerMove);
    };
  }, [map, activeLotId, onSelectLot]);

  return (
    <div
      className={cn(
        'relative flex flex-1 h-full min-h-0 w-full flex-col overflow-hidden bg-[#0b1120]',
        className
      )}
      data-site-id={site.site_id}
      data-engine="openlayers"
    >
      {/* OpenLayers map viewport canvas */}
      <div ref={containerRef} className="h-full w-full z-0" />

      {/* Floating zoom controls (top-right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 shadow-md">
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
        <span className="font-semibold text-primary">OpenLayers (Canvas)</span>
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
              Connecting to ArcGIS (OpenLayers)...
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
