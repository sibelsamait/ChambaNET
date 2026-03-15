"use client";

import { useMemo } from 'react';
import L, { LatLngBounds } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

interface MapChamba {
  id: string;
  titulo: string;
  pago_clp: number;
  direccion_texto: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
  distancia_km?: number;
}

interface MapCanvasProps {
  jobs: MapChamba[];
  userPosition: { lat: number; lng: number } | null;
  onBoundsChange: (bounds: LatLngBounds) => void;
}

const fallbackCenter: [number, number] = [-33.0472, -71.6127];

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: LatLngBounds) => void }) {
  useMapEvents({
    moveend: (event) => {
      onBoundsChange(event.target.getBounds());
    },
    zoomend: (event) => {
      onBoundsChange(event.target.getBounds());
    },
  });

  return null;
}

export default function MapCanvas({ jobs, userPosition, onBoundsChange }: MapCanvasProps) {
  const center = userPosition ? ([userPosition.lat, userPosition.lng] as [number, number]) : fallbackCenter;

  const jobIcon = useMemo(
    () =>
      L.divIcon({
        className: 'chamba-pin',
        html: '<div style="height:38px;width:38px;border-radius:999px;background:#111827;color:white;display:grid;place-items:center;border:3px solid #ffffff;box-shadow:0 10px 18px rgba(17,24,39,.35);font-size:18px;">🤝</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 34],
      }),
    []
  );

  const createClusterCustomIcon = useMemo(
    () =>
      (cluster: { getChildCount: () => number }) => {
        const count = cluster.getChildCount();
        const size = count > 40 ? 54 : count > 15 ? 48 : 42;

        return L.divIcon({
          html: `<div style="height:${size}px;width:${size}px;border-radius:999px;background:#2f6fc0;color:white;display:grid;place-items:center;border:4px solid #ffffff;box-shadow:0 8px 16px rgba(29,57,97,.28);font-size:14px;font-weight:800;">${count}</div>`,
          className: 'chamba-cluster-icon',
          iconSize: [size, size],
        });
      },
    []
  );

  return (
    <div className="map-shell h-full w-full overflow-hidden rounded-[18px] border border-blue-200 shadow-[0_12px_24px_rgba(40,86,145,0.2)]">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <BoundsWatcher onBoundsChange={onBoundsChange} />

        {userPosition ? (
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={10}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#ef3340', fillOpacity: 1 }}
          >
            <Popup>Tu ubicación actual</Popup>
          </CircleMarker>
        ) : null}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          showCoverageOnHover={false}
          iconCreateFunction={createClusterCustomIcon}
        >
          {jobs.map((job) => (
            <Marker key={job.id} position={[job.ubicacion_lat, job.ubicacion_lng]} icon={jobIcon}>
              <Popup>
                <div className="text-[13px] leading-tight">
                  <p className="font-extrabold">{job.titulo}</p>
                  <p className="font-semibold text-blue-700">CLP$ {job.pago_clp.toLocaleString('es-CL')}</p>
                  <p className="text-gray-600">{job.direccion_texto}</p>
                  {typeof job.distancia_km === 'number' ? (
                    <p className="mt-1 text-[11px] text-gray-500">A {job.distancia_km.toFixed(1)} km de ti</p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
