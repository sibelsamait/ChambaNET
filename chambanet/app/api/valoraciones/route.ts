import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ajusta la ruta de importación según tu alias

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chamba_id, emisor_id, receptor_id, estrellas, comentario } = body;

    // 1. Validación de campos obligatorios
    if (!chamba_id || !emisor_id || !receptor_id || estrellas === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (chamba_id, emisor_id, receptor_id, estrellas).' },
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

    // 3. Inserción en Supabase
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

    // 4. Respuesta exitosa
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