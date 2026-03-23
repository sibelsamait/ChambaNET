import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import {
  getMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/mercadopago';

type WebhookBody = {
  type?: string;
  action?: string;
  data?: {
    id?: string;
  };
};

/**
 * Webhook de Mercado Pago.
 * Debe configurarse en el panel de MP apuntando a /api/pagos/webhook.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as WebhookBody;

    const dataId =
      body.data?.id ||
      url.searchParams.get('data.id') ||
      url.searchParams.get('id');

    const topic =
      body.type ||
      body.action?.split('.')[0] ||
      url.searchParams.get('topic') ||
      url.searchParams.get('type');

    if (!dataId || topic !== 'payment') {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    // Verifica firma si MERCADOPAGO_WEBHOOK_SECRET está presente.
    const validSignature = verifyMercadoPagoWebhookSignature({
      xSignatureHeader: request.headers.get('x-signature'),
      xRequestIdHeader: request.headers.get('x-request-id'),
      dataId,
    });

    if (!validSignature) {
      return NextResponse.json({ error: 'Firma de webhook inválida.' }, { status: 401 });
    }

    const payment = await getMercadoPagoPayment(dataId);
    const pagoId = payment.external_reference;

    if (!pagoId) {
      return NextResponse.json(
        { ok: true, ignored: true, reason: 'payment sin external_reference' },
        { status: 200 }
      );
    }

    const supabase = createSupabaseServerClient();

    let nextEstado: 'PENDIENTE' | 'RETENIDO' | null = null;
    if (payment.status === 'approved' || payment.status === 'authorized') {
      nextEstado = 'RETENIDO';
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      nextEstado = 'PENDIENTE';
    }

    if (nextEstado) {
      const { error } = await supabase
        .from('pagos')
        .update({
          estado: nextEstado,
          mp_payment_intent_id: String(payment.id),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pagoId);

      if (error) {
        throw new Error(`Error actualizando pago por webhook: ${error.message}`);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error webhook Mercado Pago';
    console.error('Webhook Mercado Pago error:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET() {
  // Healthcheck para validar endpoint desde panel de Mercado Pago
  return NextResponse.json({ ok: true, service: 'mercadopago-webhook' }, { status: 200 });
}
