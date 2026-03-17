import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: chambaId } = await context.params;
    const { searchParams } = new URL(request.url);
    const empleadorId = searchParams.get('empleadorId');

    if (!empleadorId) {
      return NextResponse.json({ error: 'empleadorId requerido.' }, { status: 400 });
    }

    // Validar que el solicitante es dueño de la chamba
    const { data: chamba, error: chambaError } = await supabase
      .from('chambas')
      .select('empleador_id')
      .eq('id', chambaId)
      .maybeSingle();

    if (chambaError || !chamba) {
      return NextResponse.json({ error: 'Chamba no encontrada.' }, { status: 404 });
    }

    if (chamba.empleador_id !== empleadorId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // Obtener todas las postulaciones (incluyendo rechazadas para mostrar historial)
    const { data: postulaciones, error: posError } = await supabase
      .from('postulaciones')
      .select('id, estado, trabajador_id')
      .eq('chamba_id', chambaId)
      .order('creado_en', { ascending: true });

    if (posError || !postulaciones || postulaciones.length === 0) {
      return NextResponse.json({ postulantes: [] });
    }

    const trabajadorIds = [...new Set(postulaciones.map((p) => p.trabajador_id))];

    // Perfiles de trabajadores
    const { data: trabajadores } = await supabase
      .from('usuarios')
      .select('id, nombres, apellido_paterno, apellido_materno, rut, promedio_valoracion')
      .in('id', trabajadorIds);

    // Imágenes de trabajadores
    const { data: imagenes } = await supabase
      .from('user_imagenes')
      .select('user_id, image_data_url')
      .in('user_id', trabajadorIds);

    const trabajadoresMap = new Map((trabajadores ?? []).map((t) => [t.id, t]));
    const imagenesMap = new Map((imagenes ?? []).map((img) => [img.user_id, img.image_data_url]));

    const postulantes = postulaciones.map((p) => {
      const t = trabajadoresMap.get(p.trabajador_id);
      return {
        postulacion_id: p.id,
        estado: p.estado as string,
        trabajador: {
          id: p.trabajador_id,
          nombres: t?.nombres ?? 'Usuario',
          apellido_paterno: t?.apellido_paterno ?? '',
          apellido_materno: t?.apellido_materno ?? null,
          rut: t?.rut ?? null,
          promedio_valoracion: t?.promedio_valoracion ?? null,
          imagen_url: imagenesMap.get(p.trabajador_id) ?? null,
        },
      };
    });

    return NextResponse.json({ postulantes });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
