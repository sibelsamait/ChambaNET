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

    // 4. Respuesta exitosa con la sesión (incluye el access_token)
    return NextResponse.json(
      { 
        message: 'Login exitoso.', 
        user: data.user,
        session: data.session 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error interno del servidor:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el login.' },
      { status: 500 }
    );
  }
}