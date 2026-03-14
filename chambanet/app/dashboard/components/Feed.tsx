"use client";

import { useState } from 'react';
import Avatar from './Avatar';

interface Chamba {
  id: string;
  titulo: string;
  descripcion: string;
  pago_clp: number;
  estado: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
  direccion_texto: string;
  empleador_id: string;
  empleador_imagen_url?: string | null;
  empleador?: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    promedio_valoracion?: number | null;
  } | null;
}

export default function Feed({ chambas }: { chambas: Chamba[] }) {
  const [vista, setVista] = useState<'listado' | 'mapa'>('listado');
  // Estado para saber a qué chamba se está postulando en este instante
  const [postulandoId, setPostulandoId] = useState<string | null>(null);

  const handlePostular = async (chambaId: string) => {
    // Bloqueamos el botón visualmente
    setPostulandoId(chambaId);

    try {
      const response = await fetch('/api/postulaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Solo enviamos el ID de la chamba. El backend debería sacar el ID del trabajador 
        // desde la cookie o el token de sesión (JWT) por seguridad.
        body: JSON.stringify({ chamba_id: chambaId }), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al postular');
      }

      alert('¡Postulación enviada con éxito! Revisa la pestaña de Postulaciones.');
      
      // NOTA: En un caso real, aquí actualizarías el estado local para quitar 
      // la chamba de la lista o cambiar el botón a "Postulado".

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error("Error en la postulación:", error);
      alert(`No se pudo postular: ${message}`);
    } finally {
      // Liberamos el botón
      setPostulandoId(null);
    }
  };

  return (
    <main className="flex-1 flex flex-col relative min-w-0 bg-gray-50">
      {/* Pestañas */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-center bg-white px-3 sm:px-6 shrink-0">
        <div className="flex w-full max-w-xs bg-gray-100 rounded-md p-1 border border-gray-200 sm:max-w-none sm:w-auto">
          <button 
            onClick={() => setVista('listado')}
            className={`flex-1 px-4 py-1 rounded text-sm font-bold transition sm:flex-none sm:px-8 ${vista === 'listado' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>
            Listado
          </button>
          <button 
            onClick={() => setVista('mapa')}
            className={`flex-1 px-4 py-1 rounded text-sm font-bold transition sm:flex-none sm:px-8 ${vista === 'mapa' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>
            Mapa
          </button>
        </div>
      </div>

      {/* Lista de Chambas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 sm:p-4 lg:p-6">
        {vista === 'listado' ? (
          chambas.length > 0 ? (
            chambas.map((chamba) => (
              <div key={chamba.id} className="bg-white p-4 sm:p-5 rounded-md border border-gray-200 shadow-sm flex flex-col gap-3 hover:border-blue-300 transition-colors">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-gray-900">{chamba.titulo}</h3>
                    <p className="text-gray-600 text-sm mt-1">Estado actual: <span className="font-medium text-gray-900">{chamba.estado}</span></p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="font-black text-blue-700 text-lg sm:text-xl">CLP$ {chamba.pago_clp.toLocaleString('es-CL')}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                  <span className="flex items-center gap-1">📅 [Fecha]</span>
                  <span className="flex items-center gap-1">🕒 [Hora]</span>
                  <span className="flex items-center gap-1">📍 [Ubicación]</span>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      imageUrl={chamba.empleador_imagen_url}
                      name={`${chamba.empleador?.nombres || ''} ${chamba.empleador?.apellido_paterno || ''}`.trim()}
                      alt="Foto del empleador"
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      fallbackClassName="text-[10px]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {chamba.empleador?.nombres
                          ? `Empleador: ${chamba.empleador.nombres.split(/\s+/)[0]} ${chamba.empleador.apellido_paterno || ''}`.trim()
                          : `Empleador ID: ${chamba.empleador_id.substring(0, 8)}...`}
                      </p>
                      <p className="text-blue-700 font-bold text-[10px]">
                        ⭐{' '}
                        {typeof chamba.empleador?.promedio_valoracion === 'number'
                          ? chamba.empleador.promedio_valoracion.toFixed(1).replace('.', ',')
                          : 'Sin valoración'}
                      </p>
                    </div>
                  </div>
                  
                  {/* --- BOTÓN CONECTADO --- */}
                  <button 
                    onClick={() => handlePostular(chamba.id)}
                    disabled={postulandoId === chamba.id}
                    className={`w-full sm:w-auto px-6 py-2 rounded text-sm font-bold transition-colors shadow-sm ${
                      postulandoId === chamba.id 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-700 hover:bg-blue-800 text-white'
                    }`}
                  >
                    {postulandoId === chamba.id ? 'Enviando...' : 'Postular'}
                  </button>
                  
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-10">No hay chambas disponibles en este momento.</p>
          )
        ) : (
          <div className="h-full min-h-48 flex items-center justify-center text-gray-400">
            [ Integración con el Mapa interactivo ]
          </div>
        )}
      </div>
    </main>
  );
}