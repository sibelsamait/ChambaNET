'use client';

import { useEffect, useMemo, useState } from 'react';
import NotificationsBell from '@/app/dashboard/components/NotificationsBell';

type Ticket = {
  id: string;
  creado_en: string;
  actualizado_en: string;
  creado_por: string;
  chamba_id: string | null;
  tipo: 'PAGO' | 'CHAMBA' | 'REEMBOLSO' | 'LEGAL' | 'OTRO';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: 'ABIERTO' | 'EN_REVISION' | 'RESUELTO' | 'CERRADO';
  titulo: string;
  descripcion: string;
  consentimiento_usuario: boolean;
  requiere_revision_legal: boolean;
  porcentaje_reembolso: number | null;
  monto_reembolso_clp: number | null;
};

type TicketAction = {
  id: string;
  creado_en: string;
  accion: string;
  detalle: string;
  porcentaje_reembolso: number | null;
  monto_reembolso_clp: number | null;
};

function fmtDate(v?: string | null) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export default function SupportConsole() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<TicketAction[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | Ticket['estado']>('TODOS');
  const [detalleAccion, setDetalleAccion] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<Ticket['estado']>('EN_REVISION');
  const [confirmacionLegal, setConfirmacionLegal] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/soporte/tickets', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar tickets.');
      setTickets(data?.tickets || []);
      if (!selectedId && data?.tickets?.[0]?.id) setSelectedId(data.tickets[0].id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar soporte.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetalle = async (ticketId: string) => {
    setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/soporte/tickets/${ticketId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar detalle.');
      setAcciones(data?.acciones || []);
    } catch {
      setAcciones([]);
    } finally {
      setLoadingDetalle(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadDetalle(selectedId);
  }, [selectedId]);

  const ticketsFiltrados = useMemo(() => {
    if (filtroEstado === 'TODOS') return tickets;
    return tickets.filter((t) => t.estado === filtroEstado);
  }, [tickets, filtroEstado]);

  const ticketSeleccionado = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId]
  );

  const ejecutarAccion = async (accion: string) => {
    if (!selectedId) return;
    setEjecutando(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        accion,
        detalle: detalleAccion,
        confirmacionLegal,
      };
      if (accion === 'REEMBOLSO_PORCENTAJE') {
        body.porcentajeReembolso = Number(porcentaje);
      }
      if (accion === 'CAMBIO_ESTADO') {
        body.estado = nuevoEstado;
      }

      const res = await fetch(`/api/soporte/tickets/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo ejecutar la acción.');

      await loadTickets();
      await loadDetalle(selectedId);
      setDetalleAccion('');
      setPorcentaje('');
      setConfirmacionLegal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al ejecutar acción.');
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-blue-500/95 px-4 py-5 text-gray-900 sm:px-6 lg:px-8">
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 sm:right-4 sm:top-4">
        <NotificationsBell />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-4 shadow-[0_12px_40px_rgba(58,82,123,0.30)]">
          <h1 className="text-2xl font-extrabold text-black">Mesa de Soporte</h1>
          <p className="mt-1 text-xs font-semibold text-gray-700">
            Operaciones de help desk: revisión de tickets, cancelaciones y reembolsos porcentuales con trazabilidad.
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-800">
            Nota de cumplimiento: esta consola aplica controles técnicos, pero la validación legal final debe revisarla el equipo jurídico local.
          </p>
        </div>

        {error ? <p className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(['TODOS', 'ABIERTO', 'EN_REVISION', 'RESUELTO', 'CERRADO'] as const).map((estado) => (
            <button
              key={estado}
              type="button"
              onClick={() => setFiltroEstado(estado)}
              className={`liftable rounded-full px-3 py-1.5 text-xs font-extrabold ${
                filtroEstado === estado ? 'bg-[#f0e3aa] text-gray-900' : 'bg-white/20 text-white hover:bg-white/35'
              }`}
            >
              {estado.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-3 shadow-[0_12px_40px_rgba(58,82,123,0.30)]">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-gray-700">Tickets</h2>
            {loading ? (
              <p className="text-sm text-gray-600">Cargando tickets...</p>
            ) : ticketsFiltrados.length === 0 ? (
              <p className="text-sm text-gray-600">No hay tickets en este estado.</p>
            ) : (
              <ul className="feed-scroll max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {ticketsFiltrados.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(ticket.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        selectedId === ticket.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-[#d6c989] bg-white/80 hover:bg-blue-50'
                      }`}
                    >
                      <p className="truncate text-sm font-extrabold text-gray-900">{ticket.titulo}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-gray-600">
                        {ticket.tipo} · {ticket.estado.replace('_', ' ')} · {ticket.prioridad}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        {fmtDate(ticket.actualizado_en)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-4 shadow-[0_12px_40px_rgba(58,82,123,0.30)]">
            {!ticketSeleccionado ? (
              <p className="text-sm font-semibold text-gray-700">Selecciona un ticket para ver detalle y acciones.</p>
            ) : (
              <>
                <h2 className="text-xl font-extrabold text-black">{ticketSeleccionado.titulo}</h2>
                <p className="mt-1 text-sm font-semibold text-gray-700">{ticketSeleccionado.descripcion}</p>

                <div className="mt-3 grid gap-2 text-xs font-semibold text-gray-800 sm:grid-cols-2">
                  <p>Estado: <span className="font-extrabold">{ticketSeleccionado.estado.replace('_', ' ')}</span></p>
                  <p>Tipo: <span className="font-extrabold">{ticketSeleccionado.tipo}</span></p>
                  <p>Prioridad: <span className="font-extrabold">{ticketSeleccionado.prioridad}</span></p>
                  <p>Consentimiento usuario: <span className="font-extrabold">{ticketSeleccionado.consentimiento_usuario ? 'Sí' : 'No'}</span></p>
                  <p>Revisión legal: <span className="font-extrabold">{ticketSeleccionado.requiere_revision_legal ? 'Sí' : 'No'}</span></p>
                  <p>Última actualización: <span className="font-extrabold">{fmtDate(ticketSeleccionado.actualizado_en)}</span></p>
                </div>

                <div className="mt-4 rounded-xl border border-[#d6c989] bg-white/80 p-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Ejecutar acción</h3>
                  <textarea
                    value={detalleAccion}
                    onChange={(e) => setDetalleAccion(e.target.value)}
                    rows={3}
                    placeholder="Detalle de trazabilidad y justificación..."
                    className="mt-2 w-full resize-none rounded-lg border border-[#c9ba6a] bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400"
                  />

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => ejecutarAccion('COMENTARIO')}
                      disabled={ejecutando}
                      className="liftable rounded-full bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700"
                    >
                      Comentario
                    </button>
                    <button
                      type="button"
                      onClick={() => ejecutarAccion('CANCELAR_CHAMBA')}
                      disabled={ejecutando}
                      className="liftable rounded-full bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-red-700"
                    >
                      Cancelar chamba
                    </button>
                    <button
                      type="button"
                      onClick={() => ejecutarAccion('CANCELAR_PAGO')}
                      disabled={ejecutando}
                      className="liftable rounded-full bg-red-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-red-800"
                    >
                      Cancelar pago
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr]">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={porcentaje}
                      onChange={(e) => setPorcentaje(e.target.value)}
                      placeholder="% reembolso"
                      className="rounded-lg border border-[#c9ba6a] bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => ejecutarAccion('REEMBOLSO_PORCENTAJE')}
                      disabled={ejecutando}
                      className="liftable rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                    >
                      Reembolso por porcentaje
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={nuevoEstado}
                      onChange={(e) => setNuevoEstado(e.target.value as Ticket['estado'])}
                      className="rounded-lg border border-[#c9ba6a] bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400"
                    >
                      <option value="ABIERTO">ABIERTO</option>
                      <option value="EN_REVISION">EN REVISION</option>
                      <option value="RESUELTO">RESUELTO</option>
                      <option value="CERRADO">CERRADO</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => ejecutarAccion('CAMBIO_ESTADO')}
                      disabled={ejecutando}
                      className="liftable rounded-full bg-gray-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-gray-800"
                    >
                      Cambiar estado
                    </button>
                  </div>

                  <label className="mt-3 flex items-start gap-2 text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={confirmacionLegal}
                      onChange={(e) => setConfirmacionLegal(e.target.checked)}
                      className="mt-0.5"
                    />
                    Confirmo checklist legal/compliance para acciones financieras (cancelación de pago y reembolso).
                  </label>
                </div>

                <div className="mt-4 rounded-xl border border-[#d6c989] bg-white/80 p-3">
                  <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-gray-700">Bitácora de acciones</h3>
                  {loadingDetalle ? (
                    <p className="text-sm text-gray-600">Cargando acciones...</p>
                  ) : acciones.length === 0 ? (
                    <p className="text-sm text-gray-600">Sin acciones registradas aún.</p>
                  ) : (
                    <ul className="feed-scroll max-h-64 space-y-2 overflow-y-auto pr-1">
                      {acciones.map((a) => (
                        <li key={a.id} className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-xs">
                          <p className="font-extrabold text-blue-800">{a.accion.replace('_', ' ')}</p>
                          <p className="mt-0.5 font-semibold text-gray-700">{a.detalle}</p>
                          {a.porcentaje_reembolso !== null ? (
                            <p className="mt-0.5 font-semibold text-emerald-800">
                              Reembolso: {a.porcentaje_reembolso}% · CLP$ {Number(a.monto_reembolso_clp || 0).toLocaleString('es-CL')}
                            </p>
                          ) : null}
                          <p className="mt-0.5 uppercase tracking-wide text-[10px] font-semibold text-gray-500">{fmtDate(a.creado_en)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
