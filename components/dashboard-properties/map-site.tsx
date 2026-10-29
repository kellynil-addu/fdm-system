'use client';

import { useEffect, useRef, useState, useTransition, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, Loader2, AlertTriangle, RefreshCw, Globe, Layers } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getArcGISHybridStyle } from '@/lib/actions/arcgis';
import { useMapLibreMap } from '@/lib/hooks/use-maplibre-map';
import { parseRing, ringBounds, ringCentroid, pointInPolygon, isPolygonContained, type Ring } from '@/lib/geometry';
import type { PropertyLotWithClient, PropertyStatus, Site, SiteWithLots, DraftLot, PendingBoundaryUpdate } from '@/lib/types/property';
import type {
  ErrorEvent as MapLibreErrorEvent,
  GeoJSONSource,
  StyleSpecification,
  LayerSpecification,
  ExpressionSpecification,
} from 'maplibre-gl';
import { cn } from '@/lib/utils';
import { MapSitePopup, type LotPlotProperties } from '@/components/dashboard-properties/map-site-popup';
import { MapSiteEditorPopup } from '@/components/dashboard-properties/map-site-editor-popup';
import 'maplibre-gl/dist/maplibre-gl.css';

function notifyWarning(message: string) {
  if (typeof window !== 'undefined') {
    void import('sonner').then(({ toast }) => toast.warning(message));
  }
}

export interface SiteMapProps {
  site?: SiteWithLots;
  sites?: (SiteWithLots | Site)[];
  selectedLotId?: string | null;
  onSelectLot?: (lotId: string | null) => void;
  hoveredLotKey?: string | null;
  onSelectLotProperty?: (lot: PropertyLotWithClient) => void;
  onSelectUnregistered?: (data: {
    siteId: string;
    block: number;
    lot: number;
    areaSize?: number;
    pricePerSqm?: number;
  }) => void;
  isSidebarOpen?: boolean;
  className?: string;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  isEditorMode?: boolean;
  isPlotting?: boolean;
  draftPoints?: [number, number][];
  onAddDraftPoint?: (point: [number, number]) => void;
  onDeletePlot?: (plot: { subdivisionId?: string; siteId: string; siteName: string; block: number; lot: number; status: string }) => void;
  onEditBoundary?: (plot: LotPlotProperties) => void;
  focusedSiteId?: string | null;
  preview?: boolean;
  activeSiteRing?: Ring | null;
  draftLots?: DraftLot[];
  pendingBoundaryUpdates?: PendingBoundaryUpdate[];
  onUpdateDraftPoints?: (points: [number, number][]) => void;
  isAdjustingVertices?: boolean;
}

const SIDEBAR_WIDTH = 460;
const REGIONAL_CENTER: [number, number] = [125.7150395, 7.0445282];
const REGIONAL_ZOOM = 11.8;
const DETAILS_ZOOM = 14;

const SAMAL_ISLAND_BOUNDS: [[number, number], [number, number]] = [
  [125.2301694, 6.5481584],
  [126.2301694, 7.5481584],
];
const MIN_ZOOM = 9;

const STATUS_COLOR_MAP: Record<string, string> = {
  Open: '#22C55E',
  Reserved: '#5BC4E7',
  Sold: '#F5CE42',
  Forfeited: '#8B5CF6',
  Closed: '#6C7E8E',
  Available: '#6C7E8E',
  Unregistered: '#6C7E8E',
  Draft: '#0284c7',
};

// Neutral lot palette for editor mode (status colors hidden while editing geometry)
const EDITOR_LOT_COLORS = {
  fill: '#ffffff',
  stroke: '#ffffff',
  unsavedFill: '#0284c7',
  unsavedStroke: '#38bdf8',
  archivedStroke: '#d97706',
  selectedStroke: '#ffffff',
} as const;

type Expr = ExpressionSpecification;

function isActiveLotExpr(activeLotId: string | null): Expr {
  const key = activeLotId || '__NONE__';
  return ['any', ['==', ['get', 'id'], key], ['==', ['get', 'propertyId'], key]];
}

function buildLotFillColor(isEditorMode: boolean): Expr {
  if (isEditorMode) {
    return ['case', ['boolean', ['get', 'hasUnsavedChange'], false], EDITOR_LOT_COLORS.unsavedFill, EDITOR_LOT_COLORS.fill];
  }
  return [
    'match',
    ['get', 'status'],
    'Open',
    STATUS_COLOR_MAP.Open,
    'Reserved',
    STATUS_COLOR_MAP.Reserved,
    'Sold',
    STATUS_COLOR_MAP.Sold,
    'Forfeited',
    STATUS_COLOR_MAP.Forfeited,
    STATUS_COLOR_MAP.Available,
  ];
}

function buildLotFillOpacity(activeLotId: string | null, isEditorMode: boolean): Expr {
  if (isEditorMode) {
    return [
      'case',
      ['boolean', ['get', 'isSiteArchived'], false],
      0.06,
      isActiveLotExpr(activeLotId),
      0.3,
      ['boolean', ['get', 'hasUnsavedChange'], false],
      0.3,
      0.1,
    ];
  }
  return [
    'case',
    ['boolean', ['get', 'isSiteArchived'], false],
    0.25,
    [
      'case',
      isActiveLotExpr(activeLotId),
      0.85,
      ['any', ['==', ['get', 'status'], 'Closed'], ['==', ['get', 'status'], 'Available'], ['==', ['get', 'status'], 'Unregistered']],
      0.35,
      0.75,
    ],
  ];
}

function buildLotStrokeColor(activeLotId: string | null, isEditorMode: boolean): Expr {
  if (isEditorMode) {
    return [
      'case',
      isActiveLotExpr(activeLotId),
      EDITOR_LOT_COLORS.selectedStroke,
      ['boolean', ['get', 'hasUnsavedChange'], false],
      EDITOR_LOT_COLORS.unsavedStroke,
      ['boolean', ['get', 'isSiteArchived'], false],
      EDITOR_LOT_COLORS.archivedStroke,
      EDITOR_LOT_COLORS.stroke,
    ];
  }
  return [
    'case',
    isActiveLotExpr(activeLotId),
    '#ef4444',
    ['case', ['boolean', ['get', 'isSiteArchived'], false], '#d97706', '#ffffff'],
  ];
}

