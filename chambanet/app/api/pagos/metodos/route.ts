import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import {
  createMercadoPagoCard,
  getOrCreateMercadoPagoCustomer,
} from '@/lib/mercadopago';

type MetodoPagoInsert = {
  tipo: 'CARD';
  alias: string;
  token: string;
};

async function getAuthContext() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  if (!accessToken) {
    return { ok: false as const, status: 401, error: 'No autenticado.' };
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return { ok: false as const, status: 401, error: 'Sesion invalida o expirada.' };
  }

  return { ok: true as const, supabase, userId: authData.user.id };
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.supabase
      .from('metodos_pago_usuario')
      .select('*')
      .eq('usuario_id', auth.userId)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ methods: data ?? [] }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error listando metodos.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as Partial<MetodoPagoInsert>;

    if (!body.tipo || !body.alias || !body.token) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: tipo, alias, token.' },
        { status: 400 }
      );
    }

    if (body.tipo !== 'CARD') {
      return NextResponse.json({ error: 'Actualmente solo se admite tarjeta.' }, { status: 400 });
    }

    const { data: perfil } = await auth.supabase
      .from('usuarios')
      .select('email')
      .eq('id', auth.userId)
      .maybeSingle();

    const payerEmail = String(perfil?.email || '').trim().toLowerCase();
    if (!payerEmail) {
      return NextResponse.json(
        { error: 'No se encontró email de usuario para vincular con Mercado Pago.' },
        { status: 409 }
      );
    }

    const customer = await getOrCreateMercadoPagoCustomer(payerEmail);
    const card = await createMercadoPagoCard(customer.id, body.token);

    const last4 = card.last_four_digits || '0000';
    const masked = `**** **** **** ${last4}`;
    const holder = card.cardholder?.name || 'Titular';

    const { count } = await auth.supabase
      .from('metodos_pago_usuario')
      .select('id', { head: true, count: 'exact' })
      .eq('usuario_id', auth.userId)
      .eq('es_principal', true);

    const { data, error } = await auth.supabase
      .from('metodos_pago_usuario')
      .insert({
        usuario_id: auth.userId,
        tipo: body.tipo,
        alias: body.alias.trim(),
        masked,
        holder,
        mp_customer_id: customer.id,
        mp_card_id: card.id,
        mp_payment_method_id: card.payment_method?.id || null,
        estado: 'ACTIVO',
        es_principal: (count ?? 0) === 0,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No se pudo crear metodo.');
    }

    return NextResponse.json({ method: data }, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error creando metodo.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
