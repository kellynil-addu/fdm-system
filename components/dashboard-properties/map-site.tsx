'use client';

import { useState, useEffect } from 'react';
import { MapSiteLeaflet } from './map-site-leaflet';
import { MapSiteMapLibre } from './map-site-maplibre';
import type { SiteWithLots } from '@/lib/types/property';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';

export type MapEngine = 'leaflet' | 'maplibre';

export interface SiteMapProps {
  site: SiteWithLots;
  selectedLotId?: string | null;
  onSelectLot?: (lotId: string | null) => void;
  isSidebarOpen?: boolean;
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  defaultEngine?: MapEngine;
}

const STORAGE_KEY = 'fdm_preferred_map_engine';

export function SiteMap({
  site,
  selectedLotId,
  onSelectLot,
  isSidebarOpen = true,
  className,
  initialCenter = [7.1053089, 125.668114],
  initialZoom = 17,
  defaultEngine = 'maplibre',
}: SiteMapProps) {
  const [engine, setEngine] = useState<MapEngine>(defaultEngine);

  // Restore user engine preference from localStorage or URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEngine = params.get('engine') as MapEngine | null;
    if (urlEngine === 'leaflet' || urlEngine === 'maplibre') {
      setEngine(urlEngine);
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY) as MapEngine | null;
    if (saved === 'leaflet' || saved === 'maplibre') {
      setEngine(saved);
    }
  }, []);

  const switchEngine = (next: MapEngine) => {
    setEngine(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <div className={cn('relative flex flex-1 h-full min-h-0 w-full flex-col overflow-hidden', className)}>
      {/* Floating Frontend Engine Toggle */}
      <div className="absolute top-4 right-16 z-30 flex items-center gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-md backdrop-blur-xs">
        <Layers className="ml-1.5 h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block" />
        <button
          type="button"
          onClick={() => switchEngine('maplibre')}
          className={cn(
            'cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
            engine === 'maplibre'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          MapLibre GL (GPU)
        </button>
        <button
          type="button"
          onClick={() => switchEngine('leaflet')}
          className={cn(
            'cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
            engine === 'leaflet'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Leaflet
        </button>
      </div>

      {/* Render selected map engine */}
      {engine === 'maplibre' ? (
        <MapSiteMapLibre
          key="engine-maplibre"
          site={site}
          selectedLotId={selectedLotId}
          onSelectLot={onSelectLot}
          isSidebarOpen={isSidebarOpen}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
        />
      ) : (
        <MapSiteLeaflet
          key="engine-leaflet"
          site={site}
          selectedLotId={selectedLotId}
          onSelectLot={onSelectLot}
          isSidebarOpen={isSidebarOpen}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
        />
      )}
    </div>
  );
}
