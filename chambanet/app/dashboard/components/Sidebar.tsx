interface SidebarProps {
  nombres?: string | null;
  apellidoPaterno?: string | null;
  estrellas?: number | null;
  imagenUrl?: string | null;
}

export default function Sidebar({ nombres, apellidoPaterno, estrellas, imagenUrl }: SidebarProps) {
  const primerNombre = nombres?.trim().split(/\s+/)[0] ?? '';
  const nombreCorto = [primerNombre, apellidoPaterno?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  const ratingTexto =
    typeof estrellas === 'number' ? estrellas.toFixed(1).replace('.', ',') : 'Sin valoración';

  return (
    <aside className="w-64 border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
      <div className="p-6 border-b border-gray-200 bg-gray-900">
        {/* Título en blanco sobre fondo negro para destacar la marca */}
        <h1 className="text-2xl font-black text-white tracking-wide">ChambaNET</h1>
      </div>
      <div className="p-6 flex items-center gap-4 border-b border-gray-200">
        {imagenUrl ? (
          <img
            src={imagenUrl}
            alt="Foto de perfil"
            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
        )}
        <div>
          <h2 className="font-bold text-sm text-gray-900">{nombreCorto || 'Usuario'}</h2>
          <p className="text-blue-700 font-bold text-xs flex items-center gap-1">⭐ {ratingTexto}</p>
        </div>
      </div>
      <div className="px-6 py-4 border-b border-gray-200">
        <form action="/api/usuarios/imagen" method="post" encType="multipart/form-data" className="space-y-2">
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp"
            required
            className="block w-full text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-blue-700"
          />
          <button
            type="submit"
            className="w-full text-center p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition text-xs font-semibold"
          >
            Actualizar foto
          </button>
        </form>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto text-sm font-medium text-gray-700">
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Editar información</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Postulaciones</button>
        {/* Ítem activo en azul intenso */}
        <button className="w-full text-left p-3 rounded-md bg-blue-700 text-white shadow-sm">Historial de publicaciones</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Historial de trabajos</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Valoraciones</button>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <a
          href="/api/auth/logout"
          className="block w-full text-center p-3 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        >
          Cerrar sesión
        </a>
      </div>
    </aside>
  );
}