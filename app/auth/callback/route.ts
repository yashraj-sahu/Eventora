import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase, AUTH_STORAGE_KEY } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * Handles Supabase Auth callback (email verification, magic links, password recovery).
 * Supabase redirects to /auth/callback?code=... after user confirms email or clicks link.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle explicit errors from Supabase
  if (error) {
    const errorUrl = new URL("/auth/error", origin);
    errorUrl.searchParams.set("error", error);
    errorUrl.searchParams.set(
      "description",
      errorDescription ?? "Authentication link expired or invalid."
    );
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    try {
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError && data.session) {
        const registration = data.user.user_metadata?.vendor_registration;
        if (registration && typeof registration === "object" && data.user.user_metadata?.role === "vendor") {
          const record = registration as Record<string, unknown>;
          const businessName = typeof record.business_name === "string" ? record.business_name.trim() : "";
          const category = typeof record.business_category === "string" ? record.business_category.trim() : "";
          const city = typeof record.city === "string" ? record.city.trim() : "";
          if (!businessName || !category || !city || businessName.length > 160 || category.length > 80 || city.length > 120) {
            return NextResponse.redirect(new URL("/auth/error?error=invalid_vendor_registration", origin));
          }
          const authenticatedClient = createServerSupabaseClient(data.session.access_token);
          const { data: existing } = await authenticatedClient.from("vendor_profiles").select("id").eq("user_id", data.user.id).maybeSingle();
          if (!existing) {
            const { error: registrationError } = await authenticatedClient.from("vendor_profiles").insert({
              user_id: data.user.id,
              business_name: businessName,
              business_category: category,
              city,
              business_description: typeof record.business_description === "string" ? record.business_description.slice(0, 5000) : null,
              address: typeof record.address === "string" ? record.address.slice(0, 300) : null,
              contact_phone: typeof record.contact_phone === "string" ? record.contact_phone.slice(0, 40) : null,
              contact_email: typeof record.contact_email === "string" ? record.contact_email.trim().toLowerCase() : data.user.email,
              approval_status: "pending",
            });
            if (registrationError) return NextResponse.redirect(new URL("/auth/error?error=vendor_registration_failed", origin));
          }
        }
        // Safe relative redirect URL
        const safeDestination =
          next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
        const response = NextResponse.redirect(new URL(safeDestination, origin));

        // Write the session cookie directly so subsequent middleware calls succeed
        response.cookies.set({
          name: AUTH_STORAGE_KEY,
          value: JSON.stringify(data.session),
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
          sameSite: "lax",
          secure: request.nextUrl.protocol === "https:",
        });

        return response;
      }
    } catch (err) {
      console.error("Code exchange exception:", err);
    }
  }

  // Failed exchange or missing code
  return NextResponse.redirect(
    new URL("/auth/error?error=callback_failed", origin)
  );
}
