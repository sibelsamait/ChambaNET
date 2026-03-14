import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../lib/supabase'; // 3 niveles arriba

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión para postular.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const body = await request.json();
    const { chamba_id } = body;
    const trabajador_id = authData.user.id;

    if (!chamba_id) {
      return NextResponse.json({ error: 'Falta dato obligatorio (chamba_id).' }, { status: 400 });
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