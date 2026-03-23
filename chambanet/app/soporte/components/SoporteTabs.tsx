'use client';

import React, { useState } from 'react';
import SupportConsole from './SupportConsole';
import DisputeResolverUI from './DisputeResolver';
import NotificationsBell from '@/app/dashboard/components/NotificationsBell';
import { Pago, ResolverDisputaResponse } from '@/types/pagos';

type TabActivo = 'tickets' | 'disputas';

interface SoporteTabsProps {
  pagosEnDisputa: Pago[];
}

/**
 * SoporteTabs - Componente contenedor que alterna entre:
 * 1. SupportConsole (Tickets)
 * 2. DisputeResolverUI (Resolución de Disputas)
 */
export default function SoporteTabs({ pagosEnDisputa }: SoporteTabsProps) {
  const [tabActivo, setTabActivo] = useState<TabActivo>('tickets');
  const [pagosActualizados, setPagosActualizados] = useState(pagosEnDisputa);

  const handleDisputaResuelto = (response: ResolverDisputaResponse) => {
    // Actualizar la lista de pagos removiendo el resuelto
    setPagosActualizados((prev) =>
      prev.filter((p) => p.id !== response.pago.id)
    );
    // Cambiar a tab de tickets para mostrar feedback
    setTabActivo('tickets');
  };

  return (
    <div className="min-h-screen bg-blue-500">
      {/* Bell de notificaciones */}
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 sm:right-4 sm:top-4">
        <NotificationsBell />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold text-white">Mesa de Soporte</h1>
          <p className="mt-2 text-blue-100">
            Gestión de tickets, pagos y resolución de disputas con integridad de datos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-blue-300/50 bg-blue-400/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4">
            {/* Tab: Tickets */}
            <button
              type="button"
              onClick={() => setTabActivo('tickets')}
              className={`relative px-4 py-4 text-sm font-semibold transition ${
                tabActivo === 'tickets'
                  ? 'text-white'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              📋 Tickets ({pagosActualizados.length === pagosEnDisputa.length ? 0 : 
                Math.max(0, pagosEnDisputa.filter(p => p.estado === 'DISPUTA').length)})
              {tabActivo === 'tickets' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white" />
              )}
            </button>

            {/* Tab: Disputas */}
            <button
              type="button"
              onClick={() => setTabActivo('disputas')}
              className={`relative px-4 py-4 text-sm font-semibold transition ${
                tabActivo === 'disputas'
                  ? 'text-white'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              ⚖️ Disputas ({pagosActualizados.length})
              {tabActivo === 'disputas' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {tabActivo === 'tickets' && <SupportConsole />}

        {tabActivo === 'disputas' && (
          <>
            {pagosActualizados.length === 0 ? (
              <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-8 text-center">
                <p className="text-lg font-semibold text-green-900">
                  ✓ No hay disputas pendientes
                </p>
                <p className="mt-2 text-sm text-green-700">
                  Todas las disputas han sido resueltas. Excelente trabajo.
                </p>
              </div>
            ) : (
              <DisputeResolverUI
                pagos_en_disputa={pagosActualizados}
                onResolve={handleDisputaResuelto}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
