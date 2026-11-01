import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "@/types/database";
import { portalForPath, portalHome } from "@/lib/portal-routing";

const AUTH_STORAGE_KEY = "sb-evntora-auth-token";

function extractSession(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const cookie = cookies.find((item) => item.name === AUTH_STORAGE_KEY)
    ?? cookies.find((item) => item.name.startsWith("sb-") && item.name.endsWith("-auth-token"));
  if (!cookie) return { accessToken: null, refreshToken: null };
  try {
    const session = JSON.parse(cookie.value);
    return { accessToken: session.access_token ?? null, refreshToken: session.refresh_token ?? null };
  } catch {
    return { accessToken: cookie.value, refreshToken: null };
  }
}

function signInRedirect(request: NextRequest, pathname: string, error?: string) {
  const portal = portalForPath(pathname);
  const target = portal === "admin" ? "/admin/signin" : "/signin";
  const url = new URL(target, request.url);
  if (portal !== "admin") url.searchParams.set("portal", portal);
  url.searchParams.set("redirectTo", pathname);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function redirectToRoleHome(request: NextRequest, role: UserRole, vendorApproved: boolean, error?: string) {
  const url = new URL(portalHome(role, vendorApproved), request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // The dedicated admin login is public. Every admin workspace route remains protected.
  if (pathname === "/admin/signin") return NextResponse.next();

  const isCustomerRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/checkout" || pathname.startsWith("/checkout/");
  const isVendorRoute = pathname === "/vendor-portal" || pathname.startsWith("/vendor-portal/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isCustomerRoute && !isVendorRoute && !isAdminRoute) return NextResponse.next();

  const { accessToken, refreshToken } = extractSession(request);
  if (!accessToken && !refreshToken) return signInRedirect(request, pathname);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return signInRedirect(request, pathname, "auth_unavailable");

  let activeToken = accessToken;
  let refreshedSession: string | null = null;
  const finish = (response: NextResponse) => {
    if (refreshedSession) response.cookies.set({ name: AUTH_STORAGE_KEY, value: refreshedSession, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax", secure: request.nextUrl.protocol === "https:" });
    return response;
  };
  const makeClient = (token?: string | null) => createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });

  try {
    let userId: string | null = null;
    if (activeToken) {
      const { data, error } = await makeClient(activeToken).auth.getUser(activeToken);
      if (!error && data.user) userId = data.user.id;
    }
    if (!userId && refreshToken) {
      const { data, error } = await makeClient().auth.refreshSession({ refresh_token: refreshToken });
      if (!error && data.session && data.user) {
        userId = data.user.id;
        activeToken = data.session.access_token;
        refreshedSession = JSON.stringify(data.session);
      }
    }
    if (!userId || !activeToken) {
      const response = signInRedirect(request, pathname, "session_expired");
      response.cookies.delete(AUTH_STORAGE_KEY);
      return response;
    }

    const client = makeClient(activeToken);
    // Database profile is authoritative. Auth user_metadata is user-editable and is never a role source.
    const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profileError || !profile?.role) return finish(signInRedirect(request, pathname, "profile_unavailable"));
    const role = profile.role;
    let vendorApproved = false;
    if (role === "vendor") {
      const { data: vendorProfile } = await client.from("vendor_profiles").select("approval_status").eq("user_id", userId).maybeSingle();
      vendorApproved = vendorProfile?.approval_status === "approved";
    }

    if (isAdminRoute && role !== "admin") return finish(redirectToRoleHome(request, role, vendorApproved, "unauthorized"));
    if (isVendorRoute && role !== "vendor") return finish(redirectToRoleHome(request, role, vendorApproved, "unauthorized"));
    if (isCustomerRoute && role !== "customer") return finish(redirectToRoleHome(request, role, vendorApproved, "unauthorized"));

    if (role === "vendor" && isVendorRoute) {
      const isPendingPage = pathname === "/vendor-portal/pending";
      if (!vendorApproved && !isPendingPage) return finish(redirectToRoleHome(request, role, false));
      if (vendorApproved && isPendingPage) return finish(redirectToRoleHome(request, role, true));
    }

    const response = NextResponse.next();
    return finish(response);
  } catch (error) {
    console.error("Middleware role verification error:", error);
    return finish(signInRedirect(request, pathname, "auth_unavailable"));
  }
}

export const config = { matcher: ["/dashboard/:path*", "/checkout/:path*", "/vendor-portal/:path*", "/admin/:path*"] };
