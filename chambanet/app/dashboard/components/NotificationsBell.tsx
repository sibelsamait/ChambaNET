'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotificacionTipo = 'mensaje' | 'evidencia' | 'postulacion' | 'aceptacion';

type Notificacion = {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  descripcion: string;
  creadoEn: string | null;
  link: string;
};

function iconoPorTipo(tipo: NotificacionTipo) {
  if (tipo === 'mensaje') return '💬';
  if (tipo === 'evidencia') return '📎';
  if (tipo === 'postulacion') return '📝';
  return '✅';
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return 'Reciente';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return 'Reciente';

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export default function NotificationsBell() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [vistasIds, setVistasIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cargarNotificaciones = async () => {
    try {
      const response = await fetch('/api/notificaciones', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        setNotificaciones([]);
        return;
      }

      setNotificaciones(Array.isArray(data?.notificaciones) ? data.notificaciones : []);
    } catch {
      setNotificaciones([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
    const intervalId = window.setInterval(cargarNotificaciones, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const closeOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };

    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    setVistasIds((prev) => {
      const next = new Set(prev);
      notificaciones.forEach((n) => next.add(n.id));
      return next;
    });
  }, [abierto, notificaciones]);

  const noVistas = useMemo(
    () => notificaciones.filter((n) => !vistasIds.has(n.id)).length,
    [notificaciones, vistasIds]
  );

  const irANotificacion = (link: string) => {
    setAbierto(false);
    router.push(link);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="liftable relative rounded-full border border-white/60 bg-white/20 p-2 text-white shadow-md transition hover:bg-white/35"
        aria-label="Abrir notificaciones"
        title="Notificaciones"
      >
        <span className="text-xl leading-none">🔔</span>
        {noVistas > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white">
            {noVistas > 99 ? '99+' : noVistas}
          </span>
        ) : null}
      </button>

      {abierto ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-blue-100 bg-white text-gray-900 shadow-[0_12px_36px_rgba(30,64,175,0.30)]">
          <div className="border-b border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">Notificaciones</p>
          </div>

          {cargando ? (
            <p className="px-3 py-4 text-sm text-gray-500">Cargando notificaciones...</p>
          ) : notificaciones.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500">No tienes notificaciones por ahora.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notificaciones.map((notificacion) => (
                <li key={notificacion.id} className="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => irANotificacion(notificacion.link)}
                    className="w-full px-3 py-2.5 text-left transition hover:bg-blue-50"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-base" aria-hidden="true">
                        {iconoPorTipo(notificacion.tipo)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-900">{notificacion.titulo}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-gray-700">{notificacion.descripcion}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                          {formatearFecha(notificacion.creadoEn)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
