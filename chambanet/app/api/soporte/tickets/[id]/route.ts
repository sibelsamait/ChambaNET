import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { getSupportAuthContext } from '../../../../../lib/supportAuth';

type RouteContext = { params: Promise<{ id: string }> };

type SupportAction =
  | 'COMENTARIO'
  | 'CAMBIO_ESTADO'
  | 'CANCELAR_CHAMBA'
  | 'CANCELAR_PAGO'
  | 'REEMBOLSO_PORCENTAJE';

const VALID_ESTADOS = new Set(['ABIERTO', 'EN_REVISION', 'RESUELTO', 'CERRADO']);

export async function GET(_request: Request, context: RouteContext) {
  const auth = await getSupportAuthContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { context: authContext } = auth;
  const { id } = await context.params;

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado.' }, { status: 404 });
  }

  if (!authContext.isSupportAdmin && ticket.creado_por !== authContext.userId) {
    return NextResponse.json({ error: 'No autorizado para ver este ticket.' }, { status: 403 });
  }

  const { data: acciones, error: accionesError } = await supabase
    .from('support_ticket_actions')
    .select('*')
    .eq('ticket_id', id)
    .order('creado_en', { ascending: false });

  if (accionesError) {
    return NextResponse.json({ error: 'No se pudieron cargar las acciones del ticket.' }, { status: 500 });
  }

  return NextResponse.json({ ticket, acciones: acciones || [] }, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getSupportAuthContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { context: authContext } = auth;
  if (!authContext.isSupportAdmin) {
    return NextResponse.json({ error: 'Solo soporte puede ejecutar acciones administrativas.' }, { status: 403 });
  }

  const { id } = await context.params;

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const accion = String(body?.accion || '').trim().toUpperCase() as SupportAction;
    const detalle = String(body?.detalle || '').trim();
    const nuevoEstado = String(body?.estado || '').trim().toUpperCase();
    const porcentajeReembolso =
      body?.porcentajeReembolso === undefined ? null : Number(body?.porcentajeReembolso);
    const confirmacionLegal = Boolean(body?.confirmacionLegal);

    if (!detalle || detalle.length < 10) {
      return NextResponse.json({ error: 'Debes registrar un detalle claro de la acción.' }, { status: 400 });
    }

    if (!['COMENTARIO', 'CAMBIO_ESTADO', 'CANCELAR_CHAMBA', 'CANCELAR_PAGO', 'REEMBOLSO_PORCENTAJE'].includes(accion)) {
      return NextResponse.json({ error: 'Acción de soporte inválida.' }, { status: 400 });
    }

    if ((accion === 'CANCELAR_PAGO' || accion === 'REEMBOLSO_PORCENTAJE') && !confirmacionLegal) {
      return NextResponse.json(
        { error: 'Debes confirmar checklist legal/compliance antes de acciones financieras.' },
        { status: 400 }
      );
    }

    let montoReembolso: number | null = null;

    if (accion === 'REEMBOLSO_PORCENTAJE') {
      if (porcentajeReembolso === null || !Number.isFinite(porcentajeReembolso) || porcentajeReembolso < 0 || porcentajeReembolso > 100) {
        return NextResponse.json(
          { error: 'El porcentaje de reembolso debe estar entre 0 y 100.' },
          { status: 400 }
        );
      }

      if (!ticket.chamba_id) {
        return NextResponse.json(
          { error: 'El ticket no tiene una chamba asociada para calcular reembolso.' },
          { status: 400 }
        );
      }

      const { data: chamba } = await supabase
        .from('chambas')
        .select('pago_clp')
        .eq('id', ticket.chamba_id)
        .maybeSingle();

      const pago = Number(chamba?.pago_clp || 0);
      montoReembolso = Number(((pago * porcentajeReembolso) / 100).toFixed(2));

      await supabase
        .from('support_tickets')
        .update({
          porcentaje_reembolso: porcentajeReembolso,
          monto_reembolso_clp: montoReembolso,
          estado: 'EN_REVISION',
        })
        .eq('id', id);
    }

    if (accion === 'CANCELAR_CHAMBA') {
      if (!ticket.chamba_id) {
        return NextResponse.json({ error: 'El ticket no tiene una chamba asociada.' }, { status: 400 });
      }

      await supabase
        .from('chambas')
        .update({ estado: 'CANCELADA' })
        .eq('id', ticket.chamba_id)
        .neq('estado', 'FINALIZADA');

      await supabase
        .from('support_tickets')
        .update({ estado: 'EN_REVISION' })
        .eq('id', id);
    }

    if (accion === 'CANCELAR_PAGO') {
      await supabase
        .from('support_tickets')
        .update({ estado: 'EN_REVISION' })
        .eq('id', id);
    }

    if (accion === 'CAMBIO_ESTADO') {
      if (!VALID_ESTADOS.has(nuevoEstado)) {
        return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
      }

      await supabase.from('support_tickets').update({ estado: nuevoEstado }).eq('id', id);
    }

    const { error: actionError } = await supabase.from('support_ticket_actions').insert([
      {
        ticket_id: id,
        ejecutado_por: authContext.userId,
        accion,
        detalle,
        porcentaje_reembolso: accion === 'REEMBOLSO_PORCENTAJE' ? porcentajeReembolso : null,
        monto_reembolso_clp: accion === 'REEMBOLSO_PORCENTAJE' ? montoReembolso : null,
      },
    ]);

    if (actionError) {
      return NextResponse.json({ error: 'No se pudo registrar la acción de soporte.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
