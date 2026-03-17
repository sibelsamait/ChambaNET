import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Asegúrate de que sube 3 niveles hasta la carpeta lib

type ChambaPayload = {
  titulo?: string;
  descripcion?: string;
  pago_clp?: number;
  horario?: string;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  direccion_texto?: string;
};

async function validarPayloadChamba(payload: ChambaPayload): Promise<string | null> {
  const titulo = payload.titulo?.trim() || '';
  const descripcion = payload.descripcion?.trim() || '';
  const pago = Number(payload.pago_clp);

  if (titulo.length < 8) {
    return 'El título debe tener al menos 8 caracteres.';
  }

  if (descripcion.length < 15) {
    return 'La descripción debe tener al menos 15 caracteres.';
  }

  if (!Number.isFinite(pago) || pago < 1000) {
    return 'El pago mínimo permitido es CLP$ 1.000.';
  }

  if (!payload.horario) {
    return 'La fecha y hora son obligatorias.';
  }

  const fecha = new Date(payload.horario);
  if (Number.isNaN(fecha.getTime()) || fecha <= new Date()) {
    return 'La fecha y hora deben ser futuras.';
  }

  return null;
}

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

    const validationError = await validarPayloadChamba({
      titulo,
      descripcion,
      pago_clp,
      horario,
      ubicacion_lat,
      ubicacion_lng,
      direccion_texto,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
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

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Buscamos todas las chambas con estado PUBLICADA
    // Usamos select() para traer los datos de la chamba + los datos básicos del empleador vinculados por el ID
    const { data, error } = await supabase
      .from('chambas')
      .select(`
        *,
        empleador:usuarios (
          nombres,
          apellido_paterno,
          promedio_valoracion
        )
      `)
      .eq('estado', 'PUBLICADA')
      .order('creado_en', { ascending: false }); // Las más nuevas primero

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      mensaje: 'Chambas recuperadas con éxito',
      total: data.length,
      chambas: data 
    }, { status: 200 });

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor al listar chambas.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      chamba_id,
      empleador_id,
      titulo,
      descripcion,
      pago_clp,
      horario,
      ubicacion_lat,
      ubicacion_lng,
      direccion_texto,
    } = body;

    if (!chamba_id || !empleador_id || !titulo || !pago_clp) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para editar la chamba.' }, { status: 400 });
    }

    const validationError = await validarPayloadChamba({
      titulo,
      descripcion,
      pago_clp,
      horario,
      ubicacion_lat,
      ubicacion_lng,
      direccion_texto,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data: chamba, error: checkError } = await supabase
      .from('chambas')
      .select('id, empleador_id')
      .eq('id', chamba_id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: 'No se pudo validar la propiedad de la chamba.' }, { status: 500 });
    }

    if (!chamba) {
      return NextResponse.json({ error: 'La chamba no existe o ya fue eliminada.' }, { status: 404 });
    }

    if (chamba.empleador_id !== empleador_id) {
      return NextResponse.json({ error: 'No tienes permisos para editar esta publicación.' }, { status: 403 });
    }

    const { error: postulacionesDeleteError } = await supabase
      .from('postulaciones')
      .delete()
      .eq('chamba_id', chamba_id);

    if (postulacionesDeleteError) {
      return NextResponse.json({ error: 'No se pudieron eliminar las postulaciones asociadas.' }, { status: 400 });
    }

    const { data: updatedChamba, error: updateError } = await supabase
      .from('chambas')
      .update({
        titulo,
        descripcion,
        pago_clp,
        horario,
        ubicacion_lat,
        ubicacion_lng,
        direccion_texto,
        estado: 'PUBLICADA',
      })
      .eq('id', chamba_id)
      .eq('empleador_id', empleador_id)
      .select()
      .maybeSingle();

    if (updateError || !updatedChamba) {
      return NextResponse.json({ error: updateError?.message || 'No se pudo editar la chamba.' }, { status: 400 });
    }

    return NextResponse.json({ mensaje: 'Chamba editada exitosamente.', chamba: updatedChamba }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor al editar la chamba.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { chamba_id, empleador_id } = body;

    if (!chamba_id || !empleador_id) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para eliminar la chamba.' }, { status: 400 });
    }

    // Seguridad: solo el dueño puede borrar su publicación
    const { data: chamba, error: checkError } = await supabase
      .from('chambas')
      .select('id, empleador_id')
      .eq('id', chamba_id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: 'No se pudo validar la propiedad de la chamba.' }, { status: 500 });
    }

    if (!chamba) {
      return NextResponse.json({ error: 'La chamba no existe o ya fue eliminada.' }, { status: 404 });
    }

    if (chamba.empleador_id !== empleador_id) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar esta publicación.' }, { status: 403 });
    }

    const { error: postulacionesDeleteError } = await supabase
      .from('postulaciones')
      .delete()
      .eq('chamba_id', chamba_id);

    if (postulacionesDeleteError) {
      return NextResponse.json({ error: 'No se pudieron eliminar las postulaciones asociadas.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('chambas')
      .delete()
      .eq('id', chamba_id)
      .eq('empleador_id', empleador_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ mensaje: 'Chamba eliminada exitosamente.' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor al eliminar la chamba.' }, { status: 500 });
  }
}