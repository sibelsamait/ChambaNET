import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

type EvidenciaInput = {
  nombre: string;
  tamano: number;
  tipo: string;
  fecha: string;
};

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
    return { userId: null as string | null, error: 'No autenticado.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return { userId: null as string | null, error: 'Sesión inválida o expirada.' };
  }

  return { userId: authData.user.id, error: null as string | null };
}

async function getChambaContext(chambaId: string) {
  const { data: chamba, error: chambaError } = await supabase
    .from('chambas')
    .select('id, empleador_id')
    .eq('id', chambaId)
    .maybeSingle();

  if (chambaError || !chamba) {
    return { chamba: null, trabajadorId: null as string | null, error: 'Chamba no encontrada.' };
  }

  const { data: postulacionAceptada } = await supabase
    .from('postulaciones')
    .select('trabajador_id')
    .eq('chamba_id', chambaId)
    .eq('estado', 'ACEPTADA')
    .maybeSingle();

  return {
    chamba,
    trabajadorId: postulacionAceptada?.trabajador_id ?? null,
    error: null as string | null,
  };
}

function normalizarEvidencias(raw: unknown): EvidenciaInput[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Partial<EvidenciaInput>;
      if (!row.nombre || !row.fecha) return null;

      return {
        nombre: String(row.nombre),
        tamano: Number(row.tamano) || 0,
        tipo: String(row.tipo || 'application/octet-stream'),
        fecha: String(row.fecha),
      };
    })
    .filter((item): item is EvidenciaInput => Boolean(item));
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: chambaId } = await context.params;

    const { userId, error } = await getAuthenticatedUserId();
    if (error || !userId) {
      return NextResponse.json({ error: error || 'No autenticado.' }, { status: 401 });
    }

    const { chamba, trabajadorId, error: ctxError } = await getChambaContext(chambaId);
    if (ctxError || !chamba) {
      return NextResponse.json({ error: ctxError || 'Chamba no encontrada.' }, { status: 404 });
    }

    const autorizado = userId === chamba.empleador_id || userId === trabajadorId;
    if (!autorizado) {
      return NextResponse.json({ error: 'No autorizado para ver evidencias de esta chamba.' }, { status: 403 });
    }

    const primero = await supabase
      .from('chamba_evidencias')
      .select('id, uploader_id, archivos, creado_en')
      .eq('chamba_id', chambaId)
      .order('creado_en', { ascending: false });

    let evidenciasRows: Array<{ uploader_id?: string; archivos?: unknown }> = (primero.data || []) as Array<{
      uploader_id?: string;
      archivos?: unknown;
    }>;
    let evidenciasError = primero.error;

    if (evidenciasError) {
      const fallback = await supabase
        .from('chamba_evidencias')
        .select('id, uploader_id, archivos, created_at')
        .eq('chamba_id', chambaId)
        .order('created_at', { ascending: false });

      evidenciasRows = (fallback.data || []) as Array<{ uploader_id?: string; archivos?: unknown }>;
      evidenciasError = fallback.error;
    }

    if (evidenciasError) {
      if ((evidenciasError as { code?: string }).code === '42P01') {
        return NextResponse.json({ evidencias: [] }, { status: 200 });
      }
      return NextResponse.json({ error: 'No se pudieron cargar las evidencias.' }, { status: 500 });
    }

    const evidencias = evidenciasRows.flatMap((row) => {
      const archivos = normalizarEvidencias((row as { archivos?: unknown }).archivos);
      return archivos.map((archivo) => ({
        ...archivo,
        uploader_id: (row as { uploader_id?: string }).uploader_id ?? null,
      }));
    });

    return NextResponse.json({ evidencias }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: chambaId } = await context.params;

    const { userId, error } = await getAuthenticatedUserId();
    if (error || !userId) {
      return NextResponse.json({ error: error || 'No autenticado.' }, { status: 401 });
    }

    const { chamba, trabajadorId, error: ctxError } = await getChambaContext(chambaId);
    if (ctxError || !chamba) {
      return NextResponse.json({ error: ctxError || 'Chamba no encontrada.' }, { status: 404 });
    }

    const autorizado = userId === chamba.empleador_id || userId === trabajadorId;
    if (!autorizado) {
      return NextResponse.json({ error: 'No autorizado para registrar evidencias en esta chamba.' }, { status: 403 });
    }

    const body = await request.json();
    const evidencias = normalizarEvidencias(body?.evidencias);

    if (evidencias.length === 0) {
      return NextResponse.json({ error: 'Debes enviar al menos una evidencia válida.' }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from('chamba_evidencias')
      .insert([
        {
          chamba_id: chambaId,
          uploader_id: userId,
          archivos: evidencias,
        },
      ]);

    if (insertError) {
      if ((insertError as { code?: string }).code === '42P01') {
        return NextResponse.json(
          { error: 'La tabla de evidencias no existe aún. Ejecuta el SQL de migración.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: 'No se pudo registrar la evidencia.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Evidencias registradas con éxito.' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
