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
    const item = registration as Record<string, unknown>;
    const businessName = typeof item.business_name === "string" ? item.business_name.trim() : "";
    const category = typeof item.business_category === "string" ? item.business_category.trim() : "";
    const city = typeof item.city === "string" ? item.city.trim() : "";
    if (!businessName || businessName.length > 160 || !category || category.length > 80 || !city || city.length > 120) {
      return NextResponse.redirect(new URL("/auth/error?error=invalid_vendor_registration", origin));
    }
    const { data: existing, error: lookupError } = await supabase.from("vendor_profiles").select("id").eq("user_id", data.user.id).maybeSingle();
    if (lookupError) return NextResponse.redirect(new URL("/auth/error?error=vendor_registration_failed", origin));
    if (!existing) {
      const { error: insertError } = await supabase.from("vendor_profiles").insert({
        user_id: data.user.id, business_name: businessName, business_category: category, city,
        business_description: typeof item.business_description === "string" ? item.business_description.slice(0, 5000) : null,
        address: typeof item.address === "string" ? item.address.slice(0, 300) : null,
        contact_phone: typeof item.contact_phone === "string" ? item.contact_phone.slice(0, 40) : null,
        contact_email: typeof item.contact_email === "string" ? item.contact_email.trim().toLowerCase() : data.user.email,
        approval_status: "pending", is_published: false,
      });
      if (insertError) return NextResponse.redirect(new URL("/auth/error?error=vendor_registration_failed", origin));
    }
    return NextResponse.redirect(new URL("/vendor-portal/pending", origin));
  }

  const invitationId = url.searchParams.get("admin_invite");
  if (invitationId) {
    const { data: accepted, error: inviteError } = await supabase.rpc("accept_admin_invitation", { p_invitation_id: invitationId });
    if (inviteError || !accepted) return NextResponse.redirect(new URL("/auth/error?error=admin_invitation_invalid", origin));
    return NextResponse.redirect(new URL("/admin", origin));
  }
  const next = safeNext(url.searchParams.get("next"));
  return NextResponse.redirect(new URL(next, origin));
}
