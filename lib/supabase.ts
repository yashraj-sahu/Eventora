import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("your-project") && supabaseUrl.startsWith("https://")
);

/** One browser client; @supabase/ssr owns cookie encoding, chunking and refresh. */
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

export function getSupabaseStatus() {
  return {
    isConfigured: isSupabaseConfigured,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 40)}...` : "Not configured",
    mode: isSupabaseConfigured ? "Live Supabase / PostgreSQL" : "Not configured",
  };
}
