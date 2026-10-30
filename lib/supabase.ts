import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const AUTH_STORAGE_KEY = "sb-evntora-auth-token";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project") &&
    supabaseUrl.startsWith("https://")
);

/**
 * Cookie helper functions for browser-side cookie synchronization.
 * Ensures server-side middleware and SSR routes receive the Supabase session.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookieStr = document.cookie;
  if (!cookieStr) return null;
  const cookies = cookieStr.split(";");
  for (const c of cookies) {
    const trimmed = c.trim();
    if (trimmed.startsWith(name + "=")) {
      return decodeURIComponent(trimmed.substring(name.length + 1));
    }
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeDays = 7) {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  const isSecure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Universal storage adapter that synchronizes authentication state to BOTH
 * localStorage (fast client access) and document.cookie (server & middleware access).
 */
const universalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    // Check localStorage first
    try {
      const fromLocal = window.localStorage.getItem(key);
      if (fromLocal) return fromLocal;
    } catch {}
    // Fallback to cookie
    return getCookie(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    setCookie(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
    deleteCookie(key);
  },
};

/**
 * Browser-side Supabase client.
 * Uses the publishable anon key — safe for frontend use.
 * Session is automatically persisted in both localStorage and cookies.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    storage: universalStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Helper to inspect Supabase connection status (used by admin dev panel)
 */
export function getSupabaseStatus() {
  return {
    isConfigured: isSupabaseConfigured,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 40)}...` : "Not configured",
    mode: isSupabaseConfigured ? "Live Supabase / PostgreSQL" : "Not configured",
  };
}
