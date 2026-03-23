import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getSupportAuthContext } from '@/lib/supportAuth';
import { CasoDisputa, Pago, ResolverDisputaResponse, DetallesDisputa } from '@/types/pagos';
import {
  findMercadoPagoPaymentByExternalReference,
  refundMercadoPagoPayment,
} from '@/lib/mercadopago';

/**
 * POST /api/pagos/resolucion
 * Resuelve una disputa de pago aplicando las políticas de negocio
 *
 * Requiere autenticación con rol soporte/admin
 */
export async function POST(request: Request) {
  try {
    // 1. Validar autenticación y rol
    const authContextResult = await getSupportAuthContext();
    if (!authContextResult.ok) {
      return NextResponse.json(
        { error: authContextResult.error },
        { status: authContextResult.status }
      );
    }

    const { context } = authContextResult;
    const { userId: resueltoEm, isSupportAdmin } = context;

    if (!isSupportAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado: Solo soporte/admin pueden resolver disputas' },
        { status: 403 }
      );
    }

    // 2. Parsear el request
    const body = await request.json();
    const {
      pago_id,
      caso,
      porcentaje_compensacion,
      porcentaje_reembolso,
      descripcion,
      requiere_revision_legal,
    } = body;

    // 3. Validar campos requeridos
    if (!pago_id || !caso || !descripcion) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: pago_id, caso, descripcion' },
        { status: 400 }
      );
    }

    // 4. Validar caso
    if (!['CASO_A', 'CASO_B'].includes(caso)) {
      return NextResponse.json(
        { error: 'Caso inválido. Debe ser CASO_A o CASO_B' },
        { status: 400 }
      );
    }

    // 5. Obtener pago de la BD
    const supabase = createSupabaseServerClient();
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .single();

    if (pagoError || !pago) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // 6. Verificar que el pago está en estado DISPUTA
    if (pago.estado !== 'DISPUTA') {
      return NextResponse.json(
        { error: `El pago debe estar en estado DISPUTA. Estado actual: ${pago.estado}` },
        { status: 409 }
      );
    }

    // 7. Aplicar políticas de negocio según el caso
    let resolucion;

    if (caso === 'CASO_A') {
      resolucion = await aplicarCasoA(pago, porcentaje_compensacion || 15);
    } else {
      resolucion = await aplicarCasoB(pago, porcentaje_reembolso || 15);
    }

    // 8. Ejecutar refund parcial real en Mercado Pago (monto reembolsado al empleador)
    let refundId: number | null = null;
    if (pago.mp_payment_intent_id) {
      const looksLikePaymentId = /^\d+$/.test(String(pago.mp_payment_intent_id));
      const resolvedPaymentId = looksLikePaymentId
        ? String(pago.mp_payment_intent_id)
        : (await findMercadoPagoPaymentByExternalReference(pago.id))?.id?.toString();

      if (!resolvedPaymentId) {
        return NextResponse.json(
          {
            error:
              'No se encontró payment_id en Mercado Pago para reembolso. Verifica webhook y vuelve a intentar.',
          },
          { status: 409 }
        );
      }

      const refund = await refundMercadoPagoPayment(
        resolvedPaymentId,
        resolucion.montoReembolsoEmpleador
      );
      refundId = refund.id;
    }

    // 9. Actualizar el pago en la BD
    const detallesDisputa: DetallesDisputa = {
      caso: caso as CasoDisputa,
      razon: pago.detalles_disputa?.razon || 'No especificada',
      fecha_inicio: pago.detalles_disputa?.fecha_inicio || new Date().toISOString(),
      fecha_resolucion: new Date().toISOString(),
      notas: refundId ? `${descripcion} | MP refund_id=${refundId}` : descripcion,
      resuelto_por: resueltoEm,
    };

    const { error: updateError } = await supabase
      .from('pagos')
      .update({
        estado: 'REEMBOLSADO',
        detalles_disputa: detallesDisputa,
        porcentaje_reembolso: resolucion.porcentajeAplicado,
        monto_reembolso: resolucion.montoReembolso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pago_id);

    if (updateError) {
      throw new Error(`Error al actualizar pago: ${updateError.message}`);
    }

    // 10. Crear transacciones de billetera
    const transacciones = await crearTransacciones(
      pago,
      resolucion,
      caso as CasoDisputa,
      resueltoEm
    );

    // 11. Validar que requiere legal si está marcado
    if (requiere_revision_legal) {
      // Aquí iría la lógica para notificar al equipo legal
      console.log(`⚠️ Disputa ${pago_id} requiere revisión legal`);
    }

    // 12. Responder con éxito
    const response: ResolverDisputaResponse = {
      success: true,
      pago: {
        ...pago,
        estado: 'REEMBOLSADO',
        detalles_disputa: detallesDisputa,
        porcentaje_reembolso: resolucion.porcentajeAplicado,
        monto_reembolso: resolucion.montoReembolso,
      },
      transacciones_creadas: transacciones,
      detalles_resolucion: {
        monto_reembolso_empleador: resolucion.montoReembolsoEmpleador,
        monto_compensacion_trabajador: resolucion.montoCompensacionTrabajador,
        monto_penalizacion_plataforma: resolucion.montoPenalizacionPlataforma,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en resolución de disputa:', error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

interface ResolucionPolitica {
  porcentajeAplicado: number;
  montoReembolso: number;
  montoReembolsoEmpleador: number;
  montoCompensacionTrabajador: number;
  montoPenalizacionPlataforma: number;
}

/**
 * CASO A: Trabajador reclama durante EN_OBRA
 * - Cancelación forzosa de la chamba
 * - Reembolso parcial al empleador: monto_total MENOS tarifa MENOS compensación
 * - Compensación al trabajador: 15% del monto_base
 */
async function aplicarCasoA(pago: Pago, porcentajeCompensacion: number): Promise<ResolucionPolitica> {
  const montoBase = pago.monto_base;
  const tarifaServicio = pago.tarifa_servicio;
  const montoTotal = pago.monto_total;

  // Compensación al trabajador: 15% del monto_base
  const compensacionTrabajador = (montoBase * porcentajeCompensacion) / 100;

  // Reembolso al empleador: monto_total MENOS tarifa MENOS compensación
  const reembolsoEmpleador = montoTotal - tarifaServicio - compensacionTrabajador;

  // Retención de plataforma: Solo la tarifa
  const penalizacionPlataforma = tarifaServicio;

  return {
    porcentajeAplicado: porcentajeCompensacion,
    montoReembolso: reembolsoEmpleador,
    montoReembolsoEmpleador: reembolsoEmpleador,
    montoCompensacionTrabajador: compensacionTrabajador,
    montoPenalizacionPlataforma: penalizacionPlataforma,
  };
}

/**
 * CASO B: Empleador reclama durante EN_OBRA por incumplimiento parcial
 * - Reembolso al empleador: entre 15% y 30% (máximo 40% del monto_total)
 * - Lo restante queda como penalización/costo operativo
 */
async function aplicarCasoB(pago: Pago, porcentajeReembolso: number): Promise<ResolucionPolitica> {
  const montoTotal = pago.monto_total;

  // Validar rango
  if (porcentajeReembolso < 15 || porcentajeReembolso > 40) {
    throw new Error('Porcentaje de reembolso debe estar entre 15% y 40%');
  }

  // Reembolso al empleador
  const reembolsoEmpleador = (montoTotal * porcentajeReembolso) / 100;

  // Lo que queda es penalización a la plataforma + cuota del trabajador
  const penalizacionPlataforma = montoTotal - reembolsoEmpleador;

  return {
    porcentajeAplicado: porcentajeReembolso,
    montoReembolso: reembolsoEmpleador,
    montoReembolsoEmpleador: reembolsoEmpleador,
    montoCompensacionTrabajador: 0,
    montoPenalizacionPlataforma: penalizacionPlataforma,
  };
}

/**
 * Crear transacciones de billetera para registrar movimientos
 */
async function crearTransacciones(
  pago: Pago,
  resolucion: ResolucionPolitica,
  caso: CasoDisputa,
  resueltoEm: string
) {
  const supabase = createSupabaseServerClient();
  const transacciones = [];

  try {
    // Transacción 1: Reembolso al empleador
    const { data: txnReembolso } = await supabase
      .from('transacciones_billetera')
      .insert({
        usuario_id: pago.empleador_id,
        tipo: 'REEMBOLSO',
        monto: resolucion.montoReembolsoEmpleador,
        descripcion: `Reembolso por disputa (${caso}) - Chamba #${pago.chamba_id.slice(0, 8)}`,
        pago_id: pago.id,
        concepto: {
          caso,
          tipo_transaccion: 'reembolso_empleador',
          porcentaje_aplicado: resolucion.porcentajeAplicado,
        },
        created_by: resueltoEm,
      })
      .select()
      .single();

    if (txnReembolso) {
      transacciones.push(txnReembolso);
    }

    // Transacción 2: Compensación al trabajador (si aplica - CASO A)
    if (resolucion.montoCompensacionTrabajador > 0) {
      const { data: txnCompensacion } = await supabase
        .from('transacciones_billetera')
        .insert({
          usuario_id: pago.trabajador_id,
          tipo: 'COMPENSACION',
          monto: resolucion.montoCompensacionTrabajador,
          descripcion: `Compensación por disputa (${caso}) - Chamba #${pago.chamba_id.slice(0, 8)}`,
          pago_id: pago.id,
          concepto: {
            caso,
            tipo_transaccion: 'compensacion_trabajador',
            porcentaje_aplicado: 15,
          },
          created_by: resueltoEm,
        })
        .select()
        .single();

      if (txnCompensacion) {
        transacciones.push(txnCompensacion);
      }
    }

    // Transacción 3: Penalización/Retención de plataforma
    if (resolucion.montoPenalizacionPlataforma > 0) {
      const { data: txnPenalizacion } = await supabase
        .from('transacciones_billetera')
        .insert({
          usuario_id: pago.empleador_id,
          tipo: 'PENALIZACION',
          monto: -resolucion.montoPenalizacionPlataforma, // Negativo = salida
          descripcion: `Penalización/Retención por disputa (${caso})`,
          pago_id: pago.id,
          concepto: {
            caso,
            tipo_transaccion: 'penalizacion_plataforma',
          },
          created_by: resueltoEm,
        })
        .select()
        .single();

      if (txnPenalizacion) {
        transacciones.push(txnPenalizacion);
      }
    }
  } catch (error) {
    console.error('Error creando transacciones:', error);
    throw error;
  }

  return transacciones;
}