function buildLotStrokeWidth(activeLotId: string | null, isEditorMode: boolean): Expr {
  if (isEditorMode) {
    return [
      'case',
      isActiveLotExpr(activeLotId),
      3.5,
      ['boolean', ['get', 'hasUnsavedChange'], false],
      2.5,
      1.5,
    ];
  }
  return ['case', isActiveLotExpr(activeLotId), 3.5, 1.5];
}

// Scale numeric and interpolated text-size expressions for basemap labels
function scaleTextSize(expr: unknown, factor: number = 1.28): unknown {
  if (typeof expr === 'number') {
    return expr > 0 ? Math.round(expr * factor * 10) / 10 : expr;
  }
  if (Array.isArray(expr)) {
    if (expr[0] === 'interpolate') {
      const res = [...expr];
      for (let i = 4; i < res.length; i += 2) {
        if (typeof res[i] === 'number' && res[i] > 0) {
          res[i] = Math.round(res[i] * factor * 10) / 10;
        }
      }
      return res;
    }
    if (expr[0] === 'step') {
      const res = [...expr];
      if (typeof res[2] === 'number' && res[2] > 0) {
        res[2] = Math.round(res[2] * factor * 10) / 10;
      }
      for (let i = 4; i < res.length; i += 2) {
        if (typeof res[i] === 'number' && res[i] > 0) {
          res[i] = Math.round(res[i] * factor * 10) / 10;
        }
      }
      return res;
    }
  }
  if (expr && typeof expr === 'object' && 'stops' in (expr as Record<string, unknown>)) {
    const stopsObj = expr as { stops: [number, number][] };
    return {
      ...stopsObj,
      stops: stopsObj.stops.map(([z, s]) => [z, Math.round(s * factor * 10) / 10]),
    };
  }
  return expr;
}

// Transform basemap style layers to enlarge street and place labels
function scaleBasemapSymbolText(style: StyleSpecification | unknown, factor: number = 1.28): StyleSpecification {
  const spec = style as StyleSpecification;
  if (!spec || !Array.isArray(spec.layers)) return spec;
  const layers = spec.layers.map((layer) => {
    if (layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout) {
      const currentSize = (layer.layout as Record<string, unknown>)['text-size'] ?? 12;
      return {
        ...layer,
        layout: {
          ...layer.layout,
          'text-size': scaleTextSize(currentSize, factor),
        },
      } as LayerSpecification;
    }
    return layer;
  });
  return { ...spec, layers };
}

const SATELLITE_BACKGROUND_COLOR = '#0b1120';
const NORMAL_BACKGROUND_COLOR = '#f8f4f0';

// Ensure satellite basemap style has a dark blue background layer while tiles load
function withSatelliteBackground(style: StyleSpecification): StyleSpecification {
  if (!style || !Array.isArray(style.layers)) return style;
  const backgroundLayer: LayerSpecification = {
    id: 'background',
    type: 'background',
    paint: { 'background-color': SATELLITE_BACKGROUND_COLOR },
  };
  const nonBackgroundLayers = style.layers.filter((layer) => layer.type !== 'background');
  return {
    ...style,
    layers: [backgroundLayer, ...nonBackgroundLayers],
  };
}

const SATELLITE_FALLBACK_STYLE = {
  version: 8,
  glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
  sources: {
    'versatiles-satellite': {
      type: 'raster',
      tiles: ['https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; VersaTiles &copy; MapTiler &copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': SATELLITE_BACKGROUND_COLOR },
    },
    {
      id: 'versatiles-satellite-layer',
      type: 'raster',
      source: 'versatiles-satellite',
    },
  ],
};

let cachedScaledNormalStyle: StyleSpecification | null = null;
let cachedScaledArcgisStyle: StyleSpecification | null = null;
let cachedArcgisToken: string | null = null;

