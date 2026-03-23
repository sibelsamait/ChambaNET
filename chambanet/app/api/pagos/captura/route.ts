import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import {
  captureMercadoPagoPayment,
  findMercadoPagoPaymentByExternalReference,
} from '@/lib/mercadopago';
import { isSupportAdminUser } from '@/lib/supportAuth';

/**
 * POST /api/pagos/captura
 * Captura un pago autorizado en Mercado Pago y marca el pago como LIBERADO.
 *
 * Permisos:
 * - Soporte/Admin
 * - O el empleador dueño del pago
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const supabase = createSupabaseServerClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const body = await request.json();
    const { pago_id } = body as { pago_id?: string };

    if (!pago_id) {
      return NextResponse.json({ error: 'Falta pago_id.' }, { status: 400 });
    }

    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .single();

    if (pagoError || !pago) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('email, rut')
      .eq('id', authData.user.id)
      .maybeSingle();

    const isSupportAdmin = isSupportAdminUser(perfil?.email, perfil?.rut);
    const isOwner = pago.empleador_id === authData.user.id;

    if (!isSupportAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permisos para capturar este pago.' },
        { status: 403 }
      );
    }

    if (!pago.mp_payment_intent_id) {
      return NextResponse.json(
        { error: 'El pago no tiene referencia de Mercado Pago.' },
        { status: 409 }
      );
    }

    const looksLikePaymentId = /^\d+$/.test(String(pago.mp_payment_intent_id));
    const resolvedPaymentId = looksLikePaymentId
      ? String(pago.mp_payment_intent_id)
      : (await findMercadoPagoPaymentByExternalReference(pago.id))?.id?.toString();

    if (!resolvedPaymentId) {
      return NextResponse.json(
        {
          error:
            'No se encontró un payment_id de Mercado Pago para este pago. Espera el webhook o reintenta.',
        },
        { status: 409 }
      );
    }

    const mpPayment = await captureMercadoPagoPayment(resolvedPaymentId);

    if (mpPayment.status !== 'approved') {
      return NextResponse.json(
        {
          error: 'Mercado Pago no devolvió estado approved al capturar.',
          mp_status: mpPayment.status,
        },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from('pagos')
      .update({
        estado: 'LIBERADO',
        mp_payment_intent_id: String(mpPayment.id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pago_id);

    if (updateError) {
      throw new Error(`Error actualizando estado a LIBERADO: ${updateError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        pago_id,
        estado: 'LIBERADO',
        mercadopago: {
          payment_id: mpPayment.id,
          status: mpPayment.status,
          captured: mpPayment.captured,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error capturando pago.';
    console.error('Error en /api/pagos/captura:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
