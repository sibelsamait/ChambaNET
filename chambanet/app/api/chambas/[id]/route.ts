import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: chambaId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 1. Chamba completa
    const { data: chamba, error: chambaError } = await supabase
      .from('chambas')
      .select('*')
      .eq('id', chambaId)
      .maybeSingle();

    if (chambaError || !chamba) {
      return NextResponse.json({ error: 'Chamba no encontrada.' }, { status: 404 });
    }

    // 2. Conteo de postulantes (excluye rechazados)
    const { count: postulantesCount } = await supabase
      .from('postulaciones')
      .select('*', { count: 'exact', head: true })
      .eq('chamba_id', chambaId)
      .neq('estado', 'RECHAZADA');

    // 3. ¿Ya postuló el usuario actual?
    let yaPostule = false;
    let postulacionId: string | null = null;
    if (userId) {
      const { data: postulacion } = await supabase
        .from('postulaciones')
        .select('id')
        .eq('chamba_id', chambaId)
        .eq('trabajador_id', userId)
        .in('estado', ['PENDIENTE', 'ACEPTADA'])
        .maybeSingle();

      if (postulacion) {
        yaPostule = true;
        postulacionId = postulacion.id;
      }
    }

    // 4. Datos del empleador
    const { data: empleador } = await supabase
      .from('usuarios')
      .select('id, nombres, apellido_paterno, apellido_materno, rut, promedio_valoracion')
      .eq('id', chamba.empleador_id)
      .maybeSingle();

    // 5. Imagen del empleador
    const { data: empImagen } = await supabase
      .from('user_imagenes')
      .select('image_data_url')
      .eq('user_id', chamba.empleador_id)
      .maybeSingle();

    // 6. Stats del empleador
    const { count: publicacionesCount } = await supabase
      .from('chambas')
      .select('*', { count: 'exact', head: true })
      .eq('empleador_id', chamba.empleador_id);

    const { count: trabajosCount } = await supabase
      .from('chambas')
      .select('*', { count: 'exact', head: true })
      .eq('empleador_id', chamba.empleador_id)
      .eq('estado', 'FINALIZADA');

    // 7. Valoraciones recibidas por el empleador (sin join para evitar ambigüedad de FK)
    const { data: valoracionesRaw } = await supabase
      .from('valoraciones')
      .select('estrellas, comentario, emisor_id')
      .eq('receptor_id', chamba.empleador_id)
      .order('creado_en', { ascending: false })
      .limit(10);

    let valoraciones: { estrellas: number; comentario: string | null; emisor_nombre: string }[] = [];
    if (valoracionesRaw && valoracionesRaw.length > 0) {
      const emisorIds = [...new Set(valoracionesRaw.map((v) => v.emisor_id))];
      const { data: emisores } = await supabase
        .from('usuarios')
        .select('id, nombres, apellido_paterno')
        .in('id', emisorIds);

      const emisoresMap = new Map((emisores || []).map((e) => [e.id, e]));
      valoraciones = valoracionesRaw.map((v) => {
        const e = emisoresMap.get(v.emisor_id);
        const nombre = e
          ? `${e.nombres?.split(' ')[0] ?? ''} ${e.apellido_paterno?.[0] ?? ''}.`.trim()
          : 'Usuario';
        return { estrellas: v.estrellas, comentario: v.comentario ?? null, emisor_nombre: nombre };
      });
    }

    return NextResponse.json({
      chamba,
      postulantes_count: postulantesCount ?? 0,
      ya_postule: yaPostule,
      postulacion_id: postulacionId,
      empleador: {
        ...(empleador ?? {}),
        imagen_url: empImagen?.image_data_url ?? null,
        publicaciones_realizadas: publicacionesCount ?? 0,
        trabajos_completados: trabajosCount ?? 0,
      },
      valoraciones,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
