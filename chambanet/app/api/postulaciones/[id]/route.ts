import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../lib/supabase'; 

type PatchContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: PatchContext) {
  try {
    // 1. EL FIX: En las versiones nuevas de Next.js, hay que "esperar" los parámetros de la URL
    const { id: postulacion_id } = await context.params; 

    const body = await request.json();
    const { accion } = body;

    if (accion !== 'ACEPTAR' && accion !== 'RECHAZAR') {
      return NextResponse.json({ error: 'Acción no válida. Envía "ACEPTAR" o "RECHAZAR".' }, { status: 400 });
    }

    // 2. Buscamos la postulación
    const { data: postulacion, error: fetchError } = await supabase
      .from('postulaciones')
      .select('chamba_id')
      .eq('id', postulacion_id)
      .single();

    if (fetchError || !postulacion) {
       return NextResponse.json({ 
         error: 'Postulación no encontrada.', 
         id_que_llego_a_la_api: postulacion_id,
         detalle_de_supabase: fetchError
       }, { status: 404 });
    }

    // Rechazar individualmente sin afectar los demás postulantes
    if (accion === 'RECHAZAR') {
      await supabase.from('postulaciones').update({ estado: 'RECHAZADA' }).eq('id', postulacion_id);
      return NextResponse.json({ mensaje: 'Postulante rechazado.' }, { status: 200 });
    }

    const chamba_id = postulacion.chamba_id;

    // ACEPTAR: acepta a este, rechaza a los demás y cambia la chamba a EN_OBRA
    await supabase.from('postulaciones').update({ estado: 'ACEPTADA' }).eq('id', postulacion_id);
    await supabase.from('postulaciones').update({ estado: 'RECHAZADA' }).eq('chamba_id', chamba_id).neq('id', postulacion_id);
    await supabase.from('chambas').update({ estado: 'EN_OBRA' }).eq('id', chamba_id);

    return NextResponse.json({ mensaje: '¡Trabajador aceptado con éxito! La chamba ahora está EN OBRA.' }, { status: 200 });

  } catch (error: unknown) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error interno del servidor.', detalle }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: PatchContext) {
  try {
    const { id: postulacion_id } = await context.params;

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    }

    const trabajador_id = authData.user.id;

    const { data: postulacion, error: fetchError } = await supabase
      .from('postulaciones')
      .select('id, trabajador_id, estado')
      .eq('id', postulacion_id)
      .maybeSingle();

    if (fetchError || !postulacion) {
      return NextResponse.json({ error: 'Postulación no encontrada.' }, { status: 404 });
    }

    if (postulacion.trabajador_id !== trabajador_id) {
      return NextResponse.json({ error: 'No tienes permiso para cancelar esta postulación.' }, { status: 403 });
    }

    if (postulacion.estado !== 'PENDIENTE') {
      return NextResponse.json({ error: 'Solo puedes cancelar postulaciones en estado PENDIENTE.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('postulaciones')
      .delete()
      .eq('id', postulacion_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ mensaje: 'Postulación cancelada exitosamente.' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}