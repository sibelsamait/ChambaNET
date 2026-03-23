import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

interface MiChambaItem {
  id: string;
  titulo: string;
  pago_clp: number;
  estado: string;
  rol: 'empleador' | 'postulante';
  estado_postulacion?: string;
  valoracion_empleador_completa?: boolean;
  valoracion_trabajador_completa?: boolean;
  cierre_habilitado_por_valoraciones?: boolean;
  badge_alerta?: string | null;
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
      .select('id, titulo, pago_clp, estado, creado_en')
      .eq('empleador_id', userId)
      .order('creado_en', { ascending: false }),
    supabase
      .from('postulaciones')
      .select('estado, creado_en, chamba:chambas(id, titulo, pago_clp, estado, creado_en)')
      .eq('trabajador_id', userId)
      .order('creado_en', { ascending: false }),
  ]);

  if (e1 || e2) {
    return NextResponse.json({ error: 'Error al cargar tus chambas.' }, { status: 500 });
  }

  const propiasBase = propias || [];
  const propiasIds = propiasBase.map((c) => c.id);

  const trabajadorPorChamba = new Map<string, string>();
  if (propiasIds.length > 0) {
    const { data: aceptadas } = await supabase
      .from('postulaciones')
      .select('chamba_id, trabajador_id')
      .in('chamba_id', propiasIds)
      .eq('estado', 'ACEPTADA');

    (aceptadas || []).forEach((row) => {
      if (!trabajadorPorChamba.has(row.chamba_id)) {
        trabajadorPorChamba.set(row.chamba_id, row.trabajador_id);
      }
    });
  }

  const valoracionesPorChamba = new Map<string, Array<{ emisor_id: string; receptor_id: string }>>();
  if (propiasIds.length > 0) {
    const { data: valoraciones } = await supabase
      .from('valoraciones')
      .select('chamba_id, emisor_id, receptor_id')
      .in('chamba_id', propiasIds);

    (valoraciones || []).forEach((v) => {
      const arr = valoracionesPorChamba.get(v.chamba_id) ?? [];
      arr.push({ emisor_id: v.emisor_id, receptor_id: v.receptor_id });
      valoracionesPorChamba.set(v.chamba_id, arr);
    });
  }

  const propiasConFlags: MiChambaItem[] = propiasBase.map((c) => {
    const trabajadorId = trabajadorPorChamba.get(c.id);
    if (!trabajadorId) {
      return { ...c, rol: 'empleador' as const };
    }

    const valoraciones = valoracionesPorChamba.get(c.id) ?? [];
    const valoracionEmpleadorCompleta = valoraciones.some(
      (v) => v.emisor_id === userId && v.receptor_id === trabajadorId
    );
    const valoracionTrabajadorCompleta = valoraciones.some(
      (v) => v.emisor_id === trabajadorId && v.receptor_id === userId
    );
    const cierreHabilitadoPorValoraciones = valoracionEmpleadorCompleta && valoracionTrabajadorCompleta;

    const badgeAlerta =
      c.estado === 'ESPERANDO_APROBACION' && !cierreHabilitadoPorValoraciones
        ? 'Valoraciones pendientes'
        : null;

    return {
      ...c,
      rol: 'empleador' as const,
      valoracion_empleador_completa: valoracionEmpleadorCompleta,
      valoracion_trabajador_completa: valoracionTrabajadorCompleta,
      cierre_habilitado_por_valoraciones: cierreHabilitadoPorValoraciones,
      badge_alerta: badgeAlerta,
    };
  });

  const resultado: MiChambaItem[] = [
    ...propiasConFlags,
    ...(postulaciones || [])
      .flatMap((p) => {
        const c = (p.chamba as unknown) as {
          id: string;
          titulo: string;
          pago_clp: number;
          estado: string;
          creado_en?: string;
        } | null;
        return c
          ? [
              {
                ...c,
                rol: 'postulante' as const,
                estado_postulacion: p.estado,
              },
            ]
          : [];
      })
      .sort((a, b) => {
        const aTime = Date.parse((a as { creado_en?: string }).creado_en || '');
        const bTime = Date.parse((b as { creado_en?: string }).creado_en || '');
        return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      }),
  ];

  return NextResponse.json({ chambas: resultado });
}
