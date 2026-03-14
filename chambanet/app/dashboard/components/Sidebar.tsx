export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-[#FFACCA] font-mono">ChambaNET</h1>
      </div>
      <div className="p-6 flex items-center gap-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
        <div>
          <h2 className="font-bold text-sm">Nombre Apellido</h2>
          <p className="text-[#FFACCA] font-medium text-xs flex items-center gap-1">⭐ 4,8</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto text-sm font-medium">
        <button className="w-full text-left p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Editar información</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Postulaciones</button>
        <button className="w-full text-left p-3 rounded-md bg-pink-50 text-[#FFACCA]">Historial de publicaciones</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Historial de trabajos</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-pink-50 hover:text-[#FFACCA] transition">Valoraciones</button>
      </nav>
    </aside>
  );
}