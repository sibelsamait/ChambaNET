import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../../lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: chambaId } = await context.params;

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    }

    const userId = authData.user.id;

    const body = await request.json();
    const accion = String(body?.accion || '').trim().toUpperCase();

    if (accion !== 'SOLICITAR_CIERRE' && accion !== 'APROBAR_CIERRE') {
      return NextResponse.json(
        { error: 'Acción no válida. Usa SOLICITAR_CIERRE o APROBAR_CIERRE.' },
        { status: 400 }
      );
    }

    const { data: chamba, error: chambaError } = await supabase
      .from('chambas')
      .select('id, empleador_id, estado')
      .eq('id', chambaId)
      .maybeSingle();

    if (chambaError || !chamba) {
      return NextResponse.json({ error: 'Chamba no encontrada.' }, { status: 404 });
    }

    const { data: postulacionActiva, error: posError } = await supabase
      .from('postulaciones')
      .select('id, trabajador_id')
      .eq('chamba_id', chambaId)
      .eq('estado', 'ACEPTADA')
      .maybeSingle();

    if (posError || !postulacionActiva) {
      return NextResponse.json({ error: 'No existe trabajador activo para esta chamba.' }, { status: 400 });
    }

    const trabajadorId = postulacionActiva.trabajador_id;

    if (accion === 'SOLICITAR_CIERRE') {
      if (chamba.estado !== 'EN_OBRA') {
        return NextResponse.json(
          { error: 'Solo se puede solicitar cierre cuando la chamba está EN_OBRA.' },
          { status: 400 }
        );
      }

      if (trabajadorId !== userId) {
        return NextResponse.json(
          { error: 'Solo el trabajador activo puede solicitar el cierre.' },
          { status: 403 }
        );
      }

      const { error: updateError } = await supabase
        .from('chambas')
        .update({ estado: 'ESPERANDO_APROBACION' })
        .eq('id', chambaId);

      if (updateError) {
        return NextResponse.json({ error: 'No se pudo solicitar el cierre de la chamba.' }, { status: 500 });
      }

      return NextResponse.json(
        { mensaje: 'Solicitud de finalización enviada. Esperando aprobación del empleador.', estado: 'ESPERANDO_APROBACION' },
        { status: 200 }
      );
    }

    // APROBAR_CIERRE
    if (chamba.empleador_id !== userId) {
      return NextResponse.json({ error: 'Solo el empleador puede aprobar el cierre.' }, { status: 403 });
    }

    if (chamba.estado !== 'ESPERANDO_APROBACION') {
      return NextResponse.json(
        { error: 'La chamba debe estar en ESPERANDO_APROBACION para finalizar.' },
        { status: 400 }
      );
    }

    const { data: valoraciones, error: valoracionesError } = await supabase
      .from('valoraciones')
      .select('emisor_id, receptor_id')
      .eq('chamba_id', chambaId)
      .in('emisor_id', [chamba.empleador_id, trabajadorId])
      .in('receptor_id', [chamba.empleador_id, trabajadorId]);

    if (valoracionesError) {
      return NextResponse.json(
        { error: 'No se pudieron validar las valoraciones obligatorias.' },
        { status: 500 }
      );
    }

    const empleadorValoro = Boolean(
      valoraciones?.some(
        (v) => v.emisor_id === chamba.empleador_id && v.receptor_id === trabajadorId
      )
    );

    const trabajadorValoro = Boolean(
      valoraciones?.some(
        (v) => v.emisor_id === trabajadorId && v.receptor_id === chamba.empleador_id
      )
    );

    if (!empleadorValoro || !trabajadorValoro) {
      const faltantes: string[] = [];
      if (!empleadorValoro) faltantes.push('falta la valoración del empleador al trabajador');
      if (!trabajadorValoro) faltantes.push('falta la valoración del trabajador al empleador');

      return NextResponse.json(
        {
          error: `No se puede cerrar la chamba: ${faltantes.join(' y ')}. Ambas valoraciones son obligatorias.`,
        },
        { status: 400 }
      );
    }

    const { error: finalizarError } = await supabase
      .from('chambas')
      .update({ estado: 'FINALIZADA' })
      .eq('id', chambaId);

    if (finalizarError) {
      return NextResponse.json({ error: 'No se pudo finalizar la chamba.' }, { status: 500 });
    }

    return NextResponse.json(
      { mensaje: 'Chamba finalizada exitosamente.', estado: 'FINALIZADA' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