export function SiteMap({
  site,
  sites = [],
  selectedLotId,
  onSelectLot,
  hoveredLotKey,
  onSelectLotProperty,
  onSelectUnregistered,
  isSidebarOpen = true,
  className,
  initialCenter = REGIONAL_CENTER,
  initialZoom = REGIONAL_ZOOM,
  isEditorMode = false,
  isPlotting = false,
  draftPoints = [],
  onAddDraftPoint,
  onDeletePlot,
  onEditBoundary,
  focusedSiteId,
  preview = false,
  activeSiteRing,
  draftLots = [],
  pendingBoundaryUpdates = [],
  onUpdateDraftPoints,
  isAdjustingVertices = false,
}: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoveredLotKeyRef = useRef<string | null>(hoveredLotKey ?? null);
  hoveredLotKeyRef.current = hoveredLotKey ?? null;
  const onSelectLotPropertyRef = useRef(onSelectLotProperty);
  onSelectLotPropertyRef.current = onSelectLotProperty;
  const onSelectUnregisteredRef = useRef(onSelectUnregistered);
  onSelectUnregisteredRef.current = onSelectUnregistered;
  const isPlottingRef = useRef(isPlotting);
  isPlottingRef.current = isPlotting;
  const onAddDraftPointRef = useRef(onAddDraftPoint);
  onAddDraftPointRef.current = onAddDraftPoint;
  const onDeletePlotRef = useRef(onDeletePlot);
  onDeletePlotRef.current = onDeletePlot;
  const onEditBoundaryRef = useRef(onEditBoundary);
  onEditBoundaryRef.current = onEditBoundary;
  const isEditorModeRef = useRef(isEditorMode);
  isEditorModeRef.current = isEditorMode;
  const activeSiteRingRef = useRef(activeSiteRing);
  activeSiteRingRef.current = activeSiteRing;
  const draftPointsRef = useRef(draftPoints);
  draftPointsRef.current = draftPoints;
  const onUpdateDraftPointsRef = useRef(onUpdateDraftPoints);
  onUpdateDraftPointsRef.current = onUpdateDraftPoints;
  const [token, setToken] = useState<string | null>(() => cachedArcgisToken);
  const [mapMode, setMapMode] = useState<'satellite' | 'normal'>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('fdm_map_mode');
      if (saved === 'satellite' || saved === 'normal') return saved;
    }
    return 'satellite';
  });
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [isCheckingArcGIS, setIsCheckingArcGIS] = useState<boolean>(() => !cachedArcgisToken);
  const [styleRevision, setStyleRevision] = useState(0);
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const [activeLotId, setActiveLotId] = useState<string | null>(selectedLotId ?? null);
  const activeLotIdRef = useRef<string | null>(activeLotId);
  activeLotIdRef.current = activeLotId;
  const [selectedPlot, setSelectedPlot] = useState<LotPlotProperties | null>(null);
  const popupRef = useRef<import('maplibre-gl').Popup | null>(null);
  const popupContainerRef = useRef<HTMLDivElement | null>(null);
  const currentAppliedStyleKeyRef = useRef<string | null>(null);
  const isSettingStyleRef = useRef<boolean>(false);
  const pendingTargetStyleKeyRef = useRef<string | null>(null);

  if (!popupContainerRef.current && typeof document !== 'undefined' && typeof document.createElement === 'function') {
    popupContainerRef.current = document.createElement('div');
  }

  const [isPending, startTransition] = useTransition();

  const { map, isReady, zoomIn, zoomOut } = useMapLibreMap(containerRef, {
    center: initialCenter,
    zoom: initialZoom,
    padding: { top: 0, bottom: 0, left: isSidebarOpen ? SIDEBAR_WIDTH : 0, right: 0 },
    backgroundColor: mapMode === 'satellite' ? SATELLITE_BACKGROUND_COLOR : NORMAL_BACKGROUND_COLOR,
    maxBounds: SAMAL_ISLAND_BOUNDS,
    minZoom: MIN_ZOOM,
  });

  // Track style reload events to mount custom property layers on top
  useEffect(() => {
    if (!map) return;
    const handleStyleLoad = () => {
      isSettingStyleRef.current = false;
      setStyleRevision((prev) => prev + 1);
    };
    map.on('style.load', handleStyleLoad);
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map]);

  // Toggle basemap view mode and persist preference
  const toggleMapMode = useCallback(() => {
    setMapMode((prev) => {
      const next = prev === 'satellite' ? 'normal' : 'satellite';
      if (typeof window !== 'undefined') {
        localStorage.setItem('fdm_map_mode', next);
      }
      return next;
    });
  }, []);

  // Sync selected lot state from props
  useEffect(() => {
    if (selectedLotId !== undefined) {
      setActiveLotId(selectedLotId);
      if (!selectedLotId) {
        popupRef.current?.remove();
        setSelectedPlot(null);
      }
    }
  }, [selectedLotId]);

  // Request token and hybrid style from ArcGIS with fallback
  const fetchToken = useCallback(() => {
    startTransition(async () => {
      setIsCheckingArcGIS(true);
      try {
        const { style, token: receivedToken } = await getArcGISHybridStyle();
        setToken(receivedToken);
        cachedScaledArcgisStyle = withSatelliteBackground(scaleBasemapSymbolText(style, 1.28));
        cachedArcgisToken = receivedToken;
        setIsFallbackActive(false);
      } catch {
        setIsFallbackActive(true);
      } finally {
        setIsCheckingArcGIS(false);
      }
    });
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Animate map padding when sidebar opens or closes
  useEffect(() => {
    if (!map) return;
    const paddingLeft = isSidebarOpen && !isEditorMode ? SIDEBAR_WIDTH : 0;
    map.easeTo({
      padding: { top: 0, bottom: 0, left: paddingLeft, right: 0 },
      duration: 350,
    });
  }, [map, isSidebarOpen, isEditorMode]);

  // Track zoom level changes
  useEffect(() => {
    if (!map) return;
    const handleZoom = () => setCurrentZoom(map.getZoom());
    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

  // Combined site collection
  const allSites = useMemo(() => {
    if (sites.length > 0) return sites;
    if (site) return [site];
    return [];
  }, [sites, site]);

  // Map of registered property lots indexed by id and block-lot key
  const registeredLotsMap = useMemo(() => {
    const map = new Map<string, PropertyLotWithClient>();
    allSites.forEach((s) => {
      if ('lots' in s && Array.isArray(s.lots)) {
        s.lots.forEach((l) => {
          if (l.property_id) map.set(l.property_id, l);
          map.set(`${s.site_id}:${l.block_number}-${l.lot_number}`, l);
          map.set(`${l.block_number}-${l.lot_number}`, l);
        });
      }
    });
    return map;
  }, [allSites]);
  const registeredLotsMapRef = useRef(registeredLotsMap);
  registeredLotsMapRef.current = registeredLotsMap;

  // Close the active plot popup and clear selection
  const handleClosePopup = useCallback(() => {
    popupRef.current?.remove();
    setActiveLotId(null);
    setSelectedPlot(null);
    onSelectLot?.(null);
  }, [onSelectLot]);

  // Close any open lot popup when switching between view and editor modes
  const isFirstModeSwitchRef = useRef(true);
  useEffect(() => {
    if (isFirstModeSwitchRef.current) {
      isFirstModeSwitchRef.current = false;
      return;
    }
    handleClosePopup();
  }, [isEditorMode, handleClosePopup]);

  // Navigate to property details for registered or closed lots
  const handleViewDetails = useCallback(
    (p: LotPlotProperties) => {
      handleClosePopup();
      const lotObj =
        (p.propertyId ? registeredLotsMapRef.current.get(p.propertyId) : undefined) ??
        (p.siteId
          ? registeredLotsMapRef.current.get(`${p.siteId}:${p.block}-${p.lot}`)
          : registeredLotsMapRef.current.get(`${p.block}-${p.lot}`)) ??
        ({
          property_id: p.propertyId,
          site_id: p.siteId,
          block_number: p.block,
          lot_number: p.lot,
          location: p.siteName,
          area_size: p.areaSize,
          price_per_sqm: p.pricePerSqm,
          status: (p.isRegistered ? p.status : 'Open') as PropertyStatus,
          boundary: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_archived: false,
          archived_at: null,
          client: p.clientName ? { client_id: p.clientId || '', full_name: p.clientName, status: 'Active', address: null } : null,
        } as PropertyLotWithClient);
      onSelectLotPropertyRef.current?.(lotObj);
    },
    [handleClosePopup]
  );

  // Trigger registration flow for unregistered lots
  const handleRegisterLot = useCallback(
    (p: LotPlotProperties) => {
      handleClosePopup();
      onSelectUnregisteredRef.current?.({
        siteId: p.siteId,
        block: p.block,
        lot: p.lot,
        areaSize: p.areaSize > 0 ? p.areaSize : undefined,
        pricePerSqm: p.pricePerSqm > 0 ? p.pricePerSqm : undefined,
      });
    },
    [handleClosePopup]
  );

  // Delete plot from subdivision
  const handleDeletePlot = useCallback(
    (p: LotPlotProperties) => {
      handleClosePopup();
      onDeletePlotRef.current?.({
        subdivisionId: p.id,
        siteId: p.siteId,
        siteName: p.siteName,
        block: p.block,
        lot: p.lot,
        status: p.status,
      });
    },
    [handleClosePopup]
  );

  // Focus view on an individual site boundary
  const focusSite = useCallback(
    (targetSite: Site) => {
      if (!map) return;
      const ring = parseRing(targetSite.boundary);
      if (!ring) return;
      const b = ringBounds(ring);
      map.fitBounds(
        [
          [b.minX, b.minY],
          [b.maxX, b.maxY],
        ],
        {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 17.5,
          duration: preview ? 0 : 900,
        }
      );
    },
    [map, preview]
  );

  // Filter visible sites on map canvas (archived sites only visible in editor mode)
  const activeVisibleSites = useMemo(() => {
    return isEditorMode ? allSites : allSites.filter((s) => !s.is_archived);
  }, [allSites, isEditorMode]);

  // Focus view when focusedSiteId changes, or zoom out to regional overview when cleared
  const isFirstFocusMountRef = useRef(true);
  useEffect(() => {
    if (!map) return;
    if (isFirstFocusMountRef.current) {
      isFirstFocusMountRef.current = false;
      if (!focusedSiteId) return;
    }
    if (!focusedSiteId) {
      map.flyTo({
        center: REGIONAL_CENTER,
        zoom: REGIONAL_ZOOM,
        duration: preview ? 0 : 900,
        essential: true,
      });
      return;
    }
    const targetSite = allSites.find((s) => s.site_id === focusedSiteId);
    if (targetSite) focusSite(targetSite);
  }, [map, focusedSiteId, allSites, focusSite, preview]);

  // Dynamic GeoJSON for plotted draft points, connecting lines, and polygon fill
  const draftGeoJson = useMemo(() => {
    const pts = draftPoints ?? [];
    const features: GeoJSON.Feature[] = [];

    const isContained = activeSiteRing && pts.length > 0 ? isPolygonContained(pts, activeSiteRing) : true;
    const hasError = !isContained;

    pts.forEach((p, idx) => {
      const isOutOfBounds = activeSiteRing ? !pointInPolygon(p, activeSiteRing) : false;
      features.push({
        type: 'Feature',
        properties: {
          isFirst: idx === 0,
          index: idx + 1,
          isOutOfBounds,
          isAdjusting: isAdjustingVertices,
        },
        geometry: { type: 'Point', coordinates: p },
      });
    });

    if (pts.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { type: 'line', hasError },
        geometry: { type: 'LineString', coordinates: pts },
      });
    }

    if (pts.length >= 3) {
      features.push({
        type: 'Feature',
        properties: { type: 'polygon', hasError },
        geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] },
      });
    }

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [draftPoints, activeSiteRing, isAdjustingVertices]);

  // Set map crosshair cursor when plotting
  useEffect(() => {
    if (!map) return;
    map.getCanvas().style.cursor = isPlotting ? 'crosshair' : '';
  }, [map, isPlotting]);

  // GeoJSON features for all site boundaries
  const sitesGeoJson = useMemo(() => {
    const features = activeVisibleSites
      .map((s) => {
        const ring = parseRing(s.boundary);
        if (!ring) return null;
        return {
          type: 'Feature' as const,
          properties: {
            siteId: s.site_id,
            name: s.name,
            isSiteArchived: Boolean(s.is_archived),
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[...ring, ring[0]] as [number, number][]],
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [activeVisibleSites]);

  // GeoJSON features for all subdivisions across visible sites
  const lotsGeoJson = useMemo(() => {
    const pendingUpdatesMap = new Map(pendingBoundaryUpdates.map((u) => [u.subdivisionId, u]));

    const features = activeVisibleSites
      .flatMap((s) => {
        const siteLots = 'lots' in s && Array.isArray(s.lots) ? s.lots : [];
        const siteSubs = 'subdivisions' in s && Array.isArray(s.subdivisions) ? s.subdivisions : [];
        const lotMap = new Map(siteLots.map((l) => [`${l.block_number}-${l.lot_number}`, l]));

        const subFeatures = siteSubs.map((sub) => {
          const pendingUpdate = pendingUpdatesMap.get(sub.subdivision_id);
          const rawBoundary = pendingUpdate ? pendingUpdate.boundary : sub.boundary;
          const ring = parseRing(rawBoundary);
          if (!ring) return null;
          const b = ringBounds(ring);
          const centerLng = (b.minX + b.maxX) / 2;
          const centerLat = (b.minY + b.maxY) / 2;
          const topLat = b.maxY;
          const lotKey = `${sub.block_number}-${sub.lot_number}`;
          const siteLotKey = `${s.site_id}:${sub.block_number}-${sub.lot_number}`;
          const lot = lotMap.get(lotKey);
          const isRegistered = Boolean(lot);
          const status = lot?.status ?? 'Closed';
          const areaSize = pendingUpdate ? pendingUpdate.areaSize : (lot?.area_size ?? 0);
          const pricePerSqm = lot?.price_per_sqm ?? 0;

          return {
            type: 'Feature' as const,
            properties: {
              id: sub.subdivision_id,
              lotKey,
              siteLotKey,
              propertyId: lot?.property_id ?? '',
              siteId: s.site_id,
              siteName: s.name,
              isSiteArchived: Boolean(s.is_archived),
              block: sub.block_number,
              lot: sub.lot_number,
              name: `Block ${sub.block_number} Lot ${sub.lot_number}`,
              status,
              isRegistered,
              hasUnsavedChange: Boolean(pendingUpdate),
              areaSize,
              pricePerSqm,
              totalPrice: areaSize * pricePerSqm,
              clientName: lot?.client?.full_name ?? '',
              clientId: lot?.client?.client_id ?? '',
              titleNumber: lot?.title_number ?? '',
              forfeitedAt: lot?.forfeited_account?.forfeited_at ?? '',
              centerLng,
              centerLat,
              topLat,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[...ring, ring[0]] as [number, number][]],
            },
          };
        });

        // If in editor mode, also render confirmed draft lots
        const siteDraftLots = isEditorMode
          ? draftLots.filter(
              (d) =>
                d.siteId === s.site_id &&
                d.block &&
                d.lot &&
                Array.isArray(d.boundary) &&
                d.boundary.length >= 3
            )
          : [];

        const draftFeatures = siteDraftLots.map((d) => {
          const ring = parseRing(d.boundary);
          if (!ring) return null;
          const b = ringBounds(ring);
          const centerLng = (b.minX + b.maxX) / 2;
          const centerLat = (b.minY + b.maxY) / 2;
          const topLat = b.maxY;
          const lotKey = `${d.block}-${d.lot}`;
          const siteLotKey = `${s.site_id}:${d.block}-${d.lot}`;

          return {
            type: 'Feature' as const,
            properties: {
              id: d.draftId,
              lotKey,
              siteLotKey,
              propertyId: '',
              siteId: s.site_id,
              siteName: s.name,
              isSiteArchived: false,
              block: d.block!,
              lot: d.lot!,
              name: `Block ${d.block} Lot ${d.lot} (Draft)`,
              status: 'Draft',
              isRegistered: false,
              hasUnsavedChange: true,
              areaSize: d.areaSize,
              pricePerSqm: 6500,
              totalPrice: d.areaSize * 6500,
              clientName: '',
              clientId: '',
              titleNumber: '',
              forfeitedAt: '',
              centerLng,
              centerLat,
              topLat,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[...ring, ring[0]] as [number, number][]],
            },
          };
        });

        return [...subFeatures, ...draftFeatures];
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [activeVisibleSites, pendingBoundaryUpdates, draftLots, isEditorMode]);

  // Focus and fly to the selected property on map viewport
  const prevSelectedLotIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!map || !isReady || !selectedLotId || selectedLotId === prevSelectedLotIdRef.current) {
      prevSelectedLotIdRef.current = selectedLotId ?? null;
      return;
    }
    prevSelectedLotIdRef.current = selectedLotId;

    const feat = lotsGeoJson.features.find(
      (f) => f.properties.propertyId === selectedLotId || f.properties.id === selectedLotId
    );
    if (!feat) return;

    const { centerLng, centerLat } = feat.properties;
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(currentZoom, 17.5);

    map.flyTo({
      center: [centerLng, centerLat],
      zoom: targetZoom,
      duration: currentZoom < DETAILS_ZOOM ? 1200 : 600,
      essential: true,
    });
  }, [map, isReady, selectedLotId, lotsGeoJson]);

  // Mount site boundaries and house lot vector layers
  useEffect(() => {
    if (!map || !isReady) return;

    try {
      if (!map.getStyle()) return;

      // Site boundary sources and layers
    if (!map.getSource('sites-data')) {
      map.addSource('sites-data', {
        type: 'geojson',
        data: sitesGeoJson,
      });

      map.addLayer({
        id: 'sites-boundary-fill',
        type: 'fill',
        source: 'sites-data',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'isSiteArchived'], false],
            '#f59e0b',
            '#0284c7',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'isSiteArchived'], false],
            0.08,
            0.15,
          ],
        },
      });

      map.addLayer({
        id: 'sites-boundary-stroke',
        type: 'line',
        source: 'sites-data',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'isSiteArchived'], false],
            '#d97706',
            '#38bdf8',
          ],
          'line-width': 2.5,
          'line-dasharray': [4, 2],
        },
      });
    } else {
      (map.getSource('sites-data') as GeoJSONSource).setData(sitesGeoJson);
    }

    // House subdivisions sources and layers
    if (!map.getSource('lots-data')) {
      map.addSource('lots-data', {
        type: 'geojson',
        data: lotsGeoJson,
      });

      map.addLayer({
        id: 'lots-fill',
        type: 'fill',
        source: 'lots-data',
        minzoom: DETAILS_ZOOM,
        paint: {
          'fill-color': buildLotFillColor(isEditorModeRef.current),
          'fill-opacity': buildLotFillOpacity(activeLotIdRef.current, isEditorModeRef.current),
        },
      });

      map.addLayer({
        id: 'lots-stroke',
        type: 'line',
        source: 'lots-data',
        minzoom: DETAILS_ZOOM,
        paint: {
          'line-color': buildLotStrokeColor(activeLotIdRef.current, isEditorModeRef.current),
          'line-width': buildLotStrokeWidth(activeLotIdRef.current, isEditorModeRef.current),
        },
      });

      map.addLayer({
        id: 'lots-hover-stroke',
        type: 'line',
        source: 'lots-data',
        minzoom: DETAILS_ZOOM,
        filter: [
          'any',
          ['==', ['get', 'lotKey'], hoveredLotKeyRef.current ?? ''],
          ['==', ['get', 'siteLotKey'], hoveredLotKeyRef.current ?? ''],
        ],
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 4.5,
        },
      });

      map.addLayer({
        id: 'lots-labels',
        type: 'symbol',
        source: 'lots-data',
        minzoom: 16.8,
        layout: {
          'text-field': ['concat', 'B', ['to-string', ['get', 'block']], '\nL', ['to-string', ['get', 'lot']]],
          'text-size': 11,
          'text-line-height': 1.15,
          'text-justify': 'center',
          'text-font': map.getStyle()?.glyphs?.includes('arcgis')
            ? ((map.getStyle()?.layers?.find((l) => 'layout' in l && l.layout && 'text-font' in l.layout)?.layout as Record<string, unknown> | undefined)?.['text-font'] as string[] ?? ['Arial Bold'])
            : ['noto_sans_bold'],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        },
      });
    } else {
      (map.getSource('lots-data') as GeoJSONSource).setData(lotsGeoJson);
    }

    // Draft plotting source and layers
    if (!map.getSource('draft-plot-data')) {
      map.addSource('draft-plot-data', {
        type: 'geojson',
        data: draftGeoJson,
      });

      map.addLayer({
        id: 'draft-fill',
        type: 'fill',
        source: 'draft-plot-data',
        filter: ['==', ['get', 'type'], 'polygon'],
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'hasError'], false],
            '#ef4444',
            '#0284c7',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'hasError'], false],
            0.4,
            0.25,
          ],
        },
      });

      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft-plot-data',
        filter: ['==', ['get', 'type'], 'line'],
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'hasError'], false],
            '#ef4444',
            '#38bdf8',
          ],
          'line-width': 2.5,
          'line-dasharray': [3, 2],
        },
      });

      map.addLayer({
        id: 'draft-vertices',
        type: 'circle',
        source: 'draft-plot-data',
        filter: ['has', 'index'],
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'isAdjusting'], false],
            8,
            ['case', ['get', 'isFirst'], 7, 5],
          ],
          'circle-color': [
            'case',
            ['boolean', ['get', 'isOutOfBounds'], false],
            '#ef4444',
            ['case', ['get', 'isFirst'], '#22c55e', '#38bdf8'],
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    } else {
      (map.getSource('draft-plot-data') as GeoJSONSource).setData(draftGeoJson);
    }
  } catch (err) {
    console.warn('Map style is reloading, layer mounting deferred:', err);
  }
}, [map, isReady, styleRevision, sitesGeoJson, lotsGeoJson, draftGeoJson]);

  // Vertex dragging interaction when isAdjustingVertices is active
  useEffect(() => {
    if (!map || !isReady || !isAdjustingVertices) return;

    let isDragging = false;
    let draggedIndex = -1;

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'grab';
    };

    const handleMouseLeave = () => {
      if (!isDragging) {
        map.getCanvas().style.cursor = '';
      }
    };

    const handleMouseDown = (e: import('maplibre-gl').MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat || feat.properties?.index === undefined) return;

      isDragging = true;
      draggedIndex = Number(feat.properties.index) - 1;
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
      e.preventDefault();
    };

    const handleMouseMove = (e: import('maplibre-gl').MapMouseEvent) => {
      if (!isDragging || draggedIndex < 0) return;
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      const currentPts = draftPointsRef.current ? [...draftPointsRef.current] : [];
      if (draggedIndex < currentPts.length) {
        currentPts[draggedIndex] = pt;
        onUpdateDraftPointsRef.current?.(currentPts);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        draggedIndex = -1;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
      }
    };

    map.on('mouseenter', 'draft-vertices', handleMouseEnter);
    map.on('mouseleave', 'draft-vertices', handleMouseLeave);
    map.on('mousedown', 'draft-vertices', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mouseenter', 'draft-vertices', handleMouseEnter);
      map.off('mouseleave', 'draft-vertices', handleMouseLeave);
      map.off('mousedown', 'draft-vertices', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.dragPan.enable();
    };
  }, [map, isReady, isAdjustingVertices]);

  // Update dynamic lot styles on selection change
  useEffect(() => {
    if (!map || !isReady) return;

    try {
      if (!map.getLayer('lots-fill') || !map.getLayer('lots-stroke')) return;

      map.setPaintProperty('lots-fill', 'fill-color', buildLotFillColor(isEditorMode));

      map.setPaintProperty('lots-fill', 'fill-opacity', buildLotFillOpacity(activeLotId, isEditorMode));

      map.setPaintProperty('lots-stroke', 'line-color', buildLotStrokeColor(activeLotId, isEditorMode));

      map.setPaintProperty('lots-stroke', 'line-width', buildLotStrokeWidth(activeLotId, isEditorMode));
    } catch {
      // Style is reloading; will be reapplied on style.load
    }
  }, [map, isReady, styleRevision, activeLotId, isEditorMode]);

  // Update hover outline filter
  useEffect(() => {
    if (!map || !isReady) return;
    try {
      if (!map.getLayer('lots-hover-stroke')) return;
      map.setFilter('lots-hover-stroke', [
        'any',
        ['==', ['get', 'lotKey'], hoveredLotKey ?? ''],
        ['==', ['get', 'siteLotKey'], hoveredLotKey ?? ''],
      ]);
    } catch {
      // Style is reloading; will be reapplied on style.load
    }
  }, [map, isReady, styleRevision, hoveredLotKey]);

  // Click & hover interactions for house lots
  useEffect(() => {
    if (!map || !isReady) return;

    let cleanupFn: (() => void) | null = null;

    async function setupLotInteractions() {
      if (!map) return;
      try {
        if (!map.getLayer('lots-fill')) return;
      } catch {
        return;
      }
      const { Popup } = await import('maplibre-gl');

      const popupInstance = new Popup({
        closeButton: true,
        closeOnClick: false,
        anchor: 'bottom',
        offset: [0, -6],
        className: 'maplibre-property-popup',
        maxWidth: '280px',
      });
      popupRef.current = popupInstance;

      let isSwitchingLot = false;

      popupInstance.on('close', () => {
        if (isSwitchingLot) return;
        setActiveLotId(null);
        setSelectedPlot(null);
        onSelectLot?.(null);
      });

      const handleMouseEnter = () => {
        if (isPlottingRef.current) return;
        map.getCanvas().style.cursor = 'pointer';
      };

      const handleMouseLeave = () => {
        if (isPlottingRef.current) return;
        map.getCanvas().style.cursor = '';
      };

      const handleClick = (e: import('maplibre-gl').MapLayerMouseEvent) => {
        if (isPlottingRef.current) {
          const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          if (activeSiteRingRef.current && !pointInPolygon(pt, activeSiteRingRef.current)) {
            notifyWarning('Plotted point must be inside the site boundary.');
            return;
          }
          onAddDraftPointRef.current?.(pt);
          return;
        }

        const feature = e.features?.[0];
        if (!feature) return;

        const p = feature.properties as LotPlotProperties;
        const lotId = p.id;
        const nextId = activeLotIdRef.current === lotId ? null : lotId;
        setActiveLotId(nextId);
        onSelectLot?.(nextId);

        if (!nextId) {
          popupInstance.remove();
          setSelectedPlot(null);
          return;
        }

        // Center map viewport on the selected lot
        map.easeTo({
          center: [p.centerLng, p.centerLat],
          duration: 450,
        });

        isSwitchingLot = true;
        setSelectedPlot(p);
        popupInstance.setLngLat([p.centerLng, p.topLat]);

        if (!popupInstance.isOpen()) {
          if (popupContainerRef.current) {
            popupInstance.setDOMContent(popupContainerRef.current);
          }
          popupInstance.addTo(map);
        } else if (
          popupContainerRef.current &&
          !popupInstance.getElement()?.contains(popupContainerRef.current)
        ) {
          popupInstance.setDOMContent(popupContainerRef.current);
        }
        isSwitchingLot = false;
      };

      // Close popup when clicking anywhere on the map outside lots
      const handleMapClick = (e: import('maplibre-gl').MapMouseEvent) => {
        if (isPlottingRef.current) {
          const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          if (activeSiteRingRef.current && !pointInPolygon(pt, activeSiteRingRef.current)) {
            notifyWarning('Plotted point must be inside the site boundary.');
            return;
          }
          onAddDraftPointRef.current?.(pt);
          return;
        }

        const features = map.queryRenderedFeatures(e.point, { layers: ['lots-fill'] });
        if (features.length === 0) {
          popupInstance.remove();
          setSelectedPlot(null);
          setActiveLotId(null);
        }
      };

      map.on('mouseenter', 'lots-fill', handleMouseEnter);
      map.on('mouseleave', 'lots-fill', handleMouseLeave);
      map.on('click', 'lots-fill', handleClick);
      map.on('click', handleMapClick);

      cleanupFn = () => {
        map.off('mouseenter', 'lots-fill', handleMouseEnter);
        map.off('mouseleave', 'lots-fill', handleMouseLeave);
        map.off('click', 'lots-fill', handleClick);
        map.off('click', handleMapClick);
      };
    }

    setupLotInteractions();

    return () => {
      cleanupFn?.();
      popupRef.current?.remove();
    };
  }, [map, isReady, styleRevision, onSelectLot]);

  // Mount site pin icons and labels at low zoom levels
  useEffect(() => {
    if (!map || !isReady) return;

    const markers: import('maplibre-gl').Marker[] = [];

    async function mountSitePins() {
      if (!map) return;
      const { Marker } = await import('maplibre-gl');

      activeVisibleSites.forEach((targetSite) => {
        const ring = parseRing(targetSite.boundary);
        if (!ring) return;
        const center = ringCentroid(ring);
        const isArchived = Boolean(targetSite.is_archived);

        // Marker element with SVG pin icon and title
        const el = document.createElement('div');
        el.className = 'group flex flex-col items-center cursor-pointer transition-transform hover:scale-110';
        el.setAttribute('role', 'button');
        el.tabIndex = 0;
        el.setAttribute('aria-label', `Focus map on ${targetSite.name}`);
        const isVisible = map.getZoom() < DETAILS_ZOOM;
        el.style.display = isVisible ? 'flex' : 'none';
        el.innerHTML = `
          <div class="flex h-9 w-9 items-center justify-center rounded-full ${isArchived ? 'bg-amber-600' : 'bg-primary'} text-white shadow-xl ring-2 ring-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="mt-1 rounded-md bg-card px-2 py-0.5 text-[11px] font-bold text-foreground shadow-md border border-border whitespace-nowrap">
            ${targetSite.name}${isArchived ? ' (Archived)' : ''}
          </div>
        `;

        el.addEventListener('click', () => {
          focusSite(targetSite);
        });
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            focusSite(targetSite);
          }
        });

        const marker = new Marker({ element: el }).setLngLat([center[0], center[1]]).addTo(map);
        markers.push(marker);
      });
    }

    mountSitePins();

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [map, isReady, activeVisibleSites, focusSite]);

  // Toggle marker pin visibility based on zoom threshold
  useEffect(() => {
    if (!map) return;
    const updatePinVisibility = () => {
      const isVisible = map.getZoom() < DETAILS_ZOOM;
      document.querySelectorAll('.group.flex.flex-col.items-center.cursor-pointer').forEach((el) => {
        (el as HTMLElement).style.display = isVisible ? 'flex' : 'none';
      });
    };

    map.on('zoom', updatePinVisibility);
    updatePinVisibility();

    return () => {
      map.off('zoom', updatePinVisibility);
    };
  }, [map]);

  // Synchronize basemap style based on mode, credentials and fallback status
  useEffect(() => {
    if (!map || !isReady) return;

    // In satellite mode, wait while the initial ArcGIS style check is in flight
    // so the map stays on its initial dark blue background instead of flashing fallback
    if (mapMode === 'satellite' && isCheckingArcGIS && !token && !isFallbackActive) {
      return;
    }

    const targetStyleKey =
      mapMode === 'normal'
        ? 'normal'
        : isFallbackActive || !token
          ? 'satellite-fallback'
          : `satellite-arcgis-${token}`;

    const hasExpectedBackground =
      mapMode !== 'satellite' || Boolean(map.getLayer('background'));

    if (currentAppliedStyleKeyRef.current === targetStyleKey && hasExpectedBackground) {
      return;
    }

    if (isSettingStyleRef.current) {
      pendingTargetStyleKeyRef.current = targetStyleKey;
      return;
    }

    let isCancelled = false;

    async function applyStyle() {
      if (!map) return;
      pendingTargetStyleKeyRef.current = null;

      try {
        if (targetStyleKey === 'normal') {
          if (!cachedScaledNormalStyle) {
            const res = await fetch('https://tiles.versatiles.org/assets/styles/colorful/style.json');
            if (!res.ok) throw new Error(`Failed to load normal style: ${res.status}`);
            const styleJson = await res.json();
            cachedScaledNormalStyle = scaleBasemapSymbolText(styleJson, 1.28);
          }
          if (isCancelled) return;
          isSettingStyleRef.current = true;
          currentAppliedStyleKeyRef.current = targetStyleKey;
          map.setStyle(cachedScaledNormalStyle, { diff: false });
        } else if (targetStyleKey.startsWith('satellite-arcgis-') && token) {
          if (!cachedScaledArcgisStyle || cachedArcgisToken !== token) {
            const { style, token: freshToken } = await getArcGISHybridStyle();
            cachedScaledArcgisStyle = withSatelliteBackground(scaleBasemapSymbolText(style, 1.28));
            cachedArcgisToken = freshToken;
          } else {
            cachedScaledArcgisStyle = withSatelliteBackground(cachedScaledArcgisStyle);
          }
          if (isCancelled) return;
          isSettingStyleRef.current = true;
          currentAppliedStyleKeyRef.current = targetStyleKey;
          map.setStyle(cachedScaledArcgisStyle, { diff: false });
        } else {
          if (isCancelled) return;
          isSettingStyleRef.current = true;
          currentAppliedStyleKeyRef.current = 'satellite-fallback';
          map.setStyle(SATELLITE_FALLBACK_STYLE as unknown as StyleSpecification, { diff: false });
        }
      } catch {
        if (isCancelled) return;
        setIsFallbackActive(true);
        isSettingStyleRef.current = true;
        currentAppliedStyleKeyRef.current = 'satellite-fallback';
        map.setStyle(SATELLITE_FALLBACK_STYLE as unknown as StyleSpecification, { diff: false });
      }
    }

    applyStyle();

    return () => {
      isCancelled = true;
    };
  }, [map, isReady, styleRevision, mapMode, isFallbackActive, isCheckingArcGIS, token]);

  // Handle tile loading errors by falling back to free alternative
  useEffect(() => {
    if (!map) return;
    const handleMapError = (ev: MapLibreErrorEvent) => {
      const err = ev as unknown as {
        sourceId?: string;
        error?: { status?: number; message?: string };
        status?: number;
      };
      const status = err.status ?? err.error?.status;
      const msg = err.error?.message?.toLowerCase() ?? '';

      if (
        mapMode === 'satellite' &&
        !isFallbackActive &&
        (status === 401 ||
          status === 403 ||
          status === 429 ||
          msg.includes('token') ||
          msg.includes('unauthorized') ||
          msg.includes('quota') ||
          msg.includes('forbidden'))
      ) {
        setIsFallbackActive(true);
      }
    };

    map.on('error', handleMapError);
    return () => {
      map.off('error', handleMapError);
    };
  }, [map, mapMode, isFallbackActive]);

  return (
    <div
      className={cn('relative flex flex-1 h-full min-h-0 w-full flex-col overflow-hidden bg-background', className)}
      data-engine="maplibre"
      style={mapMode === 'satellite' ? { backgroundColor: SATELLITE_BACKGROUND_COLOR } : undefined}
    >
      {/* MapLibre WebGL canvas */}
      <div
        ref={containerRef}
        className="flex-1 h-full w-full z-0"
        style={mapMode === 'satellite' ? { backgroundColor: SATELLITE_BACKGROUND_COLOR } : undefined}
      />

      {/* Floating map controls (top-right) */}
      {!preview && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 shadow-md">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleMapMode}
                    className={cn(
                      'h-8 w-8 bg-card text-foreground shadow-sm hover:bg-row-hover',
                      mapMode === 'normal' && 'border-primary text-primary'
                    )}
                    title={mapMode === 'satellite' ? 'Switch to Normal view' : 'Switch to Satellite view'}
                    aria-label={mapMode === 'satellite' ? 'Switch to Normal view' : 'Switch to Satellite view'}
                  >
                    {mapMode === 'satellite' ? (
                      <Globe className="h-4 w-4" />
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                  </Button>
                  {isFallbackActive && mapMode === 'satellite' && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-warning-foreground ring-1 ring-background shadow-xs pointer-events-none">
                      <AlertTriangle className="h-2 w-2" />
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="flex flex-col gap-1 max-w-xs text-xs">
                {isFallbackActive && mapMode === 'satellite' ? (
                  <>
                    <p className="font-semibold text-warning flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Fallback Satellite Active
                    </p>
                    <p className="text-muted-foreground text-[11px] leading-snug">
                      Using fallback satellite (lower quality &amp; outdated imagery).
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchToken();
                      }}
                      disabled={isCheckingArcGIS}
                      className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <RefreshCw className={cn('h-3 w-3', isCheckingArcGIS && 'animate-spin')} />
                      Retry ArcGIS Connection
                    </button>
                  </>
                ) : (
                  <p>
                    {mapMode === 'satellite'
                      ? 'Current: Satellite imagery. Click to switch to Normal view.'
                      : 'Current: Normal (OSM Vector). Click to switch to Satellite view.'}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            className="h-8 w-8 bg-card text-foreground shadow-sm hover:bg-row-hover"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            className="h-8 w-8 bg-card text-foreground shadow-sm hover:bg-row-hover"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Map status indicators (bottom-right) */}
      {!preview && (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
          <Badge variant="outline" shape="pill" className="bg-card font-mono shadow-md">
            {mapMode === 'satellite'
              ? isFallbackActive
                ? 'Satellite (Fallback)'
                : 'Satellite (ArcGIS)'
              : 'Normal (Vector)'}{' '}
            • Zoom: {currentZoom.toFixed(1)}x
          </Badge>
        </div>
      )}

      {/* Loading overlay while requesting ArcGIS token */}
      {isPending && !preview && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-lg">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>Connecting ArcGIS Satellite Imagery...</span>
        </div>
      )}

      {/* Interactive plot popup mounted inside MapLibre container */}
      {selectedPlot && popupContainerRef.current && createPortal(
        isEditorMode ? (
          <MapSiteEditorPopup
            plot={selectedPlot}
            onDeletePlot={() => handleDeletePlot(selectedPlot)}
            onEditBoundary={() => {
              handleClosePopup();
              onEditBoundaryRef.current?.(selectedPlot);
            }}
          />
        ) : (
          <MapSitePopup
            plot={selectedPlot}
            onViewDetails={() => handleViewDetails(selectedPlot)}
            onRegisterLot={() => handleRegisterLot(selectedPlot)}
          />
        ),
        popupContainerRef.current
      )}
    </div>
  );
}
