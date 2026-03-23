import { createSupabaseServerClient } from '@/lib/supabase';
import { getAverageRatingsByUserIds } from '@/lib/ratings';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from './components/Sidebar';
import Feed from './components/Feed';
import ChatPanel from './components/ChatPanel';

export default async function DashboardPage() {
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

  const { data: perfilUsuario } = await supabase
    .from('usuarios')
    .select('nombres, apellido_paterno')
    .eq('id', authData.user.id)
    .single();

  const { data: imagenUsuario } = await supabase
    .from('user_imagenes')
    .select('image_data_url')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  
  // Consulta a Supabase
  const { data: chambasData, error } = await supabase
    .from('chambas')
    .select(`
      *,
      empleador:usuarios (
        id,
        nombres,
        apellido_paterno
      )
    `)
    .eq('estado', 'PUBLICADA')
    .order('id', { ascending: false });

  if (error) {
    console.error("Error cargando chambas:", error);
  }

  const empleadorIds = Array.from(
    new Set((chambasData || []).map((chamba) => chamba.empleador_id).filter(Boolean))
  );
  const ratingMap = await getAverageRatingsByUserIds([authData.user.id, ...empleadorIds]);

  const { data: imagenesEmpleadores } = empleadorIds.length
    ? await supabase
        .from('user_imagenes')
        .select('user_id, image_data_url')
        .in('user_id', empleadorIds)
    : { data: [] as Array<{ user_id: string; image_data_url: string | null }> };

  const mapaImagenes = new Map(
    (imagenesEmpleadores || []).map((row) => [row.user_id, row.image_data_url])
  );

  const chambas = (chambasData || []).map((chamba) => ({
    ...chamba,
    empleador: {
      ...(chamba.empleador || {}),
      promedio_valoracion: ratingMap.get(chamba.empleador_id) ?? null,
    },
    empleador_imagen_url: mapaImagenes.get(chamba.empleador_id) || null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-blue-500 text-gray-900 font-sans lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar
        nombres={perfilUsuario?.nombres}
        apellidoPaterno={perfilUsuario?.apellido_paterno}
        estrellas={ratingMap.get(authData.user.id) ?? undefined}
        imagenUrl={imagenUsuario?.image_data_url}
      />
      <Feed chambas={chambas} userId={authData.user.id} />
      <ChatPanel userId={authData.user.id} />
    </div>
  );
}