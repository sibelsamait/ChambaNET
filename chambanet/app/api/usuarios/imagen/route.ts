import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

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

export async function DELETE() {
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
