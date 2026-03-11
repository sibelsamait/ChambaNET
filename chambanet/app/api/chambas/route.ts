import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Asegúrate de que sube 3 niveles hasta la carpeta lib

export async function POST(request: Request) {
  try {
    // 1. Recibir los datos de Postman
    const body = await request.json();
    const { 
      empleador_id, titulo, descripcion, pago_clp, 
      horario, ubicacion_lat, ubicacion_lng, direccion_texto 
    } = body;

    // Validación básica de que no envíen datos vacíos
    if (!empleador_id || !titulo || !pago_clp) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (empleador, título o pago).' }, { status: 400 });
    }

    // 2. REGLA DE NEGOCIO: Contar cuántas chambas ACTIVAS tiene este usuario
    // Consideramos "activas" las que no están Finalizadas ni Canceladas.
    const { count, error: countError } = await supabase
      .from('chambas')
      .select('*', { count: 'exact', head: true })
      .eq('empleador_id', empleador_id)
      .in('estado', ['PUBLICADA', 'CON_POSTULANTES', 'EN_OBRA', 'ESPERANDO_APROBACION']);

    if (countError) {
      return NextResponse.json({ error: 'Error al verificar el historial del usuario.' }, { status: 500 });
    }

    // Si ya tiene 5 o más, bloqueamos la petición con un error 403 (Prohibido)
    if (count !== null && count >= 5) {
      return NextResponse.json({ 
        error: 'Límite alcanzado: No puedes tener más de 5 chambas activas al mismo tiempo.' 
      }, { status: 403 });
    }

    // 3. Si pasa la validación, insertamos la nueva chamba en la base de datos
    const { data, error } = await supabase
      .from('chambas')
      .insert([
        {
          empleador_id,
          titulo,
          descripcion,
          pago_clp,
          horario,
          ubicacion_lat,
          ubicacion_lng,
          direccion_texto,
          estado: 'PUBLICADA' // Estado inicial por defecto
        }
      ])
      .select(); // El .select() hace que Supabase nos devuelva el objeto recién creado

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 4. Devolver éxito
    return NextResponse.json({ 
      mensaje: 'Chamba publicada exitosamente', 
      chamba: data[0] 
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}