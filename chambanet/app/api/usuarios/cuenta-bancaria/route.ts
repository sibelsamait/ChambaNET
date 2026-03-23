import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isSupportAdminUser, normalizeRut } from '@/lib/supportAuth';

type CuentaBancariaPayload = {
  banco?: string;
  tipoCuenta?: 'RUT' | 'CORRIENTE' | 'VISTA' | 'AHORRO' | '';
  numeroCuenta?: string;
  titularNombre?: string;
  titularRut?: string;
  emailPago?: string;
  clave_secreta_admin?: string;
};

function isValidSecret(inputSecret: string, configuredSecret: string): boolean {
  const a = Buffer.from(inputSecret, 'utf8');
  const b = Buffer.from(configuredSecret, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseCuentaBancaria(raw: unknown): CuentaBancariaPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const data = raw as Record<string, unknown>;

  return {
    banco: typeof data.banco === 'string' ? data.banco.trim() : '',
    tipoCuenta:
      typeof data.tipoCuenta === 'string'
        ? (data.tipoCuenta.trim().toUpperCase() as CuentaBancariaPayload['tipoCuenta'])
        : '',
    numeroCuenta: typeof data.numeroCuenta === 'string' ? data.numeroCuenta.trim() : '',
    titularNombre: typeof data.titularNombre === 'string' ? data.titularNombre.trim() : '',
    titularRut: typeof data.titularRut === 'string' ? data.titularRut.trim() : '',
    emailPago: typeof data.emailPago === 'string' ? data.emailPago.trim().toLowerCase() : '',
    clave_secreta_admin:
      typeof data.clave_secreta_admin === 'string' ? data.clave_secreta_admin.trim() : '',
  };
}

async function getAuthContext() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  if (!accessToken) {
    return { ok: false as const, status: 401, error: 'No autenticado.' };
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return { ok: false as const, status: 401, error: 'Sesión inválida o expirada.' };
  }

  const userId = authData.user.id;
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('email, rut')
    .eq('id', userId)
    .maybeSingle();

  const rutUsuario = normalizeRut(usuario?.rut || '');
  if (!rutUsuario) {
    return {
      ok: false as const,
      status: 409,
      error: 'Tu perfil no tiene RUT válido para configurar cuenta bancaria.',
    };
  }

  return {
    ok: true as const,
    supabase,
    userId,
    userRut: rutUsuario,
    isSupportAdmin: isSupportAdminUser(usuario?.email, usuario?.rut),
  };
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await auth.supabase
      .from('cuentas_bancarias_usuarios')
      .select('banco, tipo_cuenta, numero_cuenta, titular_nombre, titular_rut, email_pago, activa')
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        cuentaBancaria: {
          banco: data?.banco ?? '',
          tipoCuenta: data?.tipo_cuenta ?? '',
          numeroCuenta: data?.numero_cuenta ?? '',
          titularNombre: data?.titular_nombre ?? '',
          titularRut: data?.titular_rut ?? '',
          emailPago: data?.email_pago ?? '',
          activa: data?.activa ?? false,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = parseCuentaBancaria(await request.json());

    const tiposValidos = new Set(['RUT', 'CORRIENTE', 'VISTA', 'AHORRO']);
    if (
      !body.banco ||
      !body.tipoCuenta ||
      !body.numeroCuenta ||
      !body.titularNombre ||
      !body.titularRut
    ) {
      return NextResponse.json(
        { error: 'Debes completar todos los campos bancarios obligatorios.' },
        { status: 400 }
      );
    }

    if (!tiposValidos.has(String(body.tipoCuenta))) {
      return NextResponse.json({ error: 'Tipo de cuenta no válido.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (body.emailPago && !emailRegex.test(body.emailPago)) {
      return NextResponse.json(
        { error: 'El correo de pagos de la cuenta bancaria es inválido.' },
        { status: 400 }
      );
    }

    const rutTitular = normalizeRut(body.titularRut);
    if (rutTitular !== auth.userRut) {
      return NextResponse.json(
        {
          error:
            'El RUT de la cuenta para recibir pagos debe coincidir con el RUT del usuario autenticado.',
        },
        { status: 403 }
      );
    }

    if (auth.isSupportAdmin) {
      const configuredSecret = String(process.env.COMPANY_BANK_CONFIG_SECRET || '').trim();
      const inputSecret = String(body.clave_secreta_admin || '').trim();
      if (!configuredSecret || !inputSecret || !isValidSecret(inputSecret, configuredSecret)) {
        return NextResponse.json(
          {
            error:
              'Debes ingresar la contraseña secreta correcta para editar información del usuario admin.',
          },
          { status: 403 }
        );
      }
    }

    const { error } = await auth.supabase.from('cuentas_bancarias_usuarios').upsert(
      {
        user_id: auth.userId,
        banco: body.banco,
        tipo_cuenta: body.tipoCuenta,
        numero_cuenta: body.numeroCuenta,
        titular_nombre: body.titularNombre,
        titular_rut: body.titularRut,
        email_pago: body.emailPago || null,
        activa: true,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ mensaje: 'Cuenta bancaria actualizada con éxito.' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
