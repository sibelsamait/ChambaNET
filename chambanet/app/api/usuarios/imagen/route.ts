import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isSupportAdminUser } from '@/lib/supportAuth';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function isValidSecret(inputSecret: string, configuredSecret: string): boolean {
  const a = Buffer.from(inputSecret, 'utf8');
  const b = Buffer.from(configuredSecret, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function validateAdminSecretIfNeeded(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  providedSecret: string | null
) {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('email, rut')
    .eq('id', userId)
    .maybeSingle();

  const isSupportAdmin = isSupportAdminUser(usuario?.email, usuario?.rut);
  if (!isSupportAdmin) return null;

  const configuredSecret = String(process.env.COMPANY_BANK_CONFIG_SECRET || '').trim();
  const inputSecret = String(providedSecret || '').trim();

  if (!configuredSecret || !inputSecret || !isValidSecret(inputSecret, configuredSecret)) {
    return NextResponse.json(
      {
        error:
          'Debes ingresar la contraseña secreta correcta para editar información del usuario admin.',
      },
      { status: 403 }
    );
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión.' }, { status: 401 });
    }

    const supabase = createSupabaseServerClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image');
    const adminSecret = request.headers.get('x-admin-edit-secret');

    const adminValidationError = await validateAdminSecretIfNeeded(
      supabase,
      authData.user.id,
      adminSecret
    );
    if (adminValidationError) return adminValidationError;

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Debes adjuntar una imagen.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa PNG, JPEG o WEBP.' },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'La imagen supera el tamaño máximo de 2MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const imageDataUrl = `data:${image.type};base64,${buffer.toString('base64')}`;

    const { error: upsertError } = await supabase
      .from('user_imagenes')
      .upsert(
        [
          {
            user_id: authData.user.id,
            image_data_url: imageDataUrl,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('Error guardando imagen de perfil:', upsertError);
      return NextResponse.json(
        {
          error:
            'No se pudo guardar la imagen. Verifica que exista la tabla user_imagenes (ver archivo sql/create_user_imagenes.sql).',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Imagen de perfil actualizada.' }, { status: 200 });
  } catch (error: unknown) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error interno subiendo imagen:', detalle);
    return NextResponse.json(
      { error: 'Error interno al subir imagen.', detalle },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión.' }, { status: 401 });
    }

    const supabase = createSupabaseServerClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const adminSecret = request.headers.get('x-admin-edit-secret');
    const adminValidationError = await validateAdminSecretIfNeeded(
      supabase,
      authData.user.id,
      adminSecret
    );
    if (adminValidationError) return adminValidationError;

    const { error: deleteError } = await supabase
      .from('user_imagenes')
      .delete()
      .eq('user_id', authData.user.id);

    if (deleteError) {
      console.error('Error eliminando imagen de perfil:', deleteError);
      return NextResponse.json({ error: 'No se pudo eliminar la imagen de perfil.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Imagen de perfil eliminada.' }, { status: 200 });
  } catch (error: unknown) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error interno eliminando imagen:', detalle);
    return NextResponse.json(
      { error: 'Error interno al eliminar imagen.', detalle },
      { status: 500 }
    );
  }
}
