import BrandLogo from '@/app/components/BrandLogo';
import Link from 'next/link';

interface SidebarProps {
  nombres?: string | null;
  apellidoPaterno?: string | null;
  estrellas?: number | null;
  imagenUrl?: string | null;
  isSupportAdmin?: boolean;
}

import ProfileSummary from './ProfileSummary';

export default function Sidebar({ nombres, apellidoPaterno, estrellas, imagenUrl, isSupportAdmin }: SidebarProps) {
  const primerNombre = nombres?.trim().split(/\s+/)[0] ?? '';
  const nombreCorto = [primerNombre, apellidoPaterno?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  const ratingTexto =
    typeof estrellas === 'number' ? estrellas.toFixed(1).replace('.', ',') : 'Sin valoración';

  return (
    <aside className="w-full border-b border-blue-100 bg-[#f2f2f2] lg:w-60 lg:border-b-0 lg:border-r lg:border-r-blue-200 lg:flex lg:flex-shrink-0 lg:flex-col">
      <div className="border-b border-blue-200 bg-[#559ff6] px-4 py-4 shadow-[0_8px_22px_rgba(39,84,140,0.36)] sm:px-6">
        <BrandLogo href="/dashboard" size="sm" textClassName="font-extrabold tracking-wide text-black" />
      </div>
      <ProfileSummary
        fullName={nombreCorto || 'Usuario'}
        ratingText={ratingTexto}
        initialImageUrl={imagenUrl}
      />
      <nav className="space-y-1.5 p-3 text-sm font-medium text-gray-800 lg:flex-1 lg:overflow-y-auto">
        <Link
          href="/dashboard?panel=postulaciones"
          className="liftable block w-full rounded-xl p-2.5 text-left underline decoration-1 underline-offset-4 hover:bg-blue-100"
        >
          Postulaciones
        </Link>
        <Link
          href="/dashboard?panel=publicaciones"
          className="liftable block w-full rounded-xl bg-white/90 p-2.5 text-left underline decoration-1 underline-offset-4 shadow-[0_8px_14px_rgba(36,72,117,0.18)] hover:bg-blue-100"
        >
          Historial de publicaciones
        </Link>
        <Link
          href="/dashboard?panel=postulaciones"
          className="liftable block w-full rounded-xl p-2.5 text-left underline decoration-1 underline-offset-4 hover:bg-blue-100"
        >
          Historial de trabajos
        </Link>
        <Link
          href="/dashboard/perfil#valoraciones"
          className="liftable block w-full rounded-xl p-2.5 text-left underline decoration-1 underline-offset-4 hover:bg-blue-100"
        >
          Valoraciones
        </Link>
        {isSupportAdmin ? (
          <Link
            href="/soporte"
            className="liftable block w-full rounded-xl bg-blue-100 p-2.5 text-left font-extrabold underline decoration-1 underline-offset-4 hover:bg-blue-200"
          >
            Mesa de soporte
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-blue-200 p-3 lg:mt-auto">
        <a
          href="/api/auth/logout"
          className="liftable block w-full rounded-xl bg-white p-2.5 text-center text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-blue-100"
        >
          Cerrar sesión
        </a>
      </div>
    </aside>
  );
}