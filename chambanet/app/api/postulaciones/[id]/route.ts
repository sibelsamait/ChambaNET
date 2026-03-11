import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase'; 

export async function PATCH(request: Request, context: any) {
  try {
    // 1. EL FIX: En las versiones nuevas de Next.js, hay que "esperar" los parámetros de la URL
    const { id: postulacion_id } = await context.params; 

    const body = await request.json();
    const { accion } = body;

    if (accion !== 'ACEPTAR') {
      return NextResponse.json({ error: 'Acción no válida. Envía "ACEPTAR".' }, { status: 400 });
    }

    // 2. Buscamos la postulación
    const { data: postulacion, error: fetchError } = await supabase
      .from('postulaciones')
      .select('chamba_id')
      .eq('id', postulacion_id)
      .single();

    // 3. EL CHISMOSO: Si falla, ahora Postman te dirá EXACTAMENTE qué ID buscó y por qué falló
    if (fetchError || !postulacion) {
       return NextResponse.json({ 
         error: 'Postulación no encontrada.', 
         id_que_llego_a_la_api: postulacion_id,
         detalle_de_supabase: fetchError
       }, { status: 404 });
    }

    const chamba_id = postulacion.chamba_id;

    // 4. Aceptar la postulación
    await supabase.from('postulaciones').update({ estado: 'ACEPTADA' }).eq('id', postulacion_id);

    // 5. Rechazar a los demás
    await supabase.from('postulaciones').update({ estado: 'RECHAZADA' }).eq('chamba_id', chamba_id).neq('id', postulacion_id);

    // 6. Cambiar chamba a EN_OBRA
    await supabase.from('chambas').update({ estado: 'EN_OBRA' }).eq('id', chamba_id);

    return NextResponse.json({ mensaje: '¡Trabajador aceptado con éxito! La chamba ahora está EN OBRA.' }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor.', detalle: error.message }, { status: 500 });
  }
}