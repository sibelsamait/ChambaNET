import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import Sidebar from '@/app/dashboard/components/Sidebar';
import SupportConsole from './components/SupportConsole';
import SoporteTabs from './components/SoporteTabs';
import { isSupportAdminUser } from '@/lib/supportAuth';
import { Pago } from '@/types/pagos';

export default async function SoportePage() {
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
    .select('nombres, apellido_paterno, email, rut')
    .eq('id', authData.user.id)
    .maybeSingle();

  const { data: imagenUsuario } = await supabase
    .from('user_imagenes')
    .select('image_data_url')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  const isSupportAdmin = isSupportAdminUser(perfilUsuario?.email, perfilUsuario?.rut);

  if (!isSupportAdmin) {
    redirect('/dashboard');
  }

  // Obtener pagos en disputa para el DisputeResolver
  const { data: pagosEnDisputa = [] } = await supabase
    .from('pagos')
    .select('*')
    .eq('estado', 'DISPUTA')
    .order('created_at', { ascending: false });

  return (
    <div className="flex min-h-screen flex-col bg-blue-500 text-gray-900 font-sans lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar
        nombres={perfilUsuario?.nombres}
        apellidoPaterno={perfilUsuario?.apellido_paterno}
        estrellas={null}
        imagenUrl={imagenUsuario?.image_data_url}
        isSupportAdmin={isSupportAdmin}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <SoporteTabs 
          pagosEnDisputa={pagosEnDisputa as Pago[]}
        />
      </main>
    </div>
  );
}
