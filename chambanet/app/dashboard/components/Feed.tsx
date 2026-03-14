"use client";

import { useState } from 'react';
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
}

export default function Feed({ chambas }: { chambas: Chamba[] }) {
  const [vista, setVista] = useState<'listado' | 'mapa'>('listado');

  return (
    <main className="flex-1 flex flex-col relative min-w-0">
      {/* Pestañas (Tabs) */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-center bg-white px-6 shrink-0">
        <div className="flex bg-gray-100 rounded-md p-1">
          <button 
            onClick={() => setVista('listado')}
            className={`px-8 py-1 rounded-md text-sm font-bold transition ${vista === 'listado' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}>
            Listado
          </button>
          <button 
            onClick={() => setVista('mapa')}
            className={`px-8 py-1 rounded-md text-sm font-bold transition ${vista === 'mapa' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}>
            Mapa
          </button>
        </div>
      </div>

      {/* Lista de Chambas (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
        {vista === 'listado' ? (
          chambas.length > 0 ? (
            chambas.map((chamba) => (
              
              /* --- TARJETA DE CHAMBA MEZCLADA --- */
              <div key={chamba.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    {/* Título dinámico desde Supabase */}
                    <h3 className="font-bold text-lg">{chamba.titulo}</h3>
                    <p className="text-gray-500 text-sm mt-1">Estado actual: {chamba.estado}</p>
                  </div>
                  <div className="text-right">
                    {/* Pago dinámico formateado */}
                    <span className="font-bold text-[#FFACCA] text-lg">CLP$ {chamba.pago_clp.toLocaleString('es-CL')}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                  <span className="flex items-center gap-1">📅 [Fecha de BD]</span>
                  <span className="flex items-center gap-1">🕒 [Hora de BD]</span>
                  <span className="flex items-center gap-1">📍 [Ubicación desde BD]</span>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div>
                      <p className="text-xs font-bold">Empleador ID: {chamba.empleador_id}</p>
                      <p className="text-[#FFACCA] text-[10px]">⭐ 4,9</p>
                    </div>
                  </div>
                  <button className="bg-[#FFACCA] hover:bg-pink-400 text-white px-6 py-2 rounded-md text-sm font-bold transition">
                    Postular
                  </button>
                </div>
              </div>

            ))
          ) : (
            <p className="text-center text-gray-500 mt-10">No hay chambas disponibles en este momento.</p>
          )
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 font-mono">
            [ Integración con el Mapa interactivo ]
          </div>
        )}
      </div>
    </main>
  );
}