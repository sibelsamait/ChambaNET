import { createSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ActiveProfileView from '../components/ActiveProfileView';

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
    .select('nombres, apellido_paterno, apellido_materno, rut, promedio_valoracion')
    .eq('id', userId)
    .single();

  const { data: imagenUsuario } = await supabase
    .from('user_imagenes')
    .select('image_data_url')
    .eq('user_id', userId)
    .maybeSingle();

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
    typeof perfilUsuario?.promedio_valoracion === 'number'
      ? perfilUsuario.promedio_valoracion.toFixed(1).replace('.', ',')
      : 'Sin valoración';

  return (
    <div className="flex min-h-screen flex-col bg-blue-500 text-gray-900 font-sans lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar
        nombres={perfilUsuario?.nombres}
        apellidoPaterno={perfilUsuario?.apellido_paterno}
        estrellas={perfilUsuario?.promedio_valoracion}
        imagenUrl={imagenUsuario?.image_data_url}
      />
      <main className="min-w-0 flex-1 overflow-y-auto bg-blue-500/95">
        <ActiveProfileView
          fullName={nombreCompleto || nombreCorto || 'Usuario'}
          ratingText={ratingTexto}
          initialImageUrl={imagenUsuario?.image_data_url}
          rut={perfilUsuario?.rut}
          activePosts={activePosts ?? 0}
          completedPosts={completedPosts ?? 0}
        />
      </main>
    </div>
  );
}