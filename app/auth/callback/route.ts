import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase, AUTH_STORAGE_KEY } from "@/lib/supabase";

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
