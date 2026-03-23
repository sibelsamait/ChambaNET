import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { getSupportAuthContext } from '../../../../lib/supportAuth';

type TicketTipo = 'PAGO' | 'CHAMBA' | 'REEMBOLSO' | 'LEGAL' | 'OTRO';
type TicketPrioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

const VALID_TIPOS: TicketTipo[] = ['PAGO', 'CHAMBA', 'REEMBOLSO', 'LEGAL', 'OTRO'];
const VALID_PRIORIDADES: TicketPrioridad[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

export async function GET() {
  const auth = await getSupportAuthContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { context } = auth;

  let query = supabase
    .from('support_tickets')
    .select('*')
    .order('actualizado_en', { ascending: false })
    .limit(200);

  if (!context.isSupportAdmin) {
    query = query.eq('creado_por', context.userId);
  }

  const { data: tickets, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los tickets de soporte.' }, { status: 500 });
  }

  return NextResponse.json({
    tickets: tickets || [],
    isSupportAdmin: context.isSupportAdmin,
  });
}

export async function POST(request: Request) {
  const auth = await getSupportAuthContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { context } = auth;

  try {
    const body = await request.json();

    const titulo = String(body?.titulo || '').trim();
    const descripcion = String(body?.descripcion || '').trim();
    const chambaId = body?.chambaId ? String(body.chambaId) : null;
    const tipo = String(body?.tipo || 'OTRO').trim().toUpperCase() as TicketTipo;
    const prioridad = String(body?.prioridad || 'MEDIA').trim().toUpperCase() as TicketPrioridad;
    const requiereRevisionLegal = Boolean(body?.requiereRevisionLegal);
    const consentimientoUsuario = Boolean(body?.consentimientoUsuario);

    if (titulo.length < 8 || descripcion.length < 20) {
      return NextResponse.json(
        { error: 'Título y descripción deben contener información suficiente (mín. 8 y 20 caracteres).' },
        { status: 400 }
      );
    }

    if (!VALID_TIPOS.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de ticket inválido.' }, { status: 400 });
    }

    if (!VALID_PRIORIDADES.includes(prioridad)) {
      return NextResponse.json({ error: 'Prioridad inválida.' }, { status: 400 });
    }

    if ((tipo === 'PAGO' || tipo === 'REEMBOLSO') && !consentimientoUsuario) {
      return NextResponse.json(
        { error: 'Para asuntos de pago/reembolso se requiere consentimiento explícito del solicitante.' },
        { status: 400 }
      );
    }

    const { data: inserted, error } = await supabase
      .from('support_tickets')
      .insert([
        {
          creado_por: context.userId,
          chamba_id: chambaId,
          tipo,
          prioridad,
          estado: 'ABIERTO',
          titulo,
          descripcion,
          requiere_revision_legal: requiereRevisionLegal,
          consentimiento_usuario: consentimientoUsuario,
        },
      ])
      .select('*')
      .maybeSingle();

    if (error || !inserted) {
      return NextResponse.json(
        {
          error:
            'No se pudo crear el ticket. Verifica que ejecutaste sql/soporte_tickets.sql en tu base de datos.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ticket: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
