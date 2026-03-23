import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../lib/supabase';

type NotificacionTipo = 'mensaje' | 'evidencia' | 'postulacion' | 'aceptacion';

type Notificacion = {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  descripcion: string;
  creadoEn: string | null;
  link: string;
};

function normalizarChambaBasica(raw: unknown): { id: string; titulo: string; empleador_id: string } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0] as { id?: string; titulo?: string; empleador_id?: string } | undefined;
    if (!first?.id || !first?.titulo || !first?.empleador_id) return null;
    return { id: first.id, titulo: first.titulo, empleador_id: first.empleador_id };
  }

  const row = raw as { id?: string; titulo?: string; empleador_id?: string };
  if (!row.id || !row.titulo || !row.empleador_id) return null;
  return { id: row.id, titulo: row.titulo, empleador_id: row.empleador_id };
}

function getTimeValue(creadoEn: string | null): number {
  if (!creadoEn) return 0;
  const t = new Date(creadoEn).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const userId = authData.user.id;

    const [mensajesRes, postulacionesRes, aceptacionesRes, evidenciasRes] = await Promise.all([
      supabase
        .from('chat_mensajes')
        .select('id, chamba_id, remitente_id, contenido, creado_en')
        .eq('destinatario_id', userId)
        .order('creado_en', { ascending: false })
        .limit(15),
      supabase
        .from('postulaciones')
        .select('id, trabajador_id, chamba:chambas!inner(id, titulo, empleador_id)')
        .eq('estado', 'PENDIENTE')
        .eq('chamba.empleador_id', userId)
        .limit(15),
      supabase
        .from('postulaciones')
        .select('id, chamba:chambas!inner(id, titulo, empleador_id)')
        .eq('estado', 'ACEPTADA')
        .eq('trabajador_id', userId)
        .limit(15),
      supabase
        .from('chambas')
        .select('id, titulo')
        .eq('empleador_id', userId)
        .eq('estado', 'ESPERANDO_APROBACION')
        .limit(15),
    ]);

    if (mensajesRes.error || postulacionesRes.error || aceptacionesRes.error || evidenciasRes.error) {
      return NextResponse.json({ error: 'No se pudieron cargar las notificaciones.' }, { status: 500 });
    }

    const remitenteIds = Array.from(
      new Set((mensajesRes.data || []).map((m) => m.remitente_id).filter(Boolean))
    );

    const trabajadorIdsPostulaciones = Array.from(
      new Set((postulacionesRes.data || []).map((p) => p.trabajador_id).filter(Boolean))
    );

    const usuarioIds = Array.from(new Set([...remitenteIds, ...trabajadorIdsPostulaciones]));

    const { data: usuarios } = usuarioIds.length
      ? await supabase
          .from('usuarios')
          .select('id, nombres, apellido_paterno')
          .in('id', usuarioIds)
      : { data: [] as Array<{ id: string; nombres: string; apellido_paterno: string | null }> };

    const usuarioMap = new Map((usuarios || []).map((u) => [u.id, u]));

    const notificaciones: Notificacion[] = [];

    (mensajesRes.data || []).forEach((msg) => {
      const remitente = usuarioMap.get(msg.remitente_id as string);
      const nombre = remitente
        ? `${remitente.nombres?.split(' ')[0] ?? ''} ${remitente.apellido_paterno ?? ''}`.trim()
        : 'Usuario';

      notificaciones.push({
        id: `msg-${msg.id}`,
        tipo: 'mensaje',
        titulo: 'Nuevo mensaje',
        descripcion: `${nombre}: ${msg.contenido || 'Te envió un mensaje.'}`,
        creadoEn: (msg.creado_en as string) || null,
        link: '/dashboard#chat-panel',
      });
    });

    (postulacionesRes.data || []).forEach((postulacion) => {
      const chamba = normalizarChambaBasica(postulacion.chamba);
      if (!chamba) return;

      const trabajador = usuarioMap.get(postulacion.trabajador_id as string);
      const nombreTrabajador = trabajador
        ? `${trabajador.nombres?.split(' ')[0] ?? ''} ${trabajador.apellido_paterno ?? ''}`.trim()
        : 'Un usuario';

      notificaciones.push({
        id: `post-${postulacion.id}`,
        tipo: 'postulacion',
        titulo: 'Nueva postulación',
        descripcion: `${nombreTrabajador} postuló a "${chamba.titulo}".`,
        creadoEn: null,
        link: '/dashboard',
      });
    });

    (aceptacionesRes.data || []).forEach((postulacion) => {
      const chamba = normalizarChambaBasica(postulacion.chamba);
      if (!chamba) return;

      notificaciones.push({
        id: `acc-${postulacion.id}`,
        tipo: 'aceptacion',
        titulo: '¡Te aceptaron en una chamba!',
        descripcion: `Tu postulación fue aceptada en "${chamba.titulo}".`,
        creadoEn: null,
        link: '/dashboard',
      });
    });

    (evidenciasRes.data || []).forEach((chamba) => {
      notificaciones.push({
        id: `evi-${chamba.id}`,
        tipo: 'evidencia',
        titulo: 'Evidencia enviada',
        descripcion: `El trabajador envió evidencia en "${chamba.titulo}".`,
        creadoEn: null,
        link: '/dashboard',
      });
    });

    notificaciones.sort((a, b) => getTimeValue(b.creadoEn) - getTimeValue(a.creadoEn));

    return NextResponse.json({ notificaciones: notificaciones.slice(0, 30) }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
