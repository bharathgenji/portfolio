// Browser-side Supabase client (Adept app).
import { createBrowserClient } from "@supabase/ssr";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

export function createClient() {
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON!);
}
