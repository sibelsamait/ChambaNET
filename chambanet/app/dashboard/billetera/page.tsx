import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import Sidebar from '@/app/dashboard/components/Sidebar';
import WalletPanel from './components/WalletPanel';
import PaymentMethodsCard from './components/PaymentMethodsCard';
import { isSupportAdminUser } from '@/lib/supportAuth';

export default async function BilleteraPage() {
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

  // Obtener datos del usuario
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombres, apellido_paterno, email, rut')
    .eq('id', userId)
    .single();

  const { data: imagenUsuario } = await supabase
    .from('user_imagenes')
    .select('image_data_url')
    .eq('user_id', userId)
    .maybeSingle();

  // Obtener saldo actual de billetera
  const { data: saldoResult } = await supabase.rpc('get_saldo_billetera', {
    p_usuario_id: userId,
  });

  const saldoActual = saldoResult || 0;

  // Obtener historial de transacciones
  const { data: transaccionesData } = await supabase
    .from('transacciones_billetera')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false });

  const transacciones = transaccionesData ?? [];

  const isSupportAdmin = isSupportAdminUser(usuario?.email, usuario?.rut);

  // Determinar rol del usuario (trabajador o empleador o ambos)
  // Esto se inferiría del contexto - por ahora asumimos que puede ser ambos
  const rol = 'trabajador'; // En producción, derivar del context del usuario

  return (
    <div className="flex min-h-screen flex-col bg-blue-500 text-gray-900 font-sans lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar
        nombres={usuario?.nombres}
        apellidoPaterno={usuario?.apellido_paterno}
        estrellas={null}
        imagenUrl={imagenUsuario?.image_data_url}
        isSupportAdmin={isSupportAdmin}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-extrabold text-white">Billetera</h1>
            <p className="mt-2 text-blue-100">
              Consulta tu saldo y el historial de transacciones
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <PaymentMethodsCard />

          {/* Saldo Actual */}
          <div className="rounded-2xl border-2 border-[#d7cc83] bg-gradient-to-br from-[#f0e3aa] to-[#e8d87a] p-8 shadow-lg">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-700">
              Saldo Disponible
            </h2>
            <p className="mt-4 text-5xl font-extrabold text-gray-900">
              {new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
              }).format(saldoActual)}
            </p>
            <p className="mt-2 text-sm text-gray-700">
              Última actualización: {new Date().toLocaleDateString('es-CL')}
            </p>
          </div>

          {/* Resumen de Movimientos */}
          <div className="grid gap-4 sm:grid-cols-3">
            <ResumenMovimiento
              titulo="Pagos Liberados"
              monto={transacciones
                .filter((t) => t.tipo === 'PAGO_LIBERADO')
                .reduce((sum, t) => sum + t.monto, 0)}
              icono="💰"
            />
            <ResumenMovimiento
              titulo="Compensaciones"
              monto={transacciones
                .filter((t) => t.tipo === 'COMPENSACION')
                .reduce((sum, t) => sum + t.monto, 0)}
              icono="🤝"
            />
            <ResumenMovimiento
              titulo="Reembolsos"
              monto={transacciones
                .filter((t) => t.tipo === 'REEMBOLSO')
                .reduce((sum, t) => sum + t.monto, 0)}
              icono="↩️"
            />
          </div>

          {/* Panel de Transacciones */}
          <WalletPanel
            usuario_id={userId}
            rol={rol as 'trabajador' | 'empleador'}
            initialTransacciones={transacciones}
            initialSaldo={saldoActual}
          />
        </div>
      </main>
    </div>
  );
}

/**
 * Componente auxiliar para mostrar resumen de movimientos
 */
function ResumenMovimiento({
  titulo,
  monto,
  icono,
}: {
  titulo: string;
  monto: number;
  icono: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">
            {new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              minimumFractionDigits: 0,
            }).format(Math.max(0, monto))}
          </p>
        </div>
        <span className="text-3xl">{icono}</span>
      </div>
    </div>
  );
}
