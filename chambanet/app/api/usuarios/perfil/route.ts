import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../lib/supabase';
import { normalizarFechaISO } from '../../../../utils/validations';
import { normalizeRut } from '@/lib/supportAuth';

type DireccionPayload = {
  calle?: string;
  numero?: string;
  regionId?: string;
  regionNombre?: string;
  comunaId?: string;
  comunaNombre?: string;
};

type CuentaBancariaPayload = {
  banco?: string;
  tipoCuenta?: 'RUT' | 'CORRIENTE' | 'VISTA' | 'AHORRO' | '';
  numeroCuenta?: string;
  titularNombre?: string;
  titularRut?: string;
  emailPago?: string;
};

function parseDireccion(raw: unknown): DireccionPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const data = raw as Record<string, unknown>;

  return {
    calle: typeof data.calle === 'string' ? data.calle.trim() : '',
    numero: typeof data.numero === 'string' ? data.numero.trim() : '',
    regionId: typeof data.regionId === 'string' ? data.regionId.trim() : '',
    regionNombre: typeof data.regionNombre === 'string' ? data.regionNombre.trim() : '',
    comunaId: typeof data.comunaId === 'string' ? data.comunaId.trim() : '',
    comunaNombre: typeof data.comunaNombre === 'string' ? data.comunaNombre.trim() : '',
  };
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
  };
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const userId = authData.user.id;
    const body = await request.json();

    const { data: usuarioActual } = await supabase
      .from('usuarios')
      .select('rut')
      .eq('id', userId)
      .maybeSingle();

    const rutUsuarioAutenticado = normalizeRut(usuarioActual?.rut || '');
    if (!rutUsuarioAutenticado) {
      return NextResponse.json(
        { error: 'Tu perfil no tiene RUT válido para configurar cuenta bancaria.' },
        { status: 409 }
      );
    }

    const nombres = String(body?.nombres || '').trim();
    const apellidoPaterno = String(body?.apellidoPaterno || '').trim();
    const apellidoMaterno = String(body?.apellidoMaterno || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const telefono = String(body?.telefono || '').trim();
    const fechaNacimiento = String(body?.fechaNacimiento || '').trim();
    const fechaNacimientoNormalizada = normalizarFechaISO(fechaNacimiento);
    const direccion = parseDireccion(body?.direccion);
    const cuentaBancaria = parseCuentaBancaria(body?.cuentaBancaria);

    if (!nombres || !apellidoPaterno || !apellidoMaterno || !email || !fechaNacimiento) {
      return NextResponse.json(
        { error: 'Nombres, apellidos, correo y fecha de nacimiento son obligatorios.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El formato del correo electrónico es inválido.' }, { status: 400 });
    }

    if (!fechaNacimientoNormalizada) {
      return NextResponse.json(
        { error: 'La fecha de nacimiento debe tener formato YYYY-MM-DD y ser válida.' },
        { status: 400 }
      );
    }

    if (!direccion.calle || !direccion.numero || !direccion.regionNombre || !direccion.comunaNombre) {
      return NextResponse.json({ error: 'La dirección está incompleta.' }, { status: 400 });
    }

    const isCuentaBancariaCompleta =
      !!cuentaBancaria.banco &&
      !!cuentaBancaria.tipoCuenta &&
      !!cuentaBancaria.numeroCuenta &&
      !!cuentaBancaria.titularNombre &&
      !!cuentaBancaria.titularRut;

    if (
      cuentaBancaria.banco ||
      cuentaBancaria.tipoCuenta ||
      cuentaBancaria.numeroCuenta ||
      cuentaBancaria.titularNombre ||
      cuentaBancaria.titularRut ||
      cuentaBancaria.emailPago
    ) {
      const tiposValidos = new Set(['RUT', 'CORRIENTE', 'VISTA', 'AHORRO']);
      if (!isCuentaBancariaCompleta) {
        return NextResponse.json(
          { error: 'Debes completar todos los campos bancarios obligatorios.' },
          { status: 400 }
        );
      }

      if (!tiposValidos.has(String(cuentaBancaria.tipoCuenta))) {
        return NextResponse.json({ error: 'Tipo de cuenta no válido.' }, { status: 400 });
      }

      if (cuentaBancaria.emailPago && !emailRegex.test(cuentaBancaria.emailPago)) {
        return NextResponse.json(
          { error: 'El correo de pagos de la cuenta bancaria es inválido.' },
          { status: 400 }
        );
      }

      const rutTitular = normalizeRut(cuentaBancaria.titularRut);
      if (rutTitular !== rutUsuarioAutenticado) {
        return NextResponse.json(
          {
            error:
              'El RUT de la cuenta para recibir pagos debe coincidir con el RUT del usuario autenticado.',
          },
          { status: 403 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        nombres,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        email,
        telefono: telefono || null,
        fecha_nacimiento: fechaNacimientoNormalizada,
        direccion_completa: {
          calle: direccion.calle,
          numero: direccion.numero,
          region_id: direccion.regionId || null,
          region_nombre: direccion.regionNombre,
          comuna_id: direccion.comunaId || null,
          comuna_nombre: direccion.comunaNombre,
        },
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (isCuentaBancariaCompleta) {
      const { error: bankError } = await supabase.from('cuentas_bancarias_usuarios').upsert(
        {
          user_id: userId,
          banco: cuentaBancaria.banco,
          tipo_cuenta: cuentaBancaria.tipoCuenta,
          numero_cuenta: cuentaBancaria.numeroCuenta,
          titular_nombre: cuentaBancaria.titularNombre,
          titular_rut: cuentaBancaria.titularRut,
          email_pago: cuentaBancaria.emailPago || null,
          activa: true,
        },
        { onConflict: 'user_id' }
      );

      if (bankError) {
        return NextResponse.json({ error: bankError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ mensaje: 'Perfil actualizado con éxito.' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
