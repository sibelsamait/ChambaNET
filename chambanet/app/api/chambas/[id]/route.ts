import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { getAverageRatingsByUserIds } from '../../../../lib/ratings';

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

    // 2.1 Postulante/trabajador activo (ACEPTADA)
    const { data: postulacionAceptada } = await supabase
      .from('postulaciones')
      .select('trabajador_id')
      .eq('chamba_id', chambaId)
      .eq('estado', 'ACEPTADA')
      .maybeSingle();

    const trabajadorActivoId = postulacionAceptada?.trabajador_id ?? null;

    const { data: trabajadorActivoPerfil } = trabajadorActivoId
      ? await supabase
          .from('usuarios')
          .select('id, nombres, apellido_paterno, apellido_materno, rut, email, telefono, fecha_nacimiento, direccion_completa')
          .eq('id', trabajadorActivoId)
          .maybeSingle()
      : { data: null };

    const { data: trabajadorActivoImagen } = trabajadorActivoId
      ? await supabase
          .from('user_imagenes')
          .select('image_data_url')
          .eq('user_id', trabajadorActivoId)
          .maybeSingle()
      : { data: null };

    // 3. ¿Ya postuló el usuario actual?
    let yaPostule = false;
    let postulacionId: string | null = null;
    let miPostulacionEstado: string | null = null;
    if (userId) {
      const { data: postulacion } = await supabase
        .from('postulaciones')
        .select('id, estado')
        .eq('chamba_id', chambaId)
        .eq('trabajador_id', userId)
        .in('estado', ['PENDIENTE', 'ACEPTADA'])
        .maybeSingle();

      if (postulacion) {
        yaPostule = true;
        postulacionId = postulacion.id;
        miPostulacionEstado = postulacion.estado;
      }
    }

    // 3.1 Permisos y estado para cierre / valoración
    const esEmpleador = userId ? userId === chamba.empleador_id : false;
    const esTrabajadorActivo = userId ? userId === trabajadorActivoId : false;
    const puedeSolicitarCierre = Boolean(esTrabajadorActivo && chamba.estado === 'EN_OBRA');
    const puedeAprobarCierre = Boolean(esEmpleador && chamba.estado === 'ESPERANDO_APROBACION');

    let puedeValorar = false;
    let yaValore = false;
    let receptorValoracionId: string | null = null;
    let receptorValoracionNombre: string | null = null;
    let valoracionEmpleadorCompleta = false;
    let valoracionTrabajadorCompleta = false;
    let cierreHabilitadoPorValoraciones = false;

    if (trabajadorActivoId) {
      const { data: valoracionesPareja } = await supabase
        .from('valoraciones')
        .select('emisor_id, receptor_id')
        .eq('chamba_id', chambaId)
        .in('emisor_id', [chamba.empleador_id, trabajadorActivoId])
        .in('receptor_id', [chamba.empleador_id, trabajadorActivoId]);

      valoracionEmpleadorCompleta = Boolean(
        valoracionesPareja?.some(
          (v) => v.emisor_id === chamba.empleador_id && v.receptor_id === trabajadorActivoId
        )
      );

      valoracionTrabajadorCompleta = Boolean(
        valoracionesPareja?.some(
          (v) => v.emisor_id === trabajadorActivoId && v.receptor_id === chamba.empleador_id
        )
      );

      cierreHabilitadoPorValoraciones = valoracionEmpleadorCompleta && valoracionTrabajadorCompleta;
    }

    if (userId && (chamba.estado === 'FINALIZADA' || chamba.estado === 'ESPERANDO_APROBACION')) {
      if (esEmpleador && trabajadorActivoId) {
        receptorValoracionId = trabajadorActivoId;
        receptorValoracionNombre = trabajadorActivoPerfil
          ? `${trabajadorActivoPerfil.nombres} ${trabajadorActivoPerfil.apellido_paterno}`.trim()
          : 'Trabajador';
      } else if (esTrabajadorActivo) {
        receptorValoracionId = chamba.empleador_id;
      }

      if (receptorValoracionId) {
        const { data: valoracionExistente } = await supabase
          .from('valoraciones')
          .select('id')
          .eq('chamba_id', chambaId)
          .eq('emisor_id', userId)
          .eq('receptor_id', receptorValoracionId)
          .maybeSingle();

        yaValore = Boolean(valoracionExistente);
        puedeValorar = !yaValore;

        if (!receptorValoracionNombre && receptorValoracionId === chamba.empleador_id) {
          receptorValoracionNombre = 'Empleador';
        }
      }
    }

    // 4. Datos del empleador
    const { data: empleador } = await supabase
      .from('usuarios')
      .select('id, nombres, apellido_paterno, apellido_materno, rut, email, telefono, fecha_nacimiento, direccion_completa')
      .eq('id', chamba.empleador_id)
      .maybeSingle();

    const empleadorRatingMap = await getAverageRatingsByUserIds([chamba.empleador_id]);
    const empleadorPromedio = empleadorRatingMap.get(chamba.empleador_id) ?? null;

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
    let { data: valoracionesRaw, error: valoracionesError } = await supabase
      .from('valoraciones')
      .select('estrellas, comentario, emisor_id')
      .eq('receptor_id', chamba.empleador_id)
      .order('creado_en', { ascending: false })
      .limit(10);

    if (valoracionesError) {
      const fallback = await supabase
        .from('valoraciones')
        .select('estrellas, comentario, emisor_id')
        .eq('receptor_id', chamba.empleador_id)
        .order('created_at', { ascending: false })
        .limit(10);

      valoracionesRaw = fallback.data;
      valoracionesError = fallback.error;
    }

    if (valoracionesError) {
      const fallback = await supabase
        .from('valoraciones')
        .select('estrellas, comentario, emisor_id')
        .eq('receptor_id', chamba.empleador_id)
        .limit(10);

      valoracionesRaw = fallback.data;
    }

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

    if (receptorValoracionId === chamba.empleador_id && empleador) {
      receptorValoracionNombre = `${empleador.nombres ?? ''} ${empleador.apellido_paterno ?? ''}`.trim() || 'Empleador';
    }

    return NextResponse.json({
      chamba,
      postulantes_count: postulantesCount ?? 0,
      ya_postule: yaPostule,
      postulacion_id: postulacionId,
      mi_postulacion_estado: miPostulacionEstado,
      trabajador_activo: trabajadorActivoPerfil
        ? {
            id: trabajadorActivoPerfil.id,
            nombres: trabajadorActivoPerfil.nombres,
            apellido_paterno: trabajadorActivoPerfil.apellido_paterno,
            apellido_materno: trabajadorActivoPerfil.apellido_materno ?? null,
            rut: trabajadorActivoPerfil.rut ?? null,
            email: trabajadorActivoPerfil.email ?? null,
            telefono: trabajadorActivoPerfil.telefono ?? null,
            fecha_nacimiento: trabajadorActivoPerfil.fecha_nacimiento ?? null,
            direccion_completa: trabajadorActivoPerfil.direccion_completa ?? null,
            imagen_url: trabajadorActivoImagen?.image_data_url ?? null,
          }
        : null,
      puede_solicitar_cierre: puedeSolicitarCierre,
      puede_aprobar_cierre: puedeAprobarCierre,
      puede_valorar: puedeValorar,
      ya_valore: yaValore,
      valoracion_empleador_completa: valoracionEmpleadorCompleta,
      valoracion_trabajador_completa: valoracionTrabajadorCompleta,
      cierre_habilitado_por_valoraciones: cierreHabilitadoPorValoraciones,
      receptor_valoracion_id: receptorValoracionId,
      receptor_valoracion_nombre: receptorValoracionNombre,
      empleador: {
        ...(empleador ?? {}),
        promedio_valoracion: empleadorPromedio,
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
