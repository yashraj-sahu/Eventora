import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u001f]/.test(value) ? value : "/dashboard";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const providerError = url.searchParams.get("error");
  if (providerError) return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(providerError)}`, origin));
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/auth/error?error=callback_failed", origin));
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/auth/error?error=callback_failed", origin));

  const registration = data.user.user_metadata?.vendor_registration;
  if (registration && typeof registration === "object") {
    // Email ownership is now verified in the registration UI. Keep onboarding
    // data for prefill, but require the user action/API to create the pending
    // vendor application after verification.
    return NextResponse.redirect(new URL("/signup/vendor?emailVerified=1", origin));
  }

  const invitationId = url.searchParams.get("admin_invite");
  if (invitationId) {
    // Email ownership is verified by the callback, but Admin activation must
    // still collect an OTP/password step when required by the invitation.
    return NextResponse.redirect(new URL(`/auth/admin-activate?invitation=${encodeURIComponent(invitationId)}`, origin));
  }
  return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), origin));
}
