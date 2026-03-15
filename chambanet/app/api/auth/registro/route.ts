import { NextResponse } from 'next/server';
import { validarRut, calcularBloqueoEdad } from '../../../../utils/validations';
import { supabase } from '../../../../lib/supabase';

function normalizarRut(rut: string) {
  return rut.replace(/\./g, '').trim().toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      rut,
      email,
      password,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      telefono,
      fechaNacimiento,
      direccion,
    } = body;

    const rutNormalizado = normalizarRut(String(rut || ''));
    const emailNormalizado = String(email || '').trim().toLowerCase();
    const nombresLimpios = String(nombres || '').trim();
    const apellidoPaternoLimpio = String(apellidoPaterno || '').trim();
    const apellidoMaternoLimpio = String(apellidoMaterno || '').trim();
    const passwordTexto = String(password || '');
    const fechaNacimientoTexto = String(fechaNacimiento || '').trim();

    if (
      !rutNormalizado ||
      !emailNormalizado ||
      !passwordTexto ||
      !nombresLimpios ||
      !apellidoPaternoLimpio ||
      !apellidoMaternoLimpio ||
      !fechaNacimientoTexto
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios del registro.' },
        { status: 400 }
      );
    }

    if (passwordTexto.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const fechaNacimientoDate = new Date(fechaNacimientoTexto);
    if (Number.isNaN(fechaNacimientoDate.getTime())) {
      return NextResponse.json(
        { error: 'La fecha de nacimiento no es válida.' },
        { status: 400 }
      );
    }

    if (!direccion || typeof direccion !== 'object') {
      return NextResponse.json(
        { error: 'La dirección es obligatoria.' },
        { status: 400 }
      );
    }

    const calle = String(direccion.calle || '').trim();
    const numero = String(direccion.numero || '').trim();
    const regionId = String(direccion.regionId || '').trim();
    const regionNombre = String(direccion.regionNombre || '').trim();
    const comunaId = String(direccion.comunaId || '').trim();
    const comunaNombre = String(direccion.comunaNombre || '').trim();

    if (!calle || !numero || !regionId || !regionNombre || !comunaId || !comunaNombre) {
      return NextResponse.json(
        { error: 'La dirección está incompleta.' },
        { status: 400 }
      );
    }

    if (!validarRut(rutNormalizado)) {
      return NextResponse.json(
        { error: 'El RUT ingresado no es válido.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      return NextResponse.json(
        { error: 'El formato del correo electrónico es inválido.' },
        { status: 400 }
      );
    }

    const bloqueadoHasta = calcularBloqueoEdad(fechaNacimientoTexto);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailNormalizado,
      password: passwordTexto,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Error al registrar credenciales.' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          rut: rutNormalizado,
          email: emailNormalizado,
          nombres: nombresLimpios,
          apellido_paterno: apellidoPaternoLimpio,
          apellido_materno: apellidoMaternoLimpio,
          telefono: String(telefono || '').trim() || null,
          fecha_nacimiento: fechaNacimientoTexto,
          direccion_completa: {
            calle,
            numero,
            region_id: regionId,
            region_nombre: regionNombre,
            comuna_id: comunaId,
            comuna_nombre: comunaNombre,
          },
          bloqueado_hasta: bloqueadoHasta,
        },
      ]);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({
      mensaje: 'Usuario registrado con éxito',
      bloqueado: bloqueadoHasta ? `Cuenta bloqueada hasta ${bloqueadoHasta.toISOString().split('T')[0]} por ser menor de edad.` : false
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Error interno del servidor al procesar el registro.' }, { status: 500 });
  }
}