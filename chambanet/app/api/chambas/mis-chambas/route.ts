import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

interface MiChambaItem {
  id: string;
  titulo: string;
  pago_clp: number;
  estado: string;
  rol: 'empleador' | 'postulante';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId requerido.' }, { status: 400 });
  }

  const [{ data: propias, error: e1 }, { data: postulaciones, error: e2 }] = await Promise.all([
    supabase
      .from('chambas')
      .select('id, titulo, pago_clp, estado')
      .eq('empleador_id', userId)
      .in('estado', ['PUBLICADA', 'CON_POSTULANTES', 'EN_OBRA', 'ESPERANDO_APROBACION'])
      .order('creado_en', { ascending: false }),
    supabase
      .from('postulaciones')
      .select('chamba:chambas(id, titulo, pago_clp, estado)')
      .eq('trabajador_id', userId)
      .in('estado', ['PENDIENTE', 'ACEPTADA']),
  ]);

  if (e1 || e2) {
    return NextResponse.json({ error: 'Error al cargar tus chambas.' }, { status: 500 });
  }

  const resultado: MiChambaItem[] = [
    ...(propias || []).map((c) => ({ ...c, rol: 'empleador' as const })),
    ...(postulaciones || []).flatMap((p) => {
      const c = (p.chamba as unknown) as { id: string; titulo: string; pago_clp: number; estado: string } | null;
      return c ? [{ ...c, rol: 'postulante' as const }] : [];
    }),
  ];

  return NextResponse.json({ chambas: resultado });
}
