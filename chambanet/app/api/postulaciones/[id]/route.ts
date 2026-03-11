import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase'; // 4 niveles arriba

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const postulacion_id = params.id;
    const body = await request.json();
    const { accion } = body;

    if (accion !== 'ACEPTAR') {
      return NextResponse.json({ error: 'Acción no válida. Envía "ACEPTAR".' }, { status: 400 });
    }

    // 1. Obtener la postulación para saber a qué chamba pertenece
    const { data: postulacion, error: fetchError } = await supabase
      .from('postulaciones')
      .select('chamba_id')
      .eq('id', postulacion_id)
      .single();

    if (fetchError || !postulacion) {
       return NextResponse.json({ error: 'Postulación no encontrada.' }, { status: 404 });
    }

    const chamba_id = postulacion.chamba_id;

    // 2. Aceptar esta postulación
    await supabase
      .from('postulaciones')
      .update({ estado: 'ACEPTADA' })
      .eq('id', postulacion_id);

    // 3. Rechazar automáticamente al resto de postulantes para esta misma chamba
    await supabase
      .from('postulaciones')
      .update({ estado: 'RECHAZADA' })
      .eq('chamba_id', chamba_id)
      .neq('id', postulacion_id); // .neq significa "No es igual a"

    // 4. Cambiar el estado de la chamba a EN_OBRA
    await supabase
      .from('chambas')
      .update({ estado: 'EN_OBRA' })
      .eq('id', chamba_id);

    return NextResponse.json({ 
      mensaje: '¡Trabajador aceptado con éxito! La chamba ahora está EN OBRA.' 
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}