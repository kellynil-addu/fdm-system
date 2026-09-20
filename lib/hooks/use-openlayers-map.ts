'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type OlMap from 'ol/Map';

export interface UseOpenLayersMapOptions {
  centerLonLat?: [number, number];
  zoom?: number;
  padding?: [number, number, number, number];
}

export function useOpenLayersMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseOpenLayersMapOptions = {}
) {
  const mapRef = useRef<OlMap | null>(null);
  const [mapInstance, setMapInstance] = useState<OlMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let isMounted = true;

    async function initMap() {
      // Dynamically load OpenLayers modules on client-side
      const [
        { default: Map },
        { default: View },
        { fromLonLat },
        { defaults: defaultControls },
      ] = await Promise.all([
        import('ol/Map'),
        import('ol/View'),
        import('ol/proj'),
        import('ol/control/defaults'),
      ]);

      if (!isMounted || !containerRef.current) return;

      const {
        centerLonLat = [125.668114, 7.1053089],
        zoom = 15,
        padding = [0, 0, 0, 0],
      } = optionsRef.current;

      const view = new View({
        center: fromLonLat(centerLonLat),
        zoom,
        maxZoom: 19,
        padding,
      });

      const map = new Map({
        target: containerRef.current,
        view,
        controls: defaultControls({
          zoom: false,
          rotate: false,
          attribution: false,
        }),
      });

      mapRef.current = map;
      setMapInstance(map);
      setIsReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
        setMapInstance(null);
        setIsReady(false);
      }
    };
  }, [containerRef]);

  // Adjust view padding for sidebar compensation
  const updatePadding = useCallback(
    (padding: [number, number, number, number]) => {
      if (!mapRef.current) return;
      const view = mapRef.current.getView();
      view.padding = padding;
      mapRef.current.updateSize();
    },
    []
  );

  const zoomIn = useCallback(() => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const current = view.getZoom();
    if (current !== undefined) {
      view.animate({ zoom: current + 1, duration: 250 });
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const current = view.getZoom();
    if (current !== undefined) {
      view.animate({ zoom: current - 1, duration: 250 });
    }
  }, []);

  return {
    map: mapInstance,
    isReady,
    zoomIn,
    zoomOut,
    updatePadding,
  };
}
