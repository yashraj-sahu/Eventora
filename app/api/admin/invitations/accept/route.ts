import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";
import { normalizePhoneNumber } from "@/lib/phone-number";

const inputSchema = z.object({ password: z.string().min(8).max(128).optional(), phone: z.string().trim().min(1).max(40).optional() }).strict();

export async function POST(request: Request) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Verify the invitation email first." }, { status: 401 });
  const email = user.email?.trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return NextResponse.json({ error: "A verified invitation email is required." }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a password with at least 8 characters." }, { status: 400 });

  let service;
  try { service = createServiceRoleSupabaseClient(); }
  catch { return NextResponse.json({ error: "Admin invitation activation is not configured on the server." }, { status: 503 }); }

  const now = new Date().toISOString();
  const { data: invitations, error: invitationError } = await service.from("admin_invitations")
    .select("id,email,invited_by,target_user_id,expires_at,accepted_at,revoked_at,expired_at,requires_password_setup")
    .eq("email", email).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).gt("expires_at", now).limit(2);
  if (invitationError) return NextResponse.json({ error: "Invitation status could not be verified. Apply the current authentication migration first." }, { status: 503 });
  if (!invitations?.length || invitations.length !== 1) return NextResponse.json({ error: "There is no single active invitation for this verified email." }, { status: 404 });
  const invitation = invitations[0];
  if (invitation.target_user_id && invitation.target_user_id !== user.id) return NextResponse.json({ error: "This invitation belongs to another account." }, { status: 403 });
  const { data: issuer, error: issuerError } = await service.from("user_roles").select("user_id").eq("user_id", invitation.invited_by).eq("role", "platform_owner").eq("is_active", true).maybeSingle();
  if (issuerError) return NextResponse.json({ error: "Invitation authority could not be verified." }, { status: 503 });
  if (!issuer) return NextResponse.json({ error: "The invitation is no longer authorized." }, { status: 403 });

  if (invitation.requires_password_setup) {
    const { data: profile, error: profileError } = await service.from("profiles").select("id,phone").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Account profile could not be checked." }, { status: 503 });
    const existingPhone = profile?.phone?.trim() ?? "";
    if (!parsed.data.password) return NextResponse.json({ requiresPasswordSetup: true, requiresPhone: !existingPhone });
    const phone = existingPhone ? null : normalizePhoneNumber(parsed.data.phone ?? "");
    if (!existingPhone && !phone) return NextResponse.json({ error: "A valid international phone number is required to activate this account." }, { status: 400 });
    if (!profile) {
      const { error: profileInsertError } = await service.from("profiles").insert({ id: user.id, full_name: String(user.user_metadata?.full_name ?? "").slice(0, 120), email, phone });
      if (profileInsertError) return NextResponse.json({ error: "The account phone number could not be saved." }, { status: 503 });
    } else if (!existingPhone && phone) {
      const update = service.from("profiles").update({ phone }).eq("id", user.id);
      const conditionalUpdate = profile.phone === null ? update.is("phone", null) : update.eq("phone", profile.phone);
      const { data: savedProfile, error: profileUpdateError } = await conditionalUpdate.select("id,phone").maybeSingle();
      if (profileUpdateError) return NextResponse.json({ error: "The account phone number could not be saved." }, { status: 503 });
      if (!savedProfile) {
        const { data: latestProfile, error: latestError } = await service.from("profiles").select("phone").eq("id", user.id).maybeSingle();
        if (latestError || !latestProfile?.phone?.trim()) return NextResponse.json({ error: "The account phone number could not be saved." }, { status: 503 });
      }
    }
    const { data: currentUser, error: currentUserError } = await service.auth.admin.getUserById(user.id);
    if (currentUserError || !currentUser.user) return NextResponse.json({ error: "The invited account could not be verified." }, { status: 503 });
    const { error: passwordError } = await service.auth.admin.updateUserById(user.id, {
      password: parsed.data.password,
      app_metadata: { ...currentUser.user.app_metadata, evntora_admin_activation_invitation: invitation.id },
    });
    if (passwordError) return NextResponse.json({ error: "The account password could not be established." }, { status: 400 });
    const { error: targetError } = await service.from("admin_invitations").update({ target_user_id: user.id })
      .eq("id", invitation.id).is("accepted_at", null).is("revoked_at", null).is("expired_at", null);
    if (targetError) return NextResponse.json({ error: "Password was set, but invitation activation needs to be retried." }, { status: 503 });
  }

  const { data: accepted, error: acceptError } = await supabase.rpc("accept_admin_invitation", { p_invitation_id: invitation.id });
  if (acceptError || !accepted) return NextResponse.json({ error: "The invitation could not be accepted. It may have expired, been revoked, or require the authentication migration." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
