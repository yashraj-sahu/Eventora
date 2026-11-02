import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ensureVendorApplication } from "@/lib/vendor-registration";

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
    const item = registration as Record<string, unknown>;
    try {
      const { vendorProfile } = await ensureVendorApplication(supabase, data.user, {
        businessName: typeof item.business_name === "string" ? item.business_name : "",
        category: typeof item.business_category === "string" ? item.business_category : "",
        city: typeof item.city === "string" ? item.city : "",
        description: typeof item.business_description === "string" ? item.business_description : null,
        address: typeof item.address === "string" ? item.address : null,
        phone: typeof item.contact_phone === "string" ? item.contact_phone : null,
      });
      return NextResponse.redirect(new URL(vendorProfile.approval_status === "approved" ? "/vendor-portal" : "/vendor-portal/pending", origin));
    } catch {
      return NextResponse.redirect(new URL("/auth/error?error=vendor_registration_failed", origin));
    }
  }

  const invitationId = url.searchParams.get("admin_invite");
  if (invitationId) {
    const { data: accepted, error: inviteError } = await supabase.rpc("accept_admin_invitation", { p_invitation_id: invitationId });
    if (inviteError || !accepted) return NextResponse.redirect(new URL("/auth/error?error=admin_invitation_invalid", origin));
    return NextResponse.redirect(new URL("/admin", origin));
  }
  return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), origin));
}
