'use client';

import React, { useState, useMemo } from 'react';
import { TransaccionBilletera } from '@/types/pagos';

interface WalletPanelProps {
  usuario_id: string;
  rol: 'trabajador' | 'empleador';
  initialTransacciones: TransaccionBilletera[];
  initialSaldo: number;
}

type FiltroTipo = 'TODOS' | TransaccionBilletera['tipo'];

/**
 * WalletPanel - Muestra historial de transacciones de billetera
 * Permite filtrar por tipo de transacción y visualizar detalles
 */
export default function WalletPanel({
  usuario_id,
  rol,
  initialTransacciones,
  initialSaldo,
}: WalletPanelProps) {
  const [transacciones, setTransacciones] = React.useState<TransaccionBilletera[]>(
    initialTransacciones
  );
  const [filtro, setFiltro] = useState<FiltroTipo>('TODOS');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Tipos de transacción disponibles
  const tiposDisponibles: FiltroTipo[] = [
    'TODOS',
    'PAGO_LIBERADO',
    'COMPENSACION',
    'REEMBOLSO',
    'PENALIZACION',
    'AJUSTE_ADMINISTRATIVO',
  ];

  // Filtrar transacciones
  const transaccionesFiltradas = useMemo(() => {
    if (filtro === 'TODOS') return transacciones;
    return transacciones.filter((t) => t.tipo === filtro);
  }, [transacciones, filtro]);

  // Obtener label y color para tipo de transacción
  const getTipoInfo = (
    tipo: TransaccionBilletera['tipo']
  ): { label: string; color: string; icono: string } => {
    const info: Record<
      TransaccionBilletera['tipo'],
      { label: string; color: string; icono: string }
    > = {
      PAGO_LIBERADO: {
        label: 'Pago Liberado',
        color: 'bg-green-100 text-green-800',
        icono: '✓',
      },
      COMPENSACION: {
        label: 'Compensación',
        color: 'bg-blue-100 text-blue-800',
        icono: '🤝',
      },
      REEMBOLSO: {
        label: 'Reembolso',
        color: 'bg-amber-100 text-amber-800',
        icono: '↩️',
      },
      PENALIZACION: {
        label: 'Penalización',
        color: 'bg-red-100 text-red-800',
        icono: '⚠️',
      },
      AJUSTE_ADMINISTRATIVO: {
        label: 'Ajuste Administrativo',
        color: 'bg-gray-100 text-gray-800',
        icono: '⚙️',
      },
      TRANSFERENCIA: {
        label: 'Transferencia',
        color: 'bg-purple-100 text-purple-800',
        icono: '↔️',
      },
    };
    return info[tipo];
  };

  // Formatear moneda
  const formatCLP = (monto: number): string => {
    const isPositive = monto >= 0;
    return (
      (isPositive ? '+' : '') +
      new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(monto)
    );
  };

  // Formatear fecha
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-900">Historial de Transacciones</h2>
        <p className="mt-1 text-sm text-gray-600">
          {rol === 'trabajador'
            ? 'Dinero que has recibido por chambas completadas'
            : 'Dinero que has pagado por chambas y servicios'}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {tiposDisponibles.map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setFiltro(tipo)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filtro === tipo
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tipo === 'TODOS' ? 'Todos' : getTipoInfo(tipo).label}
          </button>
        ))}
      </div>

      {/* Lista de Transacciones */}
      <div className="space-y-2">
        {transaccionesFiltradas.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">No hay transacciones en este filtro.</p>
          </div>
        ) : (
          transaccionesFiltradas.map((txn) => {
            const tipoInfo = getTipoInfo(txn.tipo);
            const isExpanded = expandedId === txn.id;

            return (
              <div
                key={txn.id}
                className="rounded-lg border border-gray-200 bg-white transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Tipo + Descripción */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tipoInfo.color}`}>
                          {tipoInfo.icono} {tipoInfo.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{txn.descripcion || '-'}</p>
                      <p className="text-xs text-gray-500">{formatDate(txn.created_at)}</p>
                    </div>

                    {/* Right: Monto */}
                    <div className="text-right">
                      <p
                        className={`text-lg font-extrabold ${
                          txn.monto >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCLP(txn.monto)}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Detalles Expandidos */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <dl className="space-y-2 text-sm">
                      {txn.pago_id && (
                        <>
                          <dt className="font-semibold text-gray-700">ID del Pago</dt>
                          <dd className="text-xs font-mono text-gray-600 break-all">{txn.pago_id}</dd>
                        </>
                      )}

                      {txn.concepto && (
                        <>
                          <dt className="font-semibold text-gray-700">Detalles</dt>
                          <dd className="text-xs text-gray-600">
                            <pre className="overflow-x-auto rounded bg-white p-2 text-xs">
                              {JSON.stringify(txn.concepto, null, 2)}
                            </pre>
                          </dd>
                        </>
                      )}

                      {txn.created_by && (
                        <>
                          <dt className="font-semibold text-gray-700">Procesado por</dt>
                          <dd className="text-xs text-gray-600">{txn.created_by}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Info */}
      <div className="bg-blue-50 rounded-lg p-3 text-xs text-gray-700">
        <p>
          Mostrando <strong>{transaccionesFiltradas.length}</strong> de{' '}
          <strong>{transacciones.length}</strong> transacciones
        </p>
      </div>
    </div>
  );
}
