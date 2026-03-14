import { supabase } from '@/lib/supabase'; // Ajusta la ruta a tu cliente de supabase
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

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !authData.user) {
    redirect('/login');
  }
  
  // Consulta a Supabase
  const { data: chambasData, error } = await supabase
    .from('chambas')
    .select('*')
    .eq('estado', 'PUBLICADA')
    .order('id', { ascending: false });

  if (error) {
    console.error("Error cargando chambas:", error);
  }

  const chambas = chambasData || [];

  return (
    <div className="flex h-screen bg-white text-gray-800 font-sans overflow-hidden">
      <Sidebar />
      <Feed chambas={chambas} />
      <ChatPanel />
    </div>
  );
}