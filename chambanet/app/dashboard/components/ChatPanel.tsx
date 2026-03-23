"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar';

type Conversacion = {
  key: string;
  chambaId: string;
  chambaTitulo: string;
  otroUsuarioId: string;
  otroUsuarioNombre: string;
  otroUsuarioImagenUrl: string | null;
  ultimoMensaje: string;
  ultimoMensajeEn: string | null;
};

type Mensaje = {
  id: string;
  chamba_id: string;
  remitente_id: string;
  destinatario_id: string;
  contenido: string;
  creado_en: string;
};

interface ChatPanelProps {
  userId: string;
}

const REFRESH_CONVERSACIONES_MS = 15000;
const REFRESH_MENSAJES_MS = 5000;

function formatFechaCorta(fechaRaw: string | null) {
  if (!fechaRaw) return '';
  const fecha = new Date(fechaRaw);
  if (Number.isNaN(fecha.getTime())) return '';

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha);
}

export default function ChatPanel({ userId }: ChatPanelProps) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [cargandoConversaciones, setCargandoConversaciones] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorChat, setErrorChat] = useState<string | null>(null);
  const mensajesContainerRef = useRef<HTMLDivElement>(null);

  const conversacionActiva = useMemo(
    () => conversaciones.find((item) => item.key === activeKey) ?? null,
    [conversaciones, activeKey]
  );

  const cargarConversaciones = async (silencioso = false) => {
    if (!silencioso) setCargandoConversaciones(true);
    try {
      const res = await fetch('/api/chat/conversaciones');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudieron cargar las conversaciones.');
      }

      const items = (data.conversaciones || []) as Conversacion[];
      setConversaciones(items);

      if (items.length === 0) {
        setActiveKey(null);
        return;
      }

      setActiveKey((prev) => (prev && items.some((item) => item.key === prev) ? prev : items[0].key));
    } catch (error: unknown) {
      setErrorChat(error instanceof Error ? error.message : 'No se pudo cargar el chat.');
    } finally {
      if (!silencioso) setCargandoConversaciones(false);
    }
  };

  const cargarMensajes = async (conversacion: Conversacion, silencioso = false) => {
    if (!silencioso) setCargandoMensajes(true);
    try {
      const params = new URLSearchParams({
        chambaId: conversacion.chambaId,
        otroUsuarioId: conversacion.otroUsuarioId,
      });
      const res = await fetch(`/api/chat/mensajes?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudieron cargar los mensajes.');
      }

      setMensajes((data.mensajes || []) as Mensaje[]);
    } catch (error: unknown) {
      setErrorChat(error instanceof Error ? error.message : 'No se pudieron cargar los mensajes.');
    } finally {
      if (!silencioso) setCargandoMensajes(false);
    }
  };

  useEffect(() => {
    cargarConversaciones();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      cargarConversaciones(true);
    }, REFRESH_CONVERSACIONES_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!conversacionActiva) {
      setMensajes([]);
      return;
    }
    setErrorChat(null);
    cargarMensajes(conversacionActiva);
  }, [conversacionActiva?.key]);

  useEffect(() => {
    if (!conversacionActiva) return;
    const timer = window.setInterval(() => {
      cargarMensajes(conversacionActiva, true);
    }, REFRESH_MENSAJES_MS);
    return () => window.clearInterval(timer);
  }, [conversacionActiva?.key]);

  useEffect(() => {
    if (!mensajesContainerRef.current) return;
    mensajesContainerRef.current.scrollTop = mensajesContainerRef.current.scrollHeight;
  }, [mensajes]);

  const handleEnviar = async (event: FormEvent) => {
    event.preventDefault();
    if (!conversacionActiva || enviando) return;

    const contenido = mensajeTexto.trim();
    if (!contenido) return;

    setEnviando(true);
    setErrorChat(null);

    try {
      const res = await fetch('/api/chat/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chambaId: conversacionActiva.chambaId,
          otroUsuarioId: conversacionActiva.otroUsuarioId,
          contenido,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo enviar el mensaje.');
      }

      const mensajeCreado = data.mensaje as Mensaje;
      setMensajes((prev) => [...prev, mensajeCreado]);
      setMensajeTexto('');
      cargarConversaciones(true);
    } catch (error: unknown) {
      setErrorChat(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <aside id="chat-panel" className="flex w-full flex-shrink-0 flex-col border-t border-blue-200 bg-[#f2f2f2] lg:w-80 lg:border-t-0 lg:border-l lg:border-l-blue-200">
      <div className="flex h-14 items-center justify-between border-b border-blue-200 px-4">
        <h2 className="text-xl font-bold text-black">Chat</h2>
      </div>

      <div className="grid min-h-0 grid-rows-[auto_1fr_auto] lg:flex-1">
        <div className="feed-scroll max-h-56 overflow-y-auto border-b border-blue-100 lg:max-h-64">
          {cargandoConversaciones ? (
            <p className="px-3 py-3 text-xs font-semibold text-gray-500">Cargando conversaciones...</p>
          ) : conversaciones.length === 0 ? (
            <p className="px-3 py-3 text-xs font-semibold text-gray-500">
              Sin conversaciones disponibles. Solo puedes chatear con contactos conectados por una chamba aceptada.
            </p>
          ) : (
            conversaciones.map((chat) => (
              <button
                key={chat.key}
                type="button"
                onClick={() => setActiveKey(chat.key)}
                className={`liftable flex w-full cursor-pointer items-center gap-2.5 border-b border-blue-100 px-3 py-2.5 text-left transition ${
                  chat.key === activeKey ? 'bg-blue-100/70' : 'hover:bg-blue-100/45'
                }`}
              >
                <Avatar
                  imageUrl={chat.otroUsuarioImagenUrl}
                  name={chat.otroUsuarioNombre}
                  alt={`Foto de ${chat.otroUsuarioNombre}`}
                  className="h-9 w-9 flex-shrink-0 rounded-full border border-blue-200 object-cover"
                  fallbackClassName="text-xs"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-bold text-black">{chat.otroUsuarioNombre}</p>
                  <p className="truncate text-[11px] font-semibold text-blue-700">{chat.chambaTitulo}</p>
                  <p className="truncate text-xs text-gray-700">{chat.ultimoMensaje}</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-gray-500">
                  {formatFechaCorta(chat.ultimoMensajeEn)}
                </span>
              </button>
            ))
          )}
        </div>

        <div ref={mensajesContainerRef} className="feed-scroll h-56 overflow-y-auto px-3 py-3 lg:h-auto lg:flex-1">
          {!conversacionActiva ? (
            <p className="text-xs font-semibold text-gray-500">Selecciona una conversación para empezar.</p>
          ) : cargandoMensajes ? (
            <p className="text-xs font-semibold text-gray-500">Cargando mensajes...</p>
          ) : mensajes.length === 0 ? (
            <p className="text-xs font-semibold text-gray-500">Aún no hay mensajes en esta conversación.</p>
          ) : (
            <div className="space-y-2">
              {mensajes.map((msg) => {
                const esMio = msg.remitente_id === userId;
                return (
                  <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                        esMio ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words font-semibold">{msg.contenido}</p>
                      <p className={`mt-1 text-[10px] ${esMio ? 'text-blue-100' : 'text-gray-400'}`}>
                        {formatFechaCorta(msg.creado_en)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleEnviar} className="border-t border-blue-100 px-3 py-2">
          {errorChat ? <p className="mb-1 text-[11px] font-bold text-red-600">{errorChat}</p> : null}
          <div className="flex items-center gap-2">
            <input
              value={mensajeTexto}
              onChange={(e) => setMensajeTexto(e.target.value)}
              disabled={!conversacionActiva || enviando}
              placeholder={conversacionActiva ? 'Escribe un mensaje...' : 'Selecciona una conversación'}
              className="w-full rounded-full border border-blue-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!conversacionActiva || enviando || !mensajeTexto.trim()}
              className={`liftable rounded-full px-3 py-2 text-xs font-extrabold text-white ${
                !conversacionActiva || enviando || !mensajeTexto.trim()
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {enviando ? '...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}