import BrandLogo from '@/app/components/BrandLogo';

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
    <aside className="w-full border-b border-gray-200 bg-white lg:w-64 lg:border-b-0 lg:border-r lg:flex lg:flex-col lg:flex-shrink-0">
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-900 sm:px-6">
        <BrandLogo href="/dashboard" inverted size="sm" textClassName="font-black tracking-wide" />
      </div>
      <ProfileSummary
        fullName={nombreCorto || 'Usuario'}
        ratingText={ratingTexto}
        initialImageUrl={imagenUrl}
      />
      <nav className="p-4 space-y-2 text-sm font-medium text-gray-700 lg:flex-1 lg:overflow-y-auto">
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Editar información</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Postulaciones</button>
        <button className="w-full text-left p-3 rounded-md bg-blue-700 text-white shadow-sm">Historial de publicaciones</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Historial de trabajos</button>
        <button className="w-full text-left p-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition">Valoraciones</button>
      </nav>
      <div className="p-4 border-t border-gray-200 lg:mt-auto">
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