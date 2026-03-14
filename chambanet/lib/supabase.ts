import { createClient } from '@supabase/supabase-js';

// Llamamos a las variables de entorno que configuraste en tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Exportamos el cliente para usarlo en cualquier parte de la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createSupabaseServerClient(accessToken?: string) {
	return createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		global: accessToken
			? {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			: undefined,
	});
}