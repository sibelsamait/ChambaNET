interface SidebarProps {
  nombres?: string | null;
  apellidoPaterno?: string | null;
  estrellas?: number | null;
  imagenUrl?: string | null;
}

import ProfileSummary from './ProfileSummary';

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
        <h1 className="text-2xl font-black text-white tracking-wide">ChambaNET</h1>
      </div>
      <ProfileSummary
        fullName={nombreCorto || 'Usuario'}
        ratingText={ratingTexto}
        initialImageUrl={imagenUrl}
      />
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto text-sm font-medium text-gray-700">
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Editar información</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Postulaciones</button>
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