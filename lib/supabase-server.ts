import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-backed SSR client for Server Components, route handlers and actions. */
export async function createServerSupabaseClient() {
  const store = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes them before rendering.
        }
      },
    },
  });
}

/** Use only for legacy trusted webhook operations. New privileged code must require the key. */
export function createAdminSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createServiceRoleSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this server operation");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The session is read and refreshed through the standard SSR cookie adapter. */
export async function getAuthenticatedUser(_request?: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user: error ? null : user, supabase, error: error ?? (!user ? new Error("No authenticated user") : null) };
}
