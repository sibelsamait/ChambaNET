import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../lib/supabase';

type ConexionValida = {
  chambaId: string;
  empleadorId: string;
  trabajadorId: string;
};

function normalizarChamba(raw: unknown): { id: string; empleador_id: string } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0] as { id?: string; empleador_id?: string } | undefined;
    if (!first?.id || !first?.empleador_id) return null;
    return { id: first.id, empleador_id: first.empleador_id };
  }

  const row = raw as { id?: string; empleador_id?: string };
  if (!row.id || !row.empleador_id) return null;
  return { id: row.id, empleador_id: row.empleador_id };
}

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
    return { userId: null, error: 'No autenticado.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return { userId: null, error: 'Sesión inválida o expirada.' };
  }

  return { userId: authData.user.id, error: null };
}

async function validarConexionPorChamba(
  userId: string,
  chambaId: string,
  otroUsuarioId: string
): Promise<ConexionValida | null> {
  const { data: postulaciones, error } = await supabase
    .from('postulaciones')
    .select('trabajador_id, chamba:chambas!inner(id, empleador_id)')
    .eq('estado', 'ACEPTADA')
    .eq('chamba_id', chambaId)
    .limit(20);

  if (error || !postulaciones || postulaciones.length === 0) return null;

  const coincidencia = postulaciones.find((item) => {
    const chamba = normalizarChamba(item.chamba);
    if (!chamba) return false;

    const trabajadorId = item.trabajador_id as string;
    const empleadorId = chamba.empleador_id;

    return (
      (userId === empleadorId && otroUsuarioId === trabajadorId) ||
      (userId === trabajadorId && otroUsuarioId === empleadorId)
    );
  });

  if (!coincidencia) return null;

  const chamba = normalizarChamba(coincidencia.chamba);
  if (!chamba) return null;

  return {
    chambaId: chamba.id,
    empleadorId: chamba.empleador_id,
    trabajadorId: coincidencia.trabajador_id as string,
  };
}

export async function GET(request: Request) {
  try {
    const { userId, error } = await getAuthenticatedUserId();

    if (error || !userId) {
      return NextResponse.json({ error: error || 'No autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chambaId = searchParams.get('chambaId');
    const otroUsuarioId = searchParams.get('otroUsuarioId');

    if (!chambaId || !otroUsuarioId) {
      return NextResponse.json(
        { error: 'Parámetros chambaId y otroUsuarioId son obligatorios.' },
        { status: 400 }
      );
    }

    const conexion = await validarConexionPorChamba(userId, chambaId, otroUsuarioId);

    if (!conexion) {
      return NextResponse.json(
        { error: 'No puedes acceder a esta conversación si no están conectados por una chamba.' },
        { status: 403 }
      );
    }

    const { data: mensajes, error: mensajesError } = await supabase
      .from('chat_mensajes')
      .select('id, chamba_id, remitente_id, destinatario_id, contenido, creado_en')
      .eq('chamba_id', conexion.chambaId)
      .or(
        `and(remitente_id.eq.${userId},destinatario_id.eq.${otroUsuarioId}),and(remitente_id.eq.${otroUsuarioId},destinatario_id.eq.${userId})`
      )
      .order('creado_en', { ascending: true })
      .limit(500);

    if (mensajesError) {
      return NextResponse.json({ error: 'No se pudieron cargar los mensajes.' }, { status: 500 });
    }

    return NextResponse.json({ mensajes: mensajes || [] }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, error } = await getAuthenticatedUserId();

    if (error || !userId) {
      return NextResponse.json({ error: error || 'No autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const chambaId = body?.chambaId as string | undefined;
    const otroUsuarioId = body?.otroUsuarioId as string | undefined;
    const contenido = (body?.contenido as string | undefined)?.trim();

    if (!chambaId || !otroUsuarioId || !contenido) {
      return NextResponse.json(
        { error: 'Parámetros chambaId, otroUsuarioId y contenido son obligatorios.' },
        { status: 400 }
      );
    }

    if (contenido.length > 1000) {
      return NextResponse.json({ error: 'El mensaje no puede exceder 1000 caracteres.' }, { status: 400 });
    }

    const conexion = await validarConexionPorChamba(userId, chambaId, otroUsuarioId);

    if (!conexion) {
      return NextResponse.json(
        { error: 'No puedes enviar mensajes a usuarios no conectados por una chamba.' },
        { status: 403 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('chat_mensajes')
      .insert([
        {
          chamba_id: conexion.chambaId,
          remitente_id: userId,
          destinatario_id: otroUsuarioId,
          contenido,
        },
      ])
      .select('id, chamba_id, remitente_id, destinatario_id, contenido, creado_en')
      .maybeSingle();

    if (insertError || !data) {
      return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 500 });
    }

    return NextResponse.json({ mensaje: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
