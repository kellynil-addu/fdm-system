'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function useStatusFilter<T extends string>(allowed: readonly T[], fallback: T) {
  const searchParams = useSearchParams();
  const searchParamsStatus = searchParams.get('status');

  const [status, setStatusState] = useState<T>(() => {
    return allowed.find((value) => value === searchParamsStatus) ?? fallback;
  });

  const lastUrlParamRef = useRef<string | null>(searchParamsStatus);
  const prevFallbackRef = useRef<T>(fallback);

  // Sync state if navigation changes searchParams externally
  useEffect(() => {
    const urlChanged = searchParamsStatus !== lastUrlParamRef.current;
    const fallbackChanged = fallback !== prevFallbackRef.current;
    prevFallbackRef.current = fallback;

    if (urlChanged || (fallbackChanged && lastUrlParamRef.current === null)) {
      lastUrlParamRef.current = searchParamsStatus;
      const matched = allowed.find((value) => value === searchParamsStatus) ?? fallback;
      setStatusState(matched);
    }
  }, [searchParamsStatus, allowed, fallback]);

  // Keep state in sync on browser back/forward navigation
  useEffect(() => {
    function handlePopState() {
      if (typeof window === 'undefined') return;
      const currentParam = new URLSearchParams(window.location.search).get('status');
      lastUrlParamRef.current = currentParam;
      const matched = allowed.find((value) => value === currentParam) ?? fallback;
      setStatusState(matched);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allowed, fallback]);

  const setStatus = useCallback(
    (value: T) => {
      setStatusState(value);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (value === fallback) {
          url.searchParams.delete('status');
          lastUrlParamRef.current = null;
        } else {
          url.searchParams.set('status', value);
          lastUrlParamRef.current = value;
        }
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    },
    [fallback]
  );

  return [status, setStatus] as const;
}
