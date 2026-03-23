import { cookies } from 'next/headers';
import { supabase } from './supabase';

const SUPPORT_ADMIN_RUTS = new Set(
  String(process.env.SUPPORT_ADMIN_RUTS || '00000000-0')
    .split(',')
    .map((v) => normalizeRut(v))
    .filter(Boolean)
);

const COMPANY_OWNER_EMAILS = new Set(
  String(process.env.COMPANY_OWNER_EMAILS || 'soporte.chambanet@gmail.com')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
);

const COMPANY_OWNER_RUTS = new Set(
  String(process.env.COMPANY_OWNER_RUTS || '')
    .split(',')
    .map((v) => normalizeRut(v))
    .filter(Boolean)
);

export function normalizeRut(value?: string | null): string {
  return String(value || '')
    .replace(/\./g, '')
    .trim()
    .toUpperCase();
}

export function isSupportAdminUser(email?: string | null, rut?: string | null): boolean {
  const normalizedRut = normalizeRut(rut);
  return SUPPORT_ADMIN_RUTS.has(normalizedRut);
}

export function isCompanyOwnerUser(email?: string | null, rut?: string | null): boolean {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRut = normalizeRut(rut);
  return COMPANY_OWNER_EMAILS.has(normalizedEmail) || COMPANY_OWNER_RUTS.has(normalizedRut);
}

export type AuthSupportContext = {
  userId: string;
  email: string;
  rut: string;
  isSupportAdmin: boolean;
  isCompanyOwner: boolean;
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
  const isCompanyOwner = isCompanyOwnerUser(email, rut);

  return {
    ok: true,
    context: {
      userId,
      email,
      rut,
      isSupportAdmin,
      isCompanyOwner,
      nombres: usuario.nombres,
      apellidoPaterno: usuario.apellido_paterno,
    },
  };
}
