"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Avatar from './Avatar';

const MapPanel = dynamic(() => import('./MapPanel'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[360px] place-items-center rounded-xl border border-blue-200 bg-white/60 text-blue-900">
      Cargando mapa...
    </div>
  ),
});

interface Chamba {
  id: string;
  titulo: string;
  descripcion: string;
  pago_clp: number;
  estado: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
  direccion_texto: string;
  empleador_id: string;
  empleador_imagen_url?: string | null;
  empleador?: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    promedio_valoracion?: number | null;
  } | null;
}

export default function Feed({ chambas }: { chambas: Chamba[] }) {
  const [vista, setVista] = useState<'listado' | 'mapa'>('listado');
  const [postulandoId, setPostulandoId] = useState<string | null>(null);

  const formatDateAndTime = (rawValue?: string) => {
    if (!rawValue) {
      return { date: 'Fecha por definir', time: '--:--' };
    }

    const parsedDate = new Date(rawValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return { date: 'Fecha por definir', time: '--:--' };
    }

    return {
      date: new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(parsedDate),
      time: new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(parsedDate),
    };
  };

  const handlePostular = async (chambaId: string) => {
    setPostulandoId(chambaId);

    try {
      const response = await fetch('/api/postulaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chamba_id: chambaId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al postular');
      }

      alert('¡Postulación enviada con éxito! Revisa la pestaña de Postulaciones.');

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error("Error en la postulación:", error);
      alert(`No se pudo postular: ${message}`);
    } finally {
      setPostulandoId(null);
    }
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-blue-500/95 text-white">
      <div className="h-14 border-b border-blue-300/40 px-3 sm:px-6">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-center gap-2 sm:gap-6">
          <button
            onClick={() => setVista('listado')}
            className={`liftable rounded-lg px-3 py-1.5 text-sm font-semibold tracking-wide transition sm:px-5 sm:text-base ${
              vista === 'listado'
                ? 'bg-white/25 text-white underline underline-offset-8'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            Listado
          </button>
          <button
            onClick={() => setVista('mapa')}
            className={`liftable rounded-lg px-3 py-1.5 text-sm font-semibold tracking-wide transition sm:px-5 sm:text-base ${
              vista === 'mapa'
                ? 'bg-white/25 text-white underline underline-offset-8'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            Mapa
          </button>
        </div>
      </div>

      <div className="feed-scroll flex-1 overflow-y-auto px-3 py-3 sm:px-4 lg:px-6 lg:py-5">
        {vista === 'listado' ? (
          chambas.length > 0 ? (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3.5">
              {chambas.map((chamba) => {
                const horario = formatDateAndTime((chamba as Chamba & { horario?: string }).horario);

                return (
                  <article
                    key={chamba.id}
                    className="liftable rounded-xl border border-[#d7cc83] bg-[#f0e3aa] px-3.5 py-3.5 text-gray-900 shadow-[0_8px_18px_rgba(58,82,123,0.18)] sm:px-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-[100px] items-center gap-2 border-b border-dashed border-[#d6c989] pb-2.5 sm:mr-3 sm:min-h-[100px] sm:w-[118px] sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                        <Avatar
                          imageUrl={chamba.empleador_imagen_url}
                          name={`${chamba.empleador?.nombres || ''} ${chamba.empleador?.apellido_paterno || ''}`.trim()}
                          alt="Foto del empleador"
                          className="h-10 w-10 rounded-full border-2 border-blue-200 object-cover"
                          fallbackClassName="text-xs"
                        />
                        <div>
                          <p className="text-xs font-extrabold text-gray-900 sm:text-sm">
                            {chamba.empleador?.nombres
                              ? `${chamba.empleador.nombres.split(/\s+/)[0]} ${chamba.empleador.apellido_paterno || ''}`.trim()
                              : 'Empleador'}
                          </p>
                          <p className="text-base font-black text-gray-900 sm:text-lg">
                            ☆{' '}
                            {typeof chamba.empleador?.promedio_valoracion === 'number'
                              ? chamba.empleador.promedio_valoracion.toFixed(1).replace('.', ',')
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h3 className="text-base font-extrabold leading-tight text-black sm:text-xl">{chamba.titulo}</h3>
                          <span className="rounded-full bg-white/65 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800">
                            {chamba.estado}
                          </span>
                        </div>

                        <p className="text-xs leading-snug text-gray-800 sm:text-sm">{chamba.descripcion || 'Sin descripción disponible.'}</p>

                        <div className="space-y-1 text-xs font-bold text-gray-900 sm:text-sm">
                          <p>💸 CLP$ {chamba.pago_clp.toLocaleString('es-CL')}</p>
                          <p>🕒 {horario.date} | {horario.time}</p>
                          <p>📍 {chamba.direccion_texto || 'Ubicación por confirmar'}</p>
                        </div>

                        <div className="pt-1.5">
                          <button
                            onClick={() => handlePostular(chamba.id)}
                            disabled={postulandoId === chamba.id}
                            className={`liftable w-full rounded-full px-5 py-2 text-sm font-semibold text-white sm:w-auto ${
                              postulandoId === chamba.id
                                ? 'cursor-not-allowed bg-gray-400'
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                          >
                            {postulandoId === chamba.id ? 'Enviando...' : 'Postular'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mx-auto mt-10 text-center text-lg font-semibold text-blue-100">
              No hay chambas disponibles en este momento.
            </p>
          )
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <MapPanel />
          </div>
        )}
      </div>
    </main>
  );
}