import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase'; // Ajusta la ruta de importación según tu alias

export async function POST(request: Request) {
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

    const body = await request.json();
    const { chamba_id, receptor_id, estrellas, comentario } = body;
    const emisor_id = authData.user.id;

    // 1. Validación de campos obligatorios
    if (!chamba_id || !receptor_id || estrellas === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (chamba_id, receptor_id, estrellas).' },
        { status: 400 }
      );
    }

    if (emisor_id === receptor_id) {
      return NextResponse.json(
        { error: 'No puedes valorarte a ti mismo.' },
        { status: 400 }
      );
    }

    // 2. Validación de regla de negocio: Rango de estrellas
    if (typeof estrellas !== 'number' || estrellas < 1 || estrellas > 5) {
      return NextResponse.json(
        { error: 'El valor de las estrellas debe ser un número entre 1 y 5.' },
        { status: 400 }
      );
    }

    // 3. Reglas de negocio para habilitar valoración
    const { data: chamba, error: chambaError } = await supabase
      .from('chambas')
      .select('id, empleador_id, estado')
      .eq('id', chamba_id)
      .maybeSingle();

    if (chambaError || !chamba) {
      return NextResponse.json({ error: 'Chamba no encontrada.' }, { status: 404 });
    }

    if (chamba.estado !== 'FINALIZADA' && chamba.estado !== 'ESPERANDO_APROBACION') {
      return NextResponse.json(
        { error: 'Solo se puede valorar una chamba en ESPERANDO_APROBACION o FINALIZADA.' },
        { status: 400 }
      );
    }

    const { data: postulacionAceptada } = await supabase
      .from('postulaciones')
      .select('trabajador_id')
      .eq('chamba_id', chamba_id)
      .eq('estado', 'ACEPTADA')
      .maybeSingle();

    const trabajadorId = postulacionAceptada?.trabajador_id;

    if (!trabajadorId) {
      return NextResponse.json(
        { error: 'No existe un trabajador aceptado para esta chamba.' },
        { status: 400 }
      );
    }

    const emisorEsEmpleador = emisor_id === chamba.empleador_id;
    const emisorEsTrabajador = emisor_id === trabajadorId;

    if (!emisorEsEmpleador && !emisorEsTrabajador) {
      return NextResponse.json(
        { error: 'No puedes valorar esta chamba.' },
        { status: 403 }
      );
    }

    if (emisorEsEmpleador && receptor_id !== trabajadorId) {
      return NextResponse.json(
        { error: 'El empleador solo puede valorar al trabajador activo.' },
        { status: 400 }
      );
    }

    if (emisorEsTrabajador && receptor_id !== chamba.empleador_id) {
      return NextResponse.json(
        { error: 'El trabajador solo puede valorar al empleador de la chamba.' },
        { status: 400 }
      );
    }

    const { data: valoracionExistente } = await supabase
      .from('valoraciones')
      .select('id')
      .eq('chamba_id', chamba_id)
      .eq('emisor_id', emisor_id)
      .eq('receptor_id', receptor_id)
      .maybeSingle();

    if (valoracionExistente) {
      return NextResponse.json(
        { error: 'Ya registraste una valoración para esta contraparte en esta chamba.' },
        { status: 409 }
      );
    }

    // 4. Inserción en Supabase
    // El trigger que configuramos previamente se encargará de actualizar el promedio en la tabla 'usuarios'
    const { data, error } = await supabase
      .from('valoraciones')
      .insert([
        {
          chamba_id,
          emisor_id,
          receptor_id,
          estrellas,
          comentario: comentario || null, // El comentario es opcional
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error en Supabase:', error);
      return NextResponse.json(
        { error: 'Error al registrar la valoración en la base de datos.' },
        { status: 500 }
      );
    }

    // 5. Respuesta exitosa
    return NextResponse.json(
      { message: 'Valoración registrada con éxito.', data },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error interno del servidor:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar la solicitud.' },
      { status: 500 }
    );
  }
}