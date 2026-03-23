import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getSupportAuthContext } from '@/lib/supportAuth';

const DEFAULT_IVA_PORCENTAJE = 19;
const DEFAULT_MARGEN_SERVICIO_PORCENTAJE = 7;

function isValidSecret(inputSecret: string, configuredSecret: string): boolean {
  const a = Buffer.from(inputSecret, 'utf8');
  const b = Buffer.from(configuredSecret, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET() {
  try {
    const auth = await getSupportAuthContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('configuracion_financiera_empresa')
      .select('*')
      .eq('owner_user_id', auth.context.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        config: data || {
          iva_porcentaje: DEFAULT_IVA_PORCENTAJE,
          margen_servicio_porcentaje: DEFAULT_MARGEN_SERVICIO_PORCENTAJE,
          cuenta_destino_tipo: 'BANCARIA',
          cuenta_destino_alias: 'Cuenta impuestos (pendiente configurar)',
          cuenta_destino_numero_mascarado: '****',
          cuenta_destino_identificador_externo: null,
          activo: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error obteniendo configuración financiera.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getSupportAuthContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.context.isCompanyOwner) {
      return NextResponse.json(
        { error: 'Solo el dueño de la empresa puede modificar la cuenta destino.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      clave_secreta?: string;
      iva_porcentaje?: number;
      margen_servicio_porcentaje?: number;
      cuenta_destino_tipo?: 'BANCARIA' | 'MERCADOPAGO';
      cuenta_destino_alias?: string;
      cuenta_destino_numero_mascarado?: string;
      cuenta_destino_identificador_externo?: string | null;
      activo?: boolean;
    };

    const configuredSecret = String(process.env.COMPANY_BANK_CONFIG_SECRET || '').trim();
    if (!configuredSecret) {
      return NextResponse.json(
        {
          error:
            'No se ha configurado la contraseña secreta del servidor para cambios bancarios.',
        },
        { status: 500 }
      );
    }

    const inputSecret = String(body.clave_secreta || '').trim();
    if (!inputSecret || !isValidSecret(inputSecret, configuredSecret)) {
      return NextResponse.json(
        { error: 'Contraseña secreta incorrecta para modificar datos bancarios.' },
        { status: 403 }
      );
    }

    const iva = body.iva_porcentaje ?? DEFAULT_IVA_PORCENTAJE;
    const margen = body.margen_servicio_porcentaje ?? DEFAULT_MARGEN_SERVICIO_PORCENTAJE;

    if (iva < 0 || iva > 100 || margen < 0 || margen > 100) {
      return NextResponse.json(
        { error: 'Los porcentajes deben estar entre 0 y 100.' },
        { status: 400 }
      );
    }

    if (!body.cuenta_destino_alias || !body.cuenta_destino_numero_mascarado) {
      return NextResponse.json(
        { error: 'Debes informar alias y número enmascarado de cuenta destino.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('configuracion_financiera_empresa')
      .upsert(
        {
          owner_user_id: auth.context.userId,
          iva_porcentaje: iva,
          margen_servicio_porcentaje: margen,
          cuenta_destino_tipo: body.cuenta_destino_tipo || 'BANCARIA',
          cuenta_destino_alias: body.cuenta_destino_alias.trim(),
          cuenta_destino_numero_mascarado: body.cuenta_destino_numero_mascarado.trim(),
          cuenta_destino_identificador_externo:
            body.cuenta_destino_identificador_externo?.trim() || null,
          activo: body.activo ?? true,
        },
        {
          onConflict: 'owner_user_id',
        }
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No se pudo actualizar la configuración financiera.');
    }

    return NextResponse.json({ config: data }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error actualizando configuración financiera.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
