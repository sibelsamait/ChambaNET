import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-white text-gray-800 font-sans overflow-hidden">
      
      {/* --- COLUMNA IZQUIERDA: MENÚ DE NAVEGACIÓN --- */}
      <aside className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#FFACCA] font-mono">ChambaNET</h1>
        </div>

        {/* Perfil del Usuario */}
        <div className="p-6 flex items-center gap-4 border-b border-gray-200">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
          <div>
            <h2 className="font-bold text-sm">Nombre Apellido</h2>
            <p className="text-[#FFACCA] font-medium text-xs flex items-center gap-1">
              ⭐ 4,8
            </p>
          </div>
        </div>

        {/* Menú de Opciones */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto text-sm font-medium">
          <a href="#" className="block p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Editar información</a>
          <a href="#" className="block p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Postulaciones</a>
          <a href="#" className="block p-3 rounded-md bg-pink-50 text-[#FFACCA]">Historial de publicaciones</a>
          <a href="#" className="block p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Historial de trabajos</a>
          <a href="#" className="block p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Valoraciones</a>
        </nav>
      </aside>

      {/* --- COLUMNA CENTRAL: FEED (LISTADO/MAPA) --- */}
      <main className="flex-1 flex flex-col relative">
        {/* Pestañas (Tabs) */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-center bg-white px-6">
          <div className="flex bg-gray-100 rounded-md p-1">
            <button className="px-8 py-1 bg-white shadow-sm rounded-md text-sm font-bold text-gray-800">Listado</button>
            <button className="px-8 py-1 text-sm font-medium text-gray-500 hover:text-gray-800">Mapa</button>
          </div>
        </div>

        {/* Lista de Chambas (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
          
          {/* Tarjeta de Chamba 1 */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Ceramista x día</h3>
                <p className="text-gray-500 text-sm mt-1">Necesito reemplazo por día en construcción, cerámica</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-[#FFACCA] text-lg">CLP$ 50.000</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
              <span className="flex items-center gap-1">📅 13/03/2026</span>
              <span className="flex items-center gap-1">🕒 08:30</span>
              <span className="flex items-center gap-1">📍 Avenida Francia 839, Valparaíso</span>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div>
                  <p className="text-xs font-bold">Eduardo M.</p>
                  <p className="text-[#FFACCA] text-[10px]">⭐ 4,9</p>
                </div>
              </div>
              <button className="bg-[#FFACCA] hover:bg-pink-400 text-white px-6 py-2 rounded-md text-sm font-bold transition">
                Postular
              </button>
            </div>
          </div>

          {/* Tarjeta de Chamba 2 */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Ayuda para la feria</h3>
                <p className="text-gray-500 text-sm mt-1">Necesito un chico que me ayude a llevar las bolsas desde la feria hasta mi casa.</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-[#FFACCA] text-lg">CLP$ 15.000</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
              <span className="flex items-center gap-1">📅 13/03/2026</span>
              <span className="flex items-center gap-1">🕒 11:20</span>
              <span className="flex items-center gap-1">📍 Avenida Argentina, Valparaíso</span>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div>
                  <p className="text-xs font-bold">Adelaida T.</p>
                  <p className="text-[#FFACCA] text-[10px]">⭐ 4,2</p>
                </div>
              </div>
              <button className="bg-[#FFACCA] hover:bg-pink-400 text-white px-6 py-2 rounded-md text-sm font-bold transition">
                Postular
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* --- COLUMNA DERECHA: CHAT EN TIEMPO REAL --- */}
      <aside className="w-72 border-l border-gray-200 bg-white flex flex-col">
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          <h2 className="font-bold font-mono">Chat</h2>
          <span className="text-xs bg-pink-100 text-[#FFACCA] px-2 py-1 rounded-full font-bold">EN OBRA</span>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Lista de Chats Simulada */}
          {[
            { id: 1, name: "Empleador", msg: "Hola como est...", active: true },
            { id: 2, name: "Trabajador #1", msg: "Hola como est...", active: false },
            { id: 3, name: "Trabajador #2", msg: "Hola como est...", active: false },
            { id: 4, name: "Trabajador #3", msg: "Hola como est...", active: false },
            { id: 5, name: "Trabajador #4", msg: "Hola como est...", active: false },
          ].map((chat) => (
            <div key={chat.id} className={`p-4 border-b border-gray-100 cursor-pointer transition flex items-center gap-3 ${chat.active ? 'bg-pink-50' : 'hover:bg-gray-50'}`}>
              <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
              <div className="overflow-hidden">
                <p className={`text-sm font-bold ${chat.active ? 'text-gray-900' : 'text-gray-700'}`}>{chat.name}</p>
                <p className="text-xs text-gray-500 truncate">{chat.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

    </div>
  );
}