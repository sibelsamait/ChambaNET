import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. Validación de campos
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Faltan credenciales (email y password).' },
        { status: 400 }
      );
    }

    // 2. Autenticación con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 3. Manejo de credenciales inválidas
    if (error) {
      console.error('Error de login:', error.message);
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 } // 401 Unauthorized
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'No se pudo crear la sesión de usuario.' },
        { status: 500 }
      );
    }

    // 4. Respuesta exitosa con cookies de sesión
    const response = NextResponse.json(
      {
        message: 'Login exitoso.',
        user: data.user,
      },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = data.session.expires_in ?? 60 * 60;

    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;

  } catch (error) {
    console.error('Error interno del servidor:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el login.' },
      { status: 500 }
    );
  }
}