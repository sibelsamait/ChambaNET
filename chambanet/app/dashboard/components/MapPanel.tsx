"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatLngBounds } from 'leaflet';
import dynamic from 'next/dynamic';

interface GeoChamba {
  id: string;
  titulo: string;
  pago_clp: number;
  direccion_texto: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
  distancia_km?: number;
}

const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-96 place-items-center rounded-[18px] border border-blue-200 bg-white/80 text-sm font-semibold text-blue-800">
      Cargando mapa...
    </div>
  ),
});

export default function MapPanel() {
  const REFRESH_INTERVAL_MS = 30 * 1000;
  const [jobs, setJobs] = useState<GeoChamba[]>([]);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [boundsQuery, setBoundsQuery] = useState<Record<string, string>>({});
  const [oficio, setOficio] = useState('');
  const [minPago, setMinPago] = useState('');
  const [maxPago, setMaxPago] = useState('');
  const [radiusKm, setRadiusKm] = useState('25');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingQueryRef = useRef<Record<string, string> | null>(null);
  const hasLoadedInitiallyRef = useRef(false);

  const fetchJobs = useCallback(async (params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params);

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const response = await fetch(`/api/chambas/geo?${search.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar el mapa de chambas.');
      }

      setJobs(payload?.chambas || []);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Error desconocido al cargar coordenadas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFilterQuery = useCallback(() => {
    const query: Record<string, string> = {};

    if (oficio.trim()) {
      query.oficio = oficio.trim();
    }

    if (minPago.trim()) {
      query.minPago = minPago.trim();
    }

    if (maxPago.trim()) {
      query.maxPago = maxPago.trim();
    }

    if (radiusKm.trim()) {
      query.radiusKm = radiusKm.trim();
    }

    return query;
  }, [maxPago, minPago, oficio, radiusKm]);

  const scheduleFetch = useCallback(
    (params: Record<string, string>, immediate = false) => {
      pendingQueryRef.current = params;

      if (immediate && !hasLoadedInitiallyRef.current) {
        hasLoadedInitiallyRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        void fetchJobs(params);

        intervalRef.current = setInterval(() => {
          if (pendingQueryRef.current) {
            void fetchJobs(pendingQueryRef.current);
          }
        }, REFRESH_INTERVAL_MS);
        return;
      }

      if (intervalRef.current) {
        return;
      }

      intervalRef.current = setInterval(() => {
        if (pendingQueryRef.current) {
          void fetchJobs(pendingQueryRef.current);
        }
      }, REFRESH_INTERVAL_MS);
    },
    [fetchJobs, REFRESH_INTERVAL_MS]
  );

  const refreshWithFilters = useCallback(
    (nextBounds: Record<string, string> = boundsQuery) => {
      const query: Record<string, string> = {
        ...nextBounds,
        ...getFilterQuery(),
      };

      if (userPosition) {
        query.lat = String(userPosition.lat);
        query.lng = String(userPosition.lng);
      }

      scheduleFetch(query);
    },
    [boundsQuery, getFilterQuery, scheduleFetch, userPosition]
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      const query = {
        ...boundsQuery,
        ...getFilterQuery(),
      };
      scheduleFetch(query, true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setUserPosition({ lat, lng });
        scheduleFetch({ lat: String(lat), lng: String(lng), ...getFilterQuery() }, true);
      },
      () => {
        const query = {
          ...boundsQuery,
          ...getFilterQuery(),
        };
        scheduleFetch(query, true);
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  }, [boundsQuery, getFilterQuery, scheduleFetch]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    refreshWithFilters();
  }, [oficio, minPago, maxPago, radiusKm, refreshWithFilters]);

  const handleBoundsChange = useCallback(
    (bounds: LatLngBounds) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const nextBounds: Record<string, string> = {
          north: String(bounds.getNorth()),
          south: String(bounds.getSouth()),
          east: String(bounds.getEast()),
          west: String(bounds.getWest()),
        };

        setBoundsQuery(nextBounds);
        refreshWithFilters(nextBounds);
      }, 350);
    },
    [refreshWithFilters]
  );

  const handleResetFilters = useCallback(() => {
    setOficio('');
    setMinPago('');
    setMaxPago('');
    setRadiusKm('25');
  }, []);

  const handlePagoInput = useCallback((value: string, setter: (v: string) => void) => {
    const clean = value.replace(/[^0-9]/g, '');
    setter(clean);
  }, []);

  const statusText = useMemo(() => {
    if (isLoading) {
      return 'Buscando chambas cercanas...';
    }

    return `${jobs.length} chamba${jobs.length === 1 ? '' : 's'} en esta zona`;
  }, [isLoading, jobs.length]);

  return (
    <section className="h-full min-h-[360px] rounded-xl border border-blue-200 bg-white/40 p-2 shadow-[0_8px_22px_rgba(41,87,145,0.15)] sm:p-3">
      <div className="mb-2.5 grid grid-cols-1 gap-2 rounded-lg border border-blue-200 bg-white/85 p-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-blue-900">
          Oficio
          <input
            value={oficio}
            onChange={(event) => setOficio(event.target.value)}
            placeholder="Ej: ceramista"
            className="mt-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>

        <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-blue-900">
          Pago mínimo
          <input
            value={minPago}
            onChange={(event) => handlePagoInput(event.target.value, setMinPago)}
            placeholder="10000"
            className="mt-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>

        <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-blue-900">
          Pago máximo
          <input
            value={maxPago}
            onChange={(event) => handlePagoInput(event.target.value, setMaxPago)}
            placeholder="90000"
            className="mt-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>

        <label className="flex flex-col text-[11px] font-bold uppercase tracking-wide text-blue-900">
          Radio (km)
          <select
            value={radiusKm}
            onChange={(event) => setRadiusKm(event.target.value)}
            className="mt-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            onClick={handleResetFilters}
            className="liftable w-full rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-semibold text-blue-900">
        <p>{statusText}</p>
        {errorMsg ? <p className="text-red-600">{errorMsg}</p> : null}
      </div>
      <div className="h-[62vh] min-h-[330px]">
        <MapCanvas jobs={jobs} userPosition={userPosition} onBoundsChange={handleBoundsChange} />
      </div>
    </section>
  );
}
