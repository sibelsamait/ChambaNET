'use client';

import React, { useState, useMemo } from 'react';
import { Pago, CasoDisputa, ResolverDisputaResponse } from '@/types/pagos';

interface DisputeResolverUIProps {
  pagos_en_disputa: Pago[];
  isLoading?: boolean;
  onResolve?: (response: ResolverDisputaResponse) => void;
}

type CasoConfigurado = 'A' | 'B' | null;

/**
 * DisputeResolver - Panel de resolución de disputas (Solo Soporte/Admin)
 *
 * Permite al equipo de soporte:
 * - Ver chambas en estado DISPUTA
 * - Definir porcentajes de reembolso/compensación
 * - Calcular automáticamente los montos
 * - Ejecutar la resolución
 */
export default function DisputeResolverUI({
  pagos_en_disputa,
  isLoading = false,
  onResolve,
}: DisputeResolverUIProps) {
  const [selectedPagoId, setSelectedPagoId] = useState<string | null>(
    pagos_en_disputa[0]?.id || null
  );
  const [casoSeleccionado, setCasoSeleccionado] = useState<CasoConfigurado>(null);
  const [porcentajeReembolsoEmpleador, setPorcentajeReembolsoEmpleador] = useState(15);
  const [porcentajeCompensacionTrabajador, setPorcentajeCompensacionTrabajador] = useState(15);
  const [descripcion, setDescripcion] = useState('');
  const [requiereLegal, setRequiereLegal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pagoPSeleccionado = useMemo(
    () => pagos_en_disputa.find((p) => p.id === selectedPagoId),
    [selectedPagoId, pagos_en_disputa]
  );

  // Validations
  const esCasoA = casoSeleccionado === 'A';
  const esCasoB = casoSeleccionado === 'B';

  // Validar rango de porcentajes según caso
  const esValido = useMemo(() => {
    if (!casoSeleccionado) return false;

    if (esCasoA) {
      // CASO A: 15% es fijo típicamente
      return porcentajeCompensacionTrabajador === 15;
    }

    if (esCasoB) {
      // CASO B: 15-30% es el rango permitido
      return (
        porcentajeReembolsoEmpleador >= 15 &&
        porcentajeReembolsoEmpleador <= 30 &&
        porcentajeReembolsoEmpleador <= 40
      );
    }

    return false;
  }, [casoSeleccionado, porcentajeReembolsoEmpleador, porcentajeCompensacionTrabajador, esCasoA, esCasoB]);

  // Cálculos financieros
  const calculos = useMemo(() => {
    if (!pagoPSeleccionado) return null;

    const montoBase = pagoPSeleccionado.monto_base;
    const tarifaServicio = pagoPSeleccionado.tarifa_servicio;
    const montoTotal = pagoPSeleccionado.monto_total;

    if (esCasoA) {
      // Caso A: Trabajador reclama durante EN_OBRA
      // Compensación al trabajador: 15% del monto_base
      const compensacionTrabajador =
        (montoBase * porcentajeCompensacionTrabajador) / 100;

      // Reembolso al empleador: monto_total MENOS tarifa MENOS compensación
      const reembolsoEmpleador = montoTotal - tarifaServicio - compensacionTrabajador;

      // Retención de plataforma: tarifa + compensación pagada
      const retencionPlataforma = tarifaServicio;

      return {
        caso: 'A' as const,
        compensacionTrabajador,
        reembolsoEmpleador,
        retencionPlataforma,
        desglose: {
          "Total A Pago": montoTotal,
          "Tarifa ChambaNET": tarifaServicio,
          "Compensación Trabajador": compensacionTrabajador,
          "Reembolso Empleador": reembolsoEmpleador,
        },
      };
    }

    if (esCasoB) {
      // Caso B: Empleador reclama por incumplimiento parcial
      // Máximo reembolso 40% del monto_total
      const maxReembolsoEmpleador = (montoTotal * 40) / 100;
      const reembolsoEmpleador = Math.min(
        (montoTotal * porcentajeReembolsoEmpleador) / 100,
        maxReembolsoEmpleador
      );

      // Lo que queda es penalización a la plataforma + compensación al trabajador
      const remanente = montoTotal - reembolsoEmpleador;

      return {
        caso: 'B' as const,
        reembolsoEmpleador,
        remanente,
        desglose: {
          "Total A Pago": montoTotal,
          "Reembolso Empleador": reembolsoEmpleador,
          "Penalización/Retención": remanente,
          "% de Reembolso Configurado": porcentajeReembolsoEmpleador,
        },
      };
    }

    return null;
  }, [pagoPSeleccionado, casoSeleccionado, porcentajeReembolsoEmpleador, porcentajeCompensacionTrabajador, esCasoA, esCasoB]);

  // Manejar envío de resolución
  const handleResolverDisputa = async () => {
    if (!selectedPagoId || !casoSeleccionado || !esValido) {
      setError('Por favor completa todos los campos válidos');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const body: Record<string, unknown> = {
        pago_id: selectedPagoId,
        caso: (`CASO_${casoSeleccionado}` as CasoDisputa),
        descripcion,
        requiere_revision_legal: requiereLegal,
      };

      if (esCasoA) {
        body.porcentaje_compensacion = porcentajeCompensacionTrabajador;
      } else if (esCasoB) {
        body.porcentaje_reembolso = porcentajeReembolsoEmpleador;
      }

      const res = await fetch('/api/pagos/resolucion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al resolver disputa');
      }

      setSuccess('Disputa resuelta exitosamente');
      if (onResolve) {
        onResolve(data);
      }

      // Reset form
      setTimeout(() => {
        setSelectedPagoId(pagos_en_disputa[0]?.id || null);
        setCasoSeleccionado(null);
        setPorcentajeReembolsoEmpleador(15);
        setPorcentajeCompensacionTrabajador(15);
        setDescripcion('');
        setRequiereLegal(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error al resolver disputa:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (pagos_en_disputa.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-6 text-center">
        <p className="font-semibold text-gray-700">✓ No hay disputas pendientes de resolver</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg bg-red-100 px-4 py-3 text-red-700 font-semibold">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-100 px-4 py-3 text-green-700 font-semibold">
          ✓ {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel Izquierdo: Seleccionar Pago */}
        <div className="rounded-2xl border-2 border-[#d7cc83] bg-[#f0e3aa] p-4">
          <h3 className="mb-3 font-extrabold text-gray-700 uppercase tracking-widest">
            Disputas en Cola
          </h3>
          <ul className="space-y-2">
            {pagos_en_disputa.map((pago) => (
              <li key={pago.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPagoId(pago.id)}
                  className={`w-full rounded-lg border-2 px-4 py-3 text-left transition ${
                    selectedPagoId === pago.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-[#d6c989] bg-white hover:bg-blue-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">
                    CLP {new Intl.NumberFormat('es-CL').format(pago.monto_total)}
                  </div>
                  <div className="text-xs text-gray-600">ID: {pago.id.slice(0, 8)}...</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Panel Derecho: Configurar Resolución */}
        {pagoPSeleccionado ? (
          <div className="space-y-4">
            {/* Información del Pago */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-3 font-semibold text-gray-900">Información del Pago</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto Total:</span>
                  <span className="font-semibold">
                    CLP{' '}
                    {new Intl.NumberFormat('es-CL').format(
                      pagoPSeleccionado.monto_total
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto Base:</span>
                  <span className="font-semibold">
                    CLP{' '}
                    {new Intl.NumberFormat('es-CL').format(
                      pagoPSeleccionado.monto_base
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tarifa ChambaNET:</span>
                  <span className="font-semibold">
                    CLP{' '}
                    {new Intl.NumberFormat('es-CL').format(
                      pagoPSeleccionado.tarifa_servicio
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Seleccionar Caso */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-3 font-semibold text-gray-900">Seleccionar Caso</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-3 cursor-pointer hover:bg-blue-50">
                  <input
                    type="radio"
                    name="caso"
                    value="A"
                    checked={casoSeleccionado === 'A'}
                    onChange={() => {
                      setCasoSeleccionado('A');
                      setPorcentajeCompensacionTrabajador(15);
                    }}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">CASO A</div>
                    <div className="text-xs text-gray-600">
                      Trabajador reclama EN_OBRA → Cancelación + Compensación 15%
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-3 cursor-pointer hover:bg-blue-50">
                  <input
                    type="radio"
                    name="caso"
                    value="B"
                    checked={casoSeleccionado === 'B'}
                    onChange={() => {
                      setCasoSeleccionado('B');
                      setPorcentajeReembolsoEmpleador(15);
                    }}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">CASO B</div>
                    <div className="text-xs text-gray-600">
                      Empleador reclama incumplimiento → Reembolso parcial 15-30%
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Inputs Dinámicos según Caso */}
            {esCasoA && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="mb-3 font-semibold text-gray-900">Compensación al Trabajador</h4>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Porcentaje (Fijo 15%)
                  </label>
                  <input
                    type="number"
                    value={porcentajeCompensacionTrabajador}
                    disabled
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Compensación:{' '}
                    <strong>
                      CLP{' '}
                      {new Intl.NumberFormat('es-CL').format(
                        (pagoPSeleccionado.monto_base *
                          porcentajeCompensacionTrabajador) /
                          100
                      )}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            {esCasoB && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="mb-3 font-semibold text-gray-900">Reembolso al Empleador</h4>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Porcentaje de Reembolso ({porcentajeReembolsoEmpleador}%) - Máximo 40%
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="40"
                    value={porcentajeReembolsoEmpleador}
                    onChange={(e) => setPorcentajeReembolsoEmpleador(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Reembolso al empleador:{' '}
                    <strong>
                      CLP{' '}
                      {new Intl.NumberFormat('es-CL').format(
                        (pagoPSeleccionado.monto_total *
                          porcentajeReembolsoEmpleador) /
                          100
                      )}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Desglose Financiero */}
      {calculos && (
        <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6">
          <h3 className="mb-4 font-extrabold text-green-900 uppercase tracking-widest">
            Desglose Financiero
          </h3>
          <div className="space-y-2">
            {Object.entries(calculos.desglose).map(([label, valor]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-semibold text-gray-900">
                  CLP {new Intl.NumberFormat('es-CL').format(valor as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Descripción y Checkbox Legal */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción de la Resolución
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalles de por qué se resuelve así..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400"
            rows={3}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={requiereLegal}
            onChange={(e) => setRequiereLegal(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium text-gray-700">
            ⚠️ Requiere revisión legal
          </span>
        </label>
      </div>

      {/* Botón de Envío */}
      <button
        type="button"
        onClick={handleResolverDisputa}
        disabled={!esValido || isProcessing || isLoading}
        className={`w-full rounded-lg px-6 py-3 font-extrabold text-white transition ${
          esValido && !isProcessing
            ? 'cursor-pointer bg-green-600 hover:bg-green-700'
            : 'cursor-not-allowed bg-gray-400'
        }`}
      >
        {isProcessing ? 'Procesando...' : '✓ Ejecutar Resolución'}
      </button>
    </div>
  );
}
