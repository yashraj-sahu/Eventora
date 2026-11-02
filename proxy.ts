import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/types/database";

const roleHome = (roles: UserRole[], vendorApproved: boolean) =>
  roles.includes("customer") ? "/dashboard" : roles.includes("vendor") ? (vendorApproved ? "/vendor-portal" : "/vendor-portal/pending") : roles.includes("admin") ? "/admin" : "/signin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/signin") return NextResponse.next();
  const isCustomer = pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/checkout" || pathname.startsWith("/checkout/");
  const isVendor = pathname === "/vendor-portal" || pathname.startsWith("/vendor-portal/");
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isCustomer && !isVendor && !isAdmin) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const redirect = (to: string, params?: Record<string, string>) => {
    const url = new URL(to, request.url);
    Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const result = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    return result;
  };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const portal = isAdmin ? "admin" : isVendor ? "vendor" : "customer";
    if (!user) return redirect(portal === "admin" ? "/admin/signin" : "/signin", { ...(portal === "admin" ? {} : { portal }), redirectTo: `${pathname}${request.nextUrl.search}` });
    const { data: rows, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
    if (error) return redirect(portal === "admin" ? "/admin/signin" : "/signin", { portal, error: "auth_unavailable" });
    const roles = (rows ?? []).map((row) => row.role).filter((role): role is UserRole => role === "customer" || role === "vendor" || role === "admin" || role === "platform_owner");
    const authorized = portal === "admin" ? roles.some((role) => role === "admin" || role === "platform_owner") : roles.includes(portal);
    if (!authorized) return redirect(roleHome(roles, false), { access: `${portal}-required` });
    if (isVendor) {
      const { data: vendor } = await supabase.from("vendor_profiles").select("approval_status").eq("user_id", user.id).maybeSingle();
      const approved = vendor?.approval_status === "approved";
      const pendingPage = pathname === "/vendor-portal/pending";
      if (!approved && !pendingPage) return redirect("/vendor-portal/pending");
      if (approved && pendingPage) return redirect("/vendor-portal");
    }
    return response;
  } catch {
    return redirect(isAdmin ? "/admin/signin" : "/signin", { ...(isAdmin ? {} : { portal: isVendor ? "vendor" : "customer" }), error: "auth_unavailable" });
  }
}

export const config = { matcher: ["/dashboard/:path*", "/checkout/:path*", "/vendor-portal/:path*", "/admin/:path*"] };
