import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { getAverageRatingsByUserIds } from '../../../../../lib/ratings';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: userId } = await context.params;

    // Datos del usuario
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombres, apellido_paterno, apellido_materno, rut, email, telefono, fecha_nacimiento, direccion_completa')
      .eq('id', userId)
      .maybeSingle();

    if (error || !usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Imagen de perfil
    const { data: imagenData } = await supabase
      .from('user_imagenes')
      .select('image_data_url')
      .eq('user_id', userId)
      .maybeSingle();

    // Trabajos completados (postulaciones ACEPTADAS en chambas FINALIZADAS)
    const { data: postulacionesAceptadas } = await supabase
      .from('postulaciones')
      .select('chamba_id')
      .eq('trabajador_id', userId)
      .eq('estado', 'ACEPTADA');

    let trabajosCompletados = 0;
    if (postulacionesAceptadas && postulacionesAceptadas.length > 0) {
      const chambaIds = postulacionesAceptadas.map((p) => p.chamba_id);
      const { count } = await supabase
        .from('chambas')
        .select('*', { count: 'exact', head: true })
        .in('id', chambaIds)
        .eq('estado', 'FINALIZADA');
      trabajosCompletados = count ?? 0;
    }

    // Valoraciones recibidas
    let { data: valoracionesRaw, error: valoracionesError } = await supabase
      .from('valoraciones')
      .select('estrellas, comentario, emisor_id')
      .eq('receptor_id', userId)
      .order('creado_en', { ascending: false })
      .limit(20);

    if (valoracionesError) {
      const fallback = await supabase
        .from('valoraciones')
        .select('estrellas, comentario, emisor_id')
        .eq('receptor_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      valoracionesRaw = fallback.data;
      valoracionesError = fallback.error;
    }

    if (valoracionesError) {
      const fallback = await supabase
        .from('valoraciones')
        .select('estrellas, comentario, emisor_id')
        .eq('receptor_id', userId)
        .limit(20);

      valoracionesRaw = fallback.data;
    }

    let valoraciones: { estrellas: number; comentario: string | null; emisor_nombre: string }[] = [];
    if (valoracionesRaw && valoracionesRaw.length > 0) {
      const emisorIds = [...new Set(valoracionesRaw.map((v) => v.emisor_id))];
      const { data: emisores } = await supabase
        .from('usuarios')
        .select('id, nombres, apellido_paterno')
        .in('id', emisorIds);

      const emisoresMap = new Map((emisores ?? []).map((e) => [e.id, e]));
      valoraciones = valoracionesRaw.map((v) => {
        const e = emisoresMap.get(v.emisor_id);
        const nombre = e
          ? `${e.nombres?.split(' ')[0] ?? ''} ${e.apellido_paterno?.[0] ?? ''}.`.trim()
          : 'Usuario';
        return { estrellas: v.estrellas, comentario: v.comentario ?? null, emisor_nombre: nombre };
      });
    }

    const ratingMap = await getAverageRatingsByUserIds([userId]);

    return NextResponse.json({
      id: usuario.id,
      nombres: usuario.nombres,
      apellido_paterno: usuario.apellido_paterno,
      apellido_materno: usuario.apellido_materno ?? null,
      rut: usuario.rut ?? null,
      email: usuario.email ?? null,
      telefono: usuario.telefono ?? null,
      fecha_nacimiento: usuario.fecha_nacimiento ?? null,
      direccion_completa: usuario.direccion_completa ?? null,
      promedio_valoracion: ratingMap.get(userId) ?? null,
      imagen_url: imagenData?.image_data_url ?? null,
      trabajos_completados: trabajosCompletados,
      valoraciones,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
