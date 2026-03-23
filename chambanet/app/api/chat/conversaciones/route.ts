import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../lib/supabase';

type Conexion = {
  chambaId: string;
  chambaTitulo: string;
  otroUsuarioId: string;
};

type ConversacionDTO = {
  key: string;
  chambaId: string;
  chambaTitulo: string;
  otroUsuarioId: string;
  otroUsuarioNombre: string;
  otroUsuarioImagenUrl: string | null;
  ultimoMensaje: string;
  ultimoMensajeEn: string | null;
};

function normalizarChamba(raw: unknown): { id: string; titulo: string; empleador_id: string } | null {
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

function construirKey(chambaId: string, otroUsuarioId: string) {
  return `${chambaId}:${otroUsuarioId}`;
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

    const [{ data: conexionesComoEmpleador, error: e1 }, { data: conexionesComoTrabajador, error: e2 }] =
      await Promise.all([
        supabase
          .from('postulaciones')
          .select('trabajador_id, chamba:chambas!inner(id, titulo, empleador_id)')
          .eq('estado', 'ACEPTADA')
          .eq('chamba.empleador_id', userId),
        supabase
          .from('postulaciones')
          .select('trabajador_id, chamba:chambas!inner(id, titulo, empleador_id)')
          .eq('estado', 'ACEPTADA')
          .eq('trabajador_id', userId),
      ]);

    if (e1 || e2) {
      return NextResponse.json({ error: 'No se pudo cargar las conversaciones.' }, { status: 500 });
    }

    const conexiones: Conexion[] = [];

    (conexionesComoEmpleador || []).forEach((row) => {
      const chamba = normalizarChamba(row.chamba);
      if (!chamba) return;
      conexiones.push({
        chambaId: chamba.id,
        chambaTitulo: chamba.titulo,
        otroUsuarioId: row.trabajador_id as string,
      });
    });

    (conexionesComoTrabajador || []).forEach((row) => {
      const chamba = normalizarChamba(row.chamba);
      if (!chamba) return;
      conexiones.push({
        chambaId: chamba.id,
        chambaTitulo: chamba.titulo,
        otroUsuarioId: chamba.empleador_id,
      });
    });

    const uniqueMap = new Map<string, Conexion>();
    conexiones.forEach((item) => {
      uniqueMap.set(construirKey(item.chambaId, item.otroUsuarioId), item);
    });

    const conexionesUnicas = Array.from(uniqueMap.values());

    if (conexionesUnicas.length === 0) {
      return NextResponse.json({ conversaciones: [] as ConversacionDTO[] }, { status: 200 });
    }

    const otroUsuarioIds = Array.from(new Set(conexionesUnicas.map((c) => c.otroUsuarioId)));
    const chambaIds = Array.from(new Set(conexionesUnicas.map((c) => c.chambaId)));

    const [{ data: usuarios }, { data: imagenes }, { data: mensajes, error: mensajesError }] = await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nombres, apellido_paterno')
        .in('id', otroUsuarioIds),
      supabase
        .from('user_imagenes')
        .select('user_id, image_data_url')
        .in('user_id', otroUsuarioIds),
      supabase
        .from('chat_mensajes')
        .select('chamba_id, remitente_id, destinatario_id, contenido, creado_en')
        .in('chamba_id', chambaIds)
        .order('creado_en', { ascending: false }),
    ]);

    if (mensajesError) {
      return NextResponse.json({ error: 'No se pudieron cargar los mensajes de chat.' }, { status: 500 });
    }

    const usuariosMap = new Map((usuarios || []).map((u) => [u.id, u]));
    const imagenesMap = new Map((imagenes || []).map((img) => [img.user_id, img.image_data_url]));

    const ultimoMensajePorConexion = new Map<
      string,
      { contenido: string; creado_en: string | null }
    >();

    (mensajes || []).forEach((msg) => {
      const participanteA = msg.remitente_id as string;
      const participanteB = msg.destinatario_id as string;
      const chambaId = msg.chamba_id as string;

      if (participanteA !== userId && participanteB !== userId) return;

      const otroUsuarioId = participanteA === userId ? participanteB : participanteA;
      const key = construirKey(chambaId, otroUsuarioId);

      if (!ultimoMensajePorConexion.has(key)) {
        ultimoMensajePorConexion.set(key, {
          contenido: (msg.contenido as string) || '',
          creado_en: (msg.creado_en as string) || null,
        });
      }
    });

    const conversaciones: ConversacionDTO[] = conexionesUnicas.map((conexion) => {
      const usuario = usuariosMap.get(conexion.otroUsuarioId) as
        | { id: string; nombres: string; apellido_paterno: string }
        | undefined;

      const nombreCompleto = usuario
        ? `${usuario.nombres || ''} ${usuario.apellido_paterno || ''}`.trim()
        : 'Usuario';

      const key = construirKey(conexion.chambaId, conexion.otroUsuarioId);
      const ultimo = ultimoMensajePorConexion.get(key);

      return {
        key,
        chambaId: conexion.chambaId,
        chambaTitulo: conexion.chambaTitulo,
        otroUsuarioId: conexion.otroUsuarioId,
        otroUsuarioNombre: nombreCompleto,
        otroUsuarioImagenUrl: (imagenesMap.get(conexion.otroUsuarioId) as string | null) || null,
        ultimoMensaje: ultimo?.contenido || 'Sin mensajes aún',
        ultimoMensajeEn: ultimo?.creado_en || null,
      };
    });

    conversaciones.sort((a, b) => {
      const aTime = a.ultimoMensajeEn ? new Date(a.ultimoMensajeEn).getTime() : 0;
      const bTime = b.ultimoMensajeEn ? new Date(b.ultimoMensajeEn).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ conversaciones }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
