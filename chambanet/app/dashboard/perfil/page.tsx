import { createSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ActiveProfileView from '../components/ActiveProfileView';

type DireccionPerfil = {
  calle?: string;
  numero?: string;
  region_nombre?: string;
  comuna_nombre?: string;
  region_id?: string;
  comuna_id?: string;
};

function parseDireccionPerfil(raw: unknown): DireccionPerfil {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as DireccionPerfil;
}

export default async function PerfilPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
    redirect('/login');
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !authData.user) {
    redirect('/login');
  }

  const userId = authData.user.id;

  const { data: perfilUsuario } = await supabase
    .from('usuarios')
    .select('nombres, apellido_paterno, apellido_materno, rut, email, telefono, fecha_nacimiento, direccion_completa')
    .eq('id', userId)
    .single();

  const { data: imagenUsuario } = await supabase
    .from('user_imagenes')
    .select('image_data_url')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: valoracionesRaw } = await supabase
    .from('valoraciones')
    .select('estrellas, comentario, emisor_id, creado_en')
    .eq('receptor_id', userId)
    .order('creado_en', { ascending: false });

  const emisorIds = Array.from(new Set((valoracionesRaw || []).map((v) => v.emisor_id).filter(Boolean)));
  const { data: emisores } = emisorIds.length
    ? await supabase
        .from('usuarios')
        .select('id, nombres, apellido_paterno')
        .in('id', emisorIds)
    : { data: [] as Array<{ id: string; nombres: string; apellido_paterno: string | null }> };

  const mapaEmisores = new Map((emisores || []).map((e) => [e.id, e]));

  const valoraciones = (valoracionesRaw || []).map((valoracion) => {
    const emisor = mapaEmisores.get(valoracion.emisor_id);
    const nombre = emisor
      ? `${emisor.nombres?.split(' ')[0] ?? ''} ${emisor.apellido_paterno?.[0] ?? ''}.`.trim()
      : 'Usuario';

    return {
      estrellas: Number(valoracion.estrellas) || 0,
      comentario: valoracion.comentario ?? null,
      emisorNombre: nombre,
    };
  });

  const promedioValoraciones =
    valoraciones.length > 0
      ? valoraciones.reduce((acc, item) => acc + item.estrellas, 0) / valoraciones.length
      : null;

  const { count: activePosts } = await supabase
    .from('chambas')
    .select('*', { count: 'exact', head: true })
    .eq('empleador_id', userId)
    .in('estado', ['PUBLICADA', 'CON_POSTULANTES', 'EN_OBRA', 'ESPERANDO_APROBACION']);

  const { count: completedPosts } = await supabase
    .from('chambas')
    .select('*', { count: 'exact', head: true })
    .eq('empleador_id', userId)
    .eq('estado', 'FINALIZADA');

  const primerNombre = perfilUsuario?.nombres?.trim().split(/\s+/)[0] ?? '';
  const nombreCorto = [primerNombre, perfilUsuario?.apellido_paterno?.trim()].filter(Boolean).join(' ').trim();
  const nombreCompleto = [
    perfilUsuario?.nombres?.trim(),
    perfilUsuario?.apellido_paterno?.trim(),
    perfilUsuario?.apellido_materno?.trim(),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const ratingTexto =
    typeof promedioValoraciones === 'number' && Number.isFinite(promedioValoraciones)
      ? promedioValoraciones.toFixed(1).replace('.', ',')
      : 'Sin valoración';

  const direccion = parseDireccionPerfil(perfilUsuario?.direccion_completa);
  const memberSince = authData.user.created_at ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-blue-500 text-gray-900 font-sans lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar
        nombres={perfilUsuario?.nombres}
        apellidoPaterno={perfilUsuario?.apellido_paterno}
        estrellas={promedioValoraciones ?? undefined}
        imagenUrl={imagenUsuario?.image_data_url}
      />
      <main className="min-w-0 flex-1 overflow-y-auto bg-blue-500/95">
        <ActiveProfileView
          fullName={nombreCompleto || nombreCorto || 'Usuario'}
          ratingText={ratingTexto}
          initialImageUrl={imagenUsuario?.image_data_url}
          rut={perfilUsuario?.rut}
          nombres={perfilUsuario?.nombres ?? ''}
          apellidoPaterno={perfilUsuario?.apellido_paterno ?? ''}
          apellidoMaterno={perfilUsuario?.apellido_materno ?? ''}
          email={perfilUsuario?.email ?? ''}
          telefono={perfilUsuario?.telefono ?? null}
          fechaNacimiento={perfilUsuario?.fecha_nacimiento ?? null}
          memberSince={memberSince}
          direccion={{
            calle: direccion.calle ?? '',
            numero: direccion.numero ?? '',
            regionNombre: direccion.region_nombre ?? '',
            comunaNombre: direccion.comuna_nombre ?? '',
            regionId: direccion.region_id ?? '',
            comunaId: direccion.comuna_id ?? '',
          }}
          valoraciones={valoraciones}
          activePosts={activePosts ?? 0}
          completedPosts={completedPosts ?? 0}
        />
      </main>
    </div>
  );
}