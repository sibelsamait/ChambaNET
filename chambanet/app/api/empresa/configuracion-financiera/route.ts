import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getSupportAuthContext, normalizeRut } from '@/lib/supportAuth';

const DEFAULT_IVA_PORCENTAJE = 19;
const DEFAULT_MARGEN_SERVICIO_PORCENTAJE = 7;
const DEFAULT_COMPANY_BANK_ADMIN_RUT = '00.000.000-0';
const MAX_INTENTOS = 3;
const BLOQUEO_DIAS_HABILES = 7;
const ACCESS_DENIED_MESSAGE =
  'No eres el Administrador de la compañía, tu acceso está denegado';

type IntentosSeguridadRow = {
  user_id: string;
  failed_attempts: number;
  locked_until: string | null;
};

function isValidSecret(inputSecret: string, configuredSecret: string): boolean {
  const a = Buffer.from(inputSecret, 'utf8');
  const b = Buffer.from(configuredSecret, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function addBusinessDays(from: Date, businessDays: number): Date {
  const result = new Date(from);
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return result;
}

function denyAccess() {
  return NextResponse.json({ error: ACCESS_DENIED_MESSAGE }, { status: 403 });
}

async function getIntentosRecord(supabase: ReturnType<typeof createSupabaseServerClient>, userId: string) {
  const { data } = await supabase
    .from('seguridad_intentos_config_bancaria')
    .select('user_id, failed_attempts, locked_until')
    .eq('user_id', userId)
    .maybeSingle<IntentosSeguridadRow>();

  return data || null;
}

async function registerFailedAttempt(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
) {
  const now = new Date();
  const current = await getIntentosRecord(supabase, userId);
  const nextFailedAttempts = (current?.failed_attempts || 0) + 1;
  const isLocking = nextFailedAttempts >= MAX_INTENTOS;
  const lockedUntil = isLocking ? addBusinessDays(now, BLOQUEO_DIAS_HABILES).toISOString() : null;

  await supabase.from('seguridad_intentos_config_bancaria').upsert(
    {
      user_id: userId,
      failed_attempts: nextFailedAttempts,
      locked_until: lockedUntil,
      last_failed_at: now.toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );
}

async function resetFailedAttempts(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
) {
  await supabase
    .from('seguridad_intentos_config_bancaria')
    .upsert(
      {
        user_id: userId,
        failed_attempts: 0,
        locked_until: null,
        last_failed_at: null,
      },
      {
        onConflict: 'user_id',
      }
    );
}

export async function GET() {
  try {
    const auth = await getSupportAuthContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const configuredAdminRut = normalizeRut(
      process.env.COMPANY_BANK_ADMIN_RUT || DEFAULT_COMPANY_BANK_ADMIN_RUT
    );
    const authenticatedRut = normalizeRut(auth.context.rut);

    if (!auth.context.isSupportAdmin || authenticatedRut !== configuredAdminRut) {
      return NextResponse.json(
        {
          error:
            'Solo la cuenta empresarial con rol Admin Soporte puede consultar la configuración bancaria.',
        },
        { status: 403 }
      );
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
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const auth = await getSupportAuthContext();
    if (!auth.ok || !accessToken) return denyAccess();

    const supabase = createSupabaseServerClient(accessToken);

    const intentos = await getIntentosRecord(supabase, auth.context.userId);
    if (intentos?.locked_until && new Date(intentos.locked_until) > new Date()) {
      return denyAccess();
    }

    const configuredAdminRut = normalizeRut(
      process.env.COMPANY_BANK_ADMIN_RUT || DEFAULT_COMPANY_BANK_ADMIN_RUT
    );
    const authenticatedRut = normalizeRut(auth.context.rut);

    if (!auth.context.isSupportAdmin || authenticatedRut !== configuredAdminRut) {
      await registerFailedAttempt(supabase, auth.context.userId);
      return denyAccess();
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
      await registerFailedAttempt(supabase, auth.context.userId);
      return denyAccess();
    }

    const inputSecret = String(body.clave_secreta || '').trim();
    if (!inputSecret || !isValidSecret(inputSecret, configuredSecret)) {
      await registerFailedAttempt(supabase, auth.context.userId);
      return denyAccess();
    }

    const iva = body.iva_porcentaje ?? DEFAULT_IVA_PORCENTAJE;
    const margen = body.margen_servicio_porcentaje ?? DEFAULT_MARGEN_SERVICIO_PORCENTAJE;

    if (iva < 0 || iva > 100 || margen < 0 || margen > 100) {
      await registerFailedAttempt(supabase, auth.context.userId);
      return denyAccess();
    }

    if (!body.cuenta_destino_alias || !body.cuenta_destino_numero_mascarado) {
      await registerFailedAttempt(supabase, auth.context.userId);
      return denyAccess();
    }

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
      await registerFailedAttempt(supabase, auth.context.userId);
      return denyAccess();
    }

    await resetFailedAttempts(supabase, auth.context.userId);

    return NextResponse.json({ config: data }, { status: 200 });
  } catch (error) {
    console.error('Error de seguridad en configuracion financiera:', error);
    return denyAccess();
  }
}
