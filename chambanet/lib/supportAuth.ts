import { cookies } from 'next/headers';
import { supabase } from './supabase';

const SUPPORT_ADMIN_EMAILS = new Set(['soporte.chambanet@gmail.com']);
const SUPPORT_ADMIN_RUTS = new Set(['00000000-0']);

export function normalizeRut(value?: string | null): string {
  return String(value || '')
    .replace(/\./g, '')
    .trim()
    .toUpperCase();
}

export function isSupportAdminUser(email?: string | null, rut?: string | null): boolean {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRut = normalizeRut(rut);
  return SUPPORT_ADMIN_EMAILS.has(normalizedEmail) || SUPPORT_ADMIN_RUTS.has(normalizedRut);
}

export type AuthSupportContext = {
  userId: string;
  email: string;
  rut: string;
  isSupportAdmin: boolean;
  nombres?: string | null;
  apellidoPaterno?: string | null;
};

export async function getSupportAuthContext(): Promise<
  { ok: true; context: AuthSupportContext } | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
    return { ok: false, status: 401, error: 'No autenticado.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return { ok: false, status: 401, error: 'Sesión inválida o expirada.' };
  }

  const userId = authData.user.id;

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('email, rut, nombres, apellido_paterno')
    .eq('id', userId)
    .maybeSingle();

  if (usuarioError || !usuario) {
    return { ok: false, status: 403, error: 'No se pudo validar el perfil del usuario.' };
  }

  const email = String(usuario.email || '').trim().toLowerCase();
  const rut = normalizeRut(usuario.rut);
  const isSupportAdmin = isSupportAdminUser(email, rut);

  return {
    ok: true,
    context: {
      userId,
      email,
      rut,
      isSupportAdmin,
      nombres: usuario.nombres,
      apellidoPaterno: usuario.apellido_paterno,
    },
  };
}
