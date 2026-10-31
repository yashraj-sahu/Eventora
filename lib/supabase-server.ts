import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const AUTH_STORAGE_KEY = "sb-evntora-auth-token";

/**
 * Creates a server-side Supabase client with the user's access token if available.
 */
export function createServerSupabaseClient(accessToken?: string | null) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

/**
 * Creates an admin / service-role Supabase client for trusted webhook processing and status updates.
 * If service role key is not configured, gracefully falls back to anon key.
 */
export function createAdminSupabaseClient() {
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  return createClient<Database>(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Extracts session access token from cookies or Authorization header.
 */
export async function extractAccessTokenFromRequest(
  request?: Request
): Promise<string | null> {
  // 1. Check Authorization Bearer Header
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.substring(7).trim();
    }
  }

  // 2. Check Next.js Cookies
  try {
    const cookieStore = await cookies();
    const primaryCookie = cookieStore.get(AUTH_STORAGE_KEY)?.value;

    if (primaryCookie) {
      try {
        const parsed = JSON.parse(primaryCookie);
        if (parsed.access_token) return parsed.access_token;
      } catch {
        return primaryCookie;
      }
    }

    // Check fallback pattern sb-*-auth-token
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name.startsWith("sb-") && c.name.endsWith("-auth-token")) {
        try {
          const parsed = JSON.parse(c.value);
          if (parsed.access_token) return parsed.access_token;
        } catch {
          return c.value;
        }
      }
    }
  } catch {
    // cookies() unavailable in non-request contexts
  }

  return null;
}

/**
 * Resolves currently authenticated user on the server.
 */
export async function getAuthenticatedUser(request?: Request) {
  const token = await extractAccessTokenFromRequest(request);
  if (!token) {
    return { user: null, token: null, error: new Error("No authentication token found") };
  }

  const supabase = createServerSupabaseClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, token: null, error: error || new Error("Invalid user session") };
  }

  return { user, token, error: null };
}

