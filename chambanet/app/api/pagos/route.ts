import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { CrearPagoResponse, Pago } from '@/types/pagos';
import { createMercadoPagoPreference, getMercadoPagoPublicKey } from '@/lib/mercadopago';

const TARIFA_SERVICIO_PORCENTAJE = 0.06; // 6%

/**
 * POST /api/pagos
 * Crea un nuevo pago (Payment Intent sin capturar)
 *
 * Requiere:
 * - chamba_id: UUID
 * - trabajador_id: UUID
 * - monto_base: number (CLP)
 *
 * Retorna:
 * - pago: Pago creado
 * - payment_intent: Payment Intent de MercadoPago
 */
export async function POST(request: Request) {
  try {
    // 1. Obtener token de autenticación
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No autenticado. Por favor inicia sesión.' },
        { status: 401 }
      );
    }

    // 2. Validar usuario autenticado
    const supabase = createSupabaseServerClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Sesión inválida o expirada.' },
        { status: 401 }
      );
    }

    const empleadorId = authData.user.id;

    // 3. Parsear el request
    const body = await request.json();
    const { chamba_id, trabajador_id, monto_base } = body;

    // 4. Validar campos requeridos
    if (!chamba_id || !trabajador_id || !monto_base) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: chamba_id, trabajador_id, monto_base' },
        { status: 400 }
      );
    }

    // 5. Validar montos
    if (typeof monto_base !== 'number' || monto_base <= 0) {
      return NextResponse.json(
        { error: 'monto_base debe ser un número positivo' },
        { status: 400 }
      );
    }

    if (monto_base > 10000000) {
      return NextResponse.json(
        { error: 'El monto máximo permitido es CLP $10.000.000' },
        { status: 400 }
      );
    }

    // 6. Verificar que la chamba exista y pertenece al empleador
    const { data: chamba, error: chambaError } = await supabase
      .from('chambas')
      .select('id, empleador_id, estado')
      .eq('id', chamba_id)
      .single();

    if (chambaError || !chamba) {
      return NextResponse.json(
        { error: 'Chamba no encontrada' },
        { status: 404 }
      );
    }

    if (chamba.empleador_id !== empleadorId) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear pagos en esta chamba' },
        { status: 403 }
      );
    }

    // 7. Verificar que el trabajador existe
    const { data: trabajador, error: trabajadorError } = await supabase
      .from('usuarios')
      .select('id, email')
      .eq('id', trabajador_id)
      .single();

    if (trabajadorError || !trabajador) {
      return NextResponse.json(
        { error: 'Trabajador no encontrado' },
        { status: 404 }
      );
    }

    // 8. Calcular montos
    const tarifaServicio = Math.round(monto_base * TARIFA_SERVICIO_PORCENTAJE * 100) / 100;
    const montoTotal = monto_base + tarifaServicio;

    // 9. Crear pago en la base de datos
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .insert({
        chamba_id,
        empleador_id: empleadorId,
        trabajador_id,
        monto_base,
        tarifa_servicio: tarifaServicio,
        monto_total: montoTotal,
        mp_payment_intent_id: null,
        estado: 'PENDIENTE',
      })
      .select()
      .single();

    if (pagoError || !pago) {
      console.error('Error al crear pago:', pagoError);
      return NextResponse.json(
        { error: 'Error al crear el pago. Por favor intenta de nuevo.' },
        { status: 500 }
      );
    }

    // 10. Crear preferencia real en Mercado Pago (Checkout Pro, solo medios digitales)
    const preference = await createMercadoPagoPreference({
      pagoId: pago.id,
      chambaId: chamba_id,
      empleadorId,
      trabajadorId: trabajador_id,
      montoBase: monto_base,
      tarifaServicio,
      montoTotal,
      title: `ChambaNET - ${chamba_id}`,
      payerEmail: authData.user.email,
    });

    // 11. Persistir ID de preferencia de Mercado Pago
    const { error: updatePagoError } = await supabase
      .from('pagos')
      .update({
        mp_payment_intent_id: preference.id,
      })
      .eq('id', pago.id);

    if (updatePagoError) {
      console.error('Error al actualizar mp_payment_intent_id:', updatePagoError.message);
      return NextResponse.json(
        { error: 'Se creó el pago, pero no se pudo vincular con Mercado Pago.' },
        { status: 500 }
      );
    }

    // 12. Respuesta para el frontend
    const response: CrearPagoResponse = {
      pago: {
        ...(pago as Pago),
        mp_payment_intent_id: preference.id,
      },
      payment_intent: {
        id: preference.id,
        client_secret: preference.id,
        amount: Math.round(montoTotal * 100), // En centavos para MercadoPago
        currency: 'CLP',
        checkout_url: preference.checkoutUrl,
        sandbox_checkout_url: preference.sandboxCheckoutUrl,
        public_key: getMercadoPagoPublicKey(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en creación de pago:', error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pagos
 * Obtiene los pagos del usuario autenticado
 * Si es soporte/admin, obtiene todos los pagos
 */
export async function GET(request: Request) {
  try {
    // 1. Validar autenticación
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // 2. Obtener el rol del usuario para determinar permisos
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('email, rut')
      .eq('id', userId)
      .single();

    // 3. Consultar pagos según permisos
    let query = supabase.from('pagos').select('*');

    // Si no es admin, solo ver sus propios pagos (como empleador o trabajador)
    if (!usuario || !esAdminSoporte(usuario.email, usuario.rut)) {
      query = query.or(`empleador_id.eq.${userId},trabajador_id.eq.${userId}`);
    }

    const { data: pagos, error: pagosError } = await query.order('created_at', {
      ascending: false,
    });

    if (pagosError) {
      throw new Error(pagosError.message);
    }

    return NextResponse.json(
      {
        pagos: pagos || [],
        total: pagos?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error obteniendo pagos:', error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * Verifica si el usuario es admin/soporte
 */
function esAdminSoporte(email?: string | null, rut?: string | null): boolean {
  const ADMIN_EMAILS = new Set(['soporte.chambanet@gmail.com']);
  const ADMIN_RUTS = new Set(['00000000-0']);

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRut = String(rut || '')
    .replace(/\./g, '')
    .trim()
    .toUpperCase();

  return ADMIN_EMAILS.has(normalizedEmail) || ADMIN_RUTS.has(normalizedRut);
}
