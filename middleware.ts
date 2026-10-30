import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "@/types/database";

const AUTH_STORAGE_KEY = "sb-evntora-auth-token";

// Routes that require authentication
const PROTECTED_CUSTOMER_ROUTES = ["/dashboard"];
const PROTECTED_VENDOR_ROUTES = ["/vendor-portal"];
const PROTECTED_ADMIN_ROUTES = ["/admin"];

function extractSessionFromCookie(request: NextRequest): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  // 1. Try our configured storage key
  const primaryCookie = request.cookies.get(AUTH_STORAGE_KEY)?.value;
  if (primaryCookie) {
    try {
      const parsed = JSON.parse(primaryCookie);
      return {
        accessToken: parsed.access_token ?? null,
        refreshToken: parsed.refresh_token ?? null,
      };
    } catch {
      // In case cookie stores raw token string
      return { accessToken: primaryCookie, refreshToken: null };
    }
  }

  // 2. Check for any supabase default cookie naming sb-*-auth-token
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")) {
      try {
        const parsed = JSON.parse(cookie.value);
        return {
          accessToken: parsed.access_token ?? null,
          refreshToken: parsed.refresh_token ?? null,
        };
      } catch {
        return { accessToken: cookie.value, refreshToken: null };
      }
    }
  }

  return { accessToken: null, refreshToken: null };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isCustomerRoute = PROTECTED_CUSTOMER_ROUTES.some((r) =>
    pathname.startsWith(r)
  );
  const isVendorRoute = PROTECTED_VENDOR_ROUTES.some((r) =>
    pathname.startsWith(r)
  );
  const isAdminRoute = PROTECTED_ADMIN_ROUTES.some((r) =>
    pathname.startsWith(r)
  );

  // If not a protected route, let it pass through immediately
  if (!isCustomerRoute && !isVendorRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const { accessToken, refreshToken } = extractSessionFromCookie(request);

  // If no session token at all, redirect to sign in with return path
  if (!accessToken && !refreshToken) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    let activeToken = accessToken;
    let refreshedSessionCookie: string | null = null;
    let verifiedUser: { id: string; user_metadata?: Record<string, unknown> } | null = null;

    // 1. Verify access token if present
    if (activeToken) {
      const supabaseServer = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        },
      });

      const { data, error } = await supabaseServer.auth.getUser(activeToken);
      if (!error && data.user) {
        verifiedUser = data.user;
      }
    }

    // 2. If access token was missing or expired, attempt refresh
    if (!verifiedUser && refreshToken) {
      const supabaseAuthServer = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: refreshData, error: refreshError } =
        await supabaseAuthServer.auth.refreshSession({
          refresh_token: refreshToken,
        });

      if (!refreshError && refreshData.session && refreshData.user) {
        verifiedUser = refreshData.user;
        activeToken = refreshData.session.access_token;
        refreshedSessionCookie = JSON.stringify(refreshData.session);
      }
    }

    // If still not verified, session is invalid -> clear and redirect to sign in
    if (!verifiedUser || !activeToken) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("redirectTo", pathname);
      const res = NextResponse.redirect(signInUrl);
      res.cookies.delete(AUTH_STORAGE_KEY);
      return res;
    }

    // 3. Fetch user's actual database profile role with authenticated client
    const authenticatedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      },
    });

    let role: UserRole = "customer";
    try {
      const { data: profile } = await authenticatedClient
        .from("profiles")
        .select("role")
        .eq("id", verifiedUser.id)
        .maybeSingle();

      if (profile?.role) {
        role = profile.role;
      } else {
        // Fallback to metadata role if profile row not yet created
        const metaRole = verifiedUser.user_metadata?.role as UserRole;
        if (metaRole === "admin" || metaRole === "vendor" || metaRole === "customer") {
          role = metaRole;
        }
      }
    } catch {
      // In case of DB connectivity hiccup, use metadata role
      const metaRole = verifiedUser.user_metadata?.role as UserRole;
      if (metaRole === "admin" || metaRole === "vendor" || metaRole === "customer") {
        role = metaRole;
      }
    }

    // 4. Role-based route authorization & redirect loop prevention
    // Instead of sending authenticated users to /signin (which causes loops),
    // redirect them to their own authorized portal with error notification.

    if (isAdminRoute && role !== "admin") {
      const target =
        role === "vendor"
          ? new URL("/vendor-portal?error=unauthorized", request.url)
          : new URL("/dashboard?error=unauthorized", request.url);
      return NextResponse.redirect(target);
    }

    if (isVendorRoute && role !== "vendor" && role !== "admin") {
      return NextResponse.redirect(
        new URL("/dashboard?error=unauthorized", request.url)
      );
    }

    if (isCustomerRoute && role === "vendor") {
      // Vendors have their own portal
      return NextResponse.redirect(new URL("/vendor-portal", request.url));
    }

    // 5. Authorized — return response and update cookie if refreshed
    const response = NextResponse.next();
    if (refreshedSessionCookie) {
      response.cookies.set({
        name: AUTH_STORAGE_KEY,
        value: refreshedSessionCookie,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }

    return response;
  } catch (err) {
    console.error("Middleware auth verification error:", err);
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vendor-portal/:path*",
    "/admin/:path*",
  ],
};
