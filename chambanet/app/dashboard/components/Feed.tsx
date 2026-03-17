"use client";

import { useState, useEffect } from 'react';
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

interface FormChamba {
  titulo: string;
  descripcion: string;
  pago_clp: string;
  horario: string;
  direccion_texto: string;
  ubicacion_lat: string;
  ubicacion_lng: string;
}

const FORM_INICIAL: FormChamba = {
  titulo: '',
  descripcion: '',
  pago_clp: '',
  horario: '',
  direccion_texto: '',
  ubicacion_lat: '',
  ubicacion_lng: '',
};

export default function Feed({ chambas, userId }: { chambas: Chamba[]; userId: string }) {
  const [vista, setVista] = useState<'listado' | 'mapa'>('listado');
  const [postulandoId, setPostulandoId] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState<FormChamba>(FORM_INICIAL);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [localidades, setLocalidades] = useState<Map<string, string>>(new Map());

  // Reverse geocoding para chambas con coords pero sin dirección texto
  useEffect(() => {
    const sinDireccion = chambas.filter(
      (c) => !c.direccion_texto && c.ubicacion_lat && c.ubicacion_lng
    );
    if (sinDireccion.length === 0) return;

    let cancelado = false;

    const resolverSecuencial = async () => {
      for (const chamba of sinDireccion) {
        if (cancelado) break;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${chamba.ubicacion_lat}&lon=${chamba.ubicacion_lng}&format=json&accept-language=es`
          );
          const data = await res.json();
          const addr = data.address || {};
          const localidad =
            addr.suburb ??
            addr.city_district ??
            addr.neighbourhood ??
            addr.city ??
            addr.town ??
            addr.village ??
            data.display_name?.split(',')[0] ??
            'Ubicación GPS';
          setLocalidades((prev) => new Map(prev).set(chamba.id, localidad));
        } catch {
          // falla silenciosa
        }
        // Respetar límite de Nominatim: 1 req/s
        await new Promise((r) => setTimeout(r, 1100));
      }
    };

    resolverSecuencial();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chambas]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublicando(true);
    setErrorPublicar(null);

    try {
      const payload = {
        empleador_id: userId,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        pago_clp: parseInt(form.pago_clp, 10),
        horario: form.horario,
        direccion_texto: form.direccion_texto.trim() || null,
        ubicacion_lat: form.ubicacion_lat ? parseFloat(form.ubicacion_lat) : null,
        ubicacion_lng: form.ubicacion_lng ? parseFloat(form.ubicacion_lng) : null,
      };

      const res = await fetch('/api/chambas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al publicar la chamba.');
      }

      setMostrarFormulario(false);
      setForm(FORM_INICIAL);
      alert('¡Chamba publicada exitosamente! Aparecerá en el feed en instantes.');
    } catch (err: unknown) {
      setErrorPublicar(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setPublicando(false);
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setForm(FORM_INICIAL);
    setErrorPublicar(null);
  };

  const handleUsarGPS = () => {
    if (!navigator.geolocation) {
      setErrorPublicar('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setCargandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          ubicacion_lat: pos.coords.latitude.toFixed(6),
          ubicacion_lng: pos.coords.longitude.toFixed(6),
        }));
        setCargandoGPS(false);
      },
      () => {
        setErrorPublicar('No se pudo obtener el GPS. Verifica los permisos del navegador.');
        setCargandoGPS(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

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
      {/* Modal publicar chamba */}
      {mostrarFormulario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancelar(); }}
        >
          <div className="w-full max-w-lg rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] shadow-[0_12px_40px_rgba(58,82,123,0.30)] p-6 text-gray-900">
            {/* Cabecera post-it */}
            <div className="mb-5 flex items-center gap-2.5 border-b-2 border-dashed border-[#d6c989] pb-3">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-extrabold tracking-tight text-black">Publicar Chamba</h2>
            </div>

            <form onSubmit={handlePublicar} className="flex flex-col gap-3.5">
              {/* Título */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Título *</label>
                <input
                  type="text"
                  name="titulo"
                  value={form.titulo}
                  onChange={handleFormChange}
                  required
                  maxLength={255}
                  placeholder="Ej: Pintor de departamento, Gasfíter urgente…"
                  className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                />
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Descripción *</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleFormChange}
                  required
                  rows={3}
                  placeholder="Detalla el trabajo a realizar…"
                  className="resize-none rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                />
              </div>

              {/* Pago y horario */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Pago CLP$ *</label>
                  <input
                    type="number"
                    name="pago_clp"
                    value={form.pago_clp}
                    onChange={handleFormChange}
                    required
                    min={1}
                    placeholder="15000"
                    className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Fecha y hora *</label>
                  <input
                    type="datetime-local"
                    name="horario"
                    value={form.horario}
                    onChange={handleFormChange}
                    required
                    className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Dirección</label>
                <input
                  type="text"
                  name="direccion_texto"
                  value={form.direccion_texto}
                  onChange={handleFormChange}
                  maxLength={255}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                />
              </div>

              {/* Coordenadas GPS */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Coordenadas GPS</label>
                  <button
                    type="button"
                    onClick={handleUsarGPS}
                    disabled={cargandoGPS}
                    className={`flex items-center gap-1 rounded-full border border-blue-400 px-2.5 py-0.5 text-xs font-bold transition ${
                      cargandoGPS
                        ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <span>{cargandoGPS ? '⏳' : '🛰️'}</span>
                    {cargandoGPS ? 'Obteniendo…' : 'Usar GPS'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    name="ubicacion_lat"
                    value={form.ubicacion_lat}
                    onChange={handleFormChange}
                    step="any"
                    placeholder="Latitud: -33.4489"
                    className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                  />
                  <input
                    type="number"
                    name="ubicacion_lng"
                    value={form.ubicacion_lng}
                    onChange={handleFormChange}
                    step="any"
                    placeholder="Longitud: -70.6693"
                    className="rounded-lg border border-[#c9ba6a] bg-white/70 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                  />
                </div>
                {form.ubicacion_lat && form.ubicacion_lng && (
                  <p className="text-[11px] font-semibold text-green-700">✅ Coordenadas capturadas correctamente</p>
                )}
              </div>

              {/* Error */}
              {errorPublicar && (
                <p className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700">
                  ⚠️ {errorPublicar}
                </p>
              )}

              {/* Acciones */}
              <div className="mt-1 flex gap-3 border-t-2 border-dashed border-[#d6c989] pt-4">
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="liftable flex-1 rounded-full border-2 border-gray-400 bg-white/60 px-5 py-2 text-sm font-bold text-gray-700 hover:bg-white/90"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={publicando}
                  className={`liftable flex-1 rounded-full px-5 py-2 text-sm font-bold text-white ${
                    publicando
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {publicando ? 'Publicando…' : '📌 Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="h-14 border-b border-blue-300/40 px-3 sm:px-6">
        <div className="mx-auto flex h-full max-w-4xl items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-6">
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

          <button
            onClick={() => setMostrarFormulario(true)}
            className="liftable flex items-center gap-1.5 rounded-full bg-[#f0e3aa] px-4 py-1.5 text-sm font-extrabold text-gray-900 shadow-md hover:bg-[#ecdfa0] sm:px-5"
          >
            <span className="text-base">📌</span>
            <span className="hidden sm:inline">Publicar chamba</span>
            <span className="sm:hidden">Publicar</span>
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
                          <p>📍 {
                            chamba.direccion_texto ||
                            localidades.get(chamba.id) ||
                            (chamba.ubicacion_lat ? '📡 Cargando localidad…' : 'Ubicación por confirmar')
                          }</p>
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