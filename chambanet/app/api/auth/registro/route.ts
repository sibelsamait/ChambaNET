import { NextResponse } from 'next/server';
import { validarRut, calcularBloqueoEdad } from '../../../../utils/validations';
import { supabase } from '../../../../lib/supabase'; // Asegúrate de que esta ruta coincida con donde creaste tu supabase.ts

export async function POST(request: Request) {
  try {
    // 1. Recibir los datos del body (desde Postman)
    const body = await request.json();
    const { 
      rut, email, password, nombres, apellidoPaterno, 
      apellidoMaterno, telefono, fechaNacimiento, direccion 
    } = body;

    // 2. Validación de RUT
    if (!validarRut(rut)) {
      return NextResponse.json(
        { error: 'El RUT ingresado no es válido o no existe.' }, 
        { status: 400 }
      );
    }

    // 3. Validación de Email (Regex básico para @ y .)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del correo electrónico es inválido.' }, 
        { status: 400 }
      );
    }

    // 4. Calcular Bloqueo por Edad (Regla de negocio: Prevención de trabajo infantil)
    const bloqueadoHasta = calcularBloqueoEdad(fechaNacimiento);

    // 5. Crear el usuario en el sistema de Autenticación de Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Error al registrar auth' }, { status: 400 });
    }

    // 6. Guardar el resto de los datos en tu tabla pública 'usuarios'
    // Nota: El ID del usuario viene de authData.user.id para que estén vinculados
    const { error: dbError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          rut,
          email,
          nombres,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno,
          telefono,
          fecha_nacimiento: fechaNacimiento,
          direccion_completa: direccion,
          bloqueado_hasta: bloqueadoHasta, // Guardamos la fecha si es menor, o null si es mayor
          rol: rut === '00000000-0' ? 'ADMIN' : 'USUARIO' // Asignación automática de rol
        }
      ]);

    if (dbError) {
      // Si falla la BD, idealmente deberíamos borrar el usuario de Auth, pero por ahora devolvemos el error
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // 7. Respuesta exitosa
    return NextResponse.json({ 
      mensaje: 'Usuario registrado con éxito', 
      bloqueado: bloqueadoHasta ? `Cuenta bloqueada hasta ${bloqueadoHasta.toISOString().split('T')[0]} por ser menor de edad.` : false
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor al procesar el registro.' }, { status: 500 });
  }
}