import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { deleteMercadoPagoCard } from '@/lib/mercadopago';

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = (await request.json()) as { action?: 'set-default' };

    if (body.action !== 'set-default') {
      return NextResponse.json({ error: 'Accion invalida.' }, { status: 400 });
    }

    const { data: current, error: currentError } = await auth.supabase
      .from('metodos_pago_usuario')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', auth.userId)
      .maybeSingle();

    if (currentError || !current) {
      return NextResponse.json({ error: 'Metodo no encontrado.' }, { status: 404 });
    }

    const { error: resetError } = await auth.supabase
      .from('metodos_pago_usuario')
      .update({ es_principal: false })
      .eq('usuario_id', auth.userId)
      .eq('es_principal', true);

    if (resetError) {
      throw new Error(resetError.message);
    }

    const { data, error } = await auth.supabase
      .from('metodos_pago_usuario')
      .update({ es_principal: true })
      .eq('id', id)
      .eq('usuario_id', auth.userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No se pudo actualizar metodo.');
    }

    return NextResponse.json({ method: data }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error actualizando metodo.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const { data: existing, error: existingError } = await auth.supabase
      .from('metodos_pago_usuario')
      .select('id, es_principal, mp_customer_id, mp_card_id')
      .eq('id', id)
      .eq('usuario_id', auth.userId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Metodo no encontrado.' }, { status: 404 });
    }

    if (existing.mp_customer_id && existing.mp_card_id) {
      await deleteMercadoPagoCard(existing.mp_customer_id, existing.mp_card_id);
    }

    const { error: deleteError } = await auth.supabase
      .from('metodos_pago_usuario')
      .delete()
      .eq('id', id)
      .eq('usuario_id', auth.userId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (existing.es_principal) {
      const { data: nextMethod } = await auth.supabase
        .from('metodos_pago_usuario')
        .select('id')
        .eq('usuario_id', auth.userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextMethod?.id) {
        await auth.supabase
          .from('metodos_pago_usuario')
          .update({ es_principal: true })
          .eq('id', nextMethod.id)
          .eq('usuario_id', auth.userId);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error eliminando metodo.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
