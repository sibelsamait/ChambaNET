'use client';

import React, { useState, useCallback } from 'react';
import { Pago, DesgloseMontos, CheckoutModalProps } from '@/types/pagos';

const IVA_PORCENTAJE = 0.19;
const MARGEN_SERVICIO_PORCENTAJE = 0.07;
const TARIFA_SERVICIO_PORCENTAJE = IVA_PORCENTAJE + MARGEN_SERVICIO_PORCENTAJE;

/**
 * CheckoutModal - Flujo de pago para empleadores
 * - Muestra desglose de montos
 * - Crea Payment Intent con MercadoPago (sin capturar)
 * - Protege contra alteración de porcentajes
 */
export default function CheckoutModal({
  isOpen,
  trabajador,
  chamba,
  onClose,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular desglose de montos
  const calcularDesglose = useCallback((monto_base: number): DesgloseMontos => {
    const tarifa_servicio = monto_base * TARIFA_SERVICIO_PORCENTAJE;
    const monto_total = monto_base + tarifa_servicio;

    return {
      monto_base,
      tarifa_servicio: Math.round(tarifa_servicio * 100) / 100,
      monto_total: Math.round(monto_total * 100) / 100,
      porcentaje_tarifa: TARIFA_SERVICIO_PORCENTAJE * 100,
    };
  }, []);

  const desglose = calcularDesglose(chamba.monto_base);

  // Formatear moneda
  const formatCLP = (monto: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(monto);
  };

  // Procesar pago
  const handlePay = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Crear el pago en la base de datos
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chamba_id: chamba.id,
          trabajador_id: trabajador.id,
          monto_base: desglose.monto_base,
          tarifa_servicio: desglose.tarifa_servicio,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear el pago');
      }

      const { pago, payment_intent } = await res.json();

      // 2. Llamar callback de éxito para actualizar estado local
      onPaymentSuccess(pago);

      // 3. Si Mercado Pago devolvió URL, redirigimos al checkout real
      if (payment_intent?.checkout_url) {
        window.location.assign(payment_intent.checkout_url);
        return;
      }

      // 4. Fallback: cerrar modal
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error en checkout:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-[#d7cc83] bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-xl font-extrabold text-gray-900">Solicitar Chamba</h2>
          <p className="mt-1 text-sm text-gray-600">{chamba.titulo}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Trabajador */}
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-blue-50 p-4">
          {trabajador.imagenUrl && (
            <img
              src={trabajador.imagenUrl}
              alt={trabajador.nombre}
              className="h-12 w-12 rounded-full object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">{trabajador.nombre}</h3>
            <p className="truncate text-sm text-gray-600">{trabajador.email}</p>
          </div>
        </div>

        {/* Desglose de Montos */}
        <div className="mb-6 space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Monto para el trabajador</span>
            <span className="font-semibold text-gray-900">{formatCLP(desglose.monto_base)}</span>
          </div>

          <div className="flex justify-between border-t border-gray-200 pt-3">
            <div>
              <span className="text-sm font-medium text-gray-700">
                IVA + Servicio de Plataforma
              </span>
              <span className="ml-1 text-xs text-gray-500">
                ({desglose.porcentaje_tarifa.toFixed(0)}%)
              </span>
            </div>
            <span className="font-semibold text-gray-900">
              {formatCLP(desglose.tarifa_servicio)}
            </span>
          </div>

          <div className="flex justify-between border-t border-gray-200 pt-3">
            <span className="font-extrabold text-gray-900">Monto Total a Pagar</span>
            <span className="rounded-lg bg-blue-100 px-3 py-1 font-extrabold text-blue-900">
              {formatCLP(desglose.monto_total)}
            </span>
          </div>
        </div>

        {/* Info de Seguridad */}
        <div className="mb-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">
            ✓ Pago Seguro: El dinero se retiene hasta que se complete la chamba.
          </p>
          <p className="mt-1">
            ✓ Sin cambios: El monto se fija al confirmar. La tarifa corresponde a IVA (19%) +
            servicio de plataforma (7%).
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={isProcessing}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
          </button>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Al confirmar aceptas los{' '}
          <a href="#" className="font-semibold underline hover:text-gray-700">
            términos de pago
          </a>
          .
        </p>
      </div>
    </div>
  );
}
