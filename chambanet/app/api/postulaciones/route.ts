import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // 3 niveles arriba

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chamba_id, trabajador_id } = body;

    if (!chamba_id || !trabajador_id) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (chamba_id o trabajador_id).' }, { status: 400 });
    }

    // REGLA DE NEGOCIO: Verificar si el trabajador ya tiene una postulación ACTIVA o ACEPTADA
    const { count, error: countError } = await supabase
      .from('postulaciones')
      .select('*', { count: 'exact', head: true })
      .eq('trabajador_id', trabajador_id)
      .in('estado', ['PENDIENTE', 'ACEPTADA']);

    if (countError) {
      return NextResponse.json({ error: 'Error al verificar el historial del trabajador.' }, { status: 500 });
    }

    // Si el contador es 1 o mayor, lo bloqueamos
    if (count !== null && count >= 1) {
      return NextResponse.json({ 
        error: 'Límite alcanzado: Ya tienes una postulación en curso o una chamba activa. Debes terminarla antes de tomar otra.' 
      }, { status: 403 });
    }

    // Si pasa la validación, insertamos la postulación
    const { data, error } = await supabase
      .from('postulaciones')
      .insert([
        { chamba_id, trabajador_id, estado: 'PENDIENTE' }
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      mensaje: 'Postulación enviada con éxito', 
      postulacion: data[0] 
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}