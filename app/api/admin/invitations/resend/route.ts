import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { isBrevoEmailConfigured, sendAdminInvitationEmail, sendAdminInvitationNotice } from "@/lib/brevo-email";
import type { AdminRole } from "@/types/database";

const schema = z.object({ email: z.string().trim().email().max(254) }).strict();

async function getPermissionDescriptions(service: ReturnType<typeof createServiceRoleSupabaseClient>, adminRole: AdminRole) {
  const { data: roleRows, error: roleError } = await service.from("admin_role_permissions").select("permission").eq("admin_role", adminRole);
  if (roleError) throw new Error("Administrator permissions could not be loaded.");
  const permissionNames = [...new Set((roleRows ?? []).map((row) => row.permission))];
  if (!permissionNames.length) return [];
  const { data, error } = await service.from("admin_permissions").select("label,description").in("permission", permissionNames).order("label");
  if (error) throw new Error("Administrator permission descriptions could not be loaded.");
  return (data ?? []).map((row) => `${row.label}: ${row.description}`);
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the invited email address." }, { status: 400 });
  let service;
  try { service = createServiceRoleSupabaseClient(); }
  catch { return NextResponse.json({ error: "Invitation email is not configured on the server." }, { status: 503 }); }
  const email = parsed.data.email.toLowerCase();
  const { data: invitation, error } = await service.from("admin_invitations").select("id,invited_by,admin_role,target_user_id,requires_password_setup")
    .eq("email", email).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) return NextResponse.json({ error: "Invitation status could not be checked." }, { status: 503 });
  if (!invitation) return NextResponse.json({ ok: true });
  const { data: owner, error: ownerError } = await service.from("user_roles").select("user_id").eq("user_id", invitation.invited_by).eq("role", "platform_owner").eq("is_active", true).maybeSingle();
  if (ownerError) return NextResponse.json({ error: "Invitation authority could not be checked." }, { status: 503 });
  if (!owner) return NextResponse.json({ ok: true });
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60_000).toISOString();
  const { data: resendClaim, error: claimError } = await service.from("admin_invitations")
    .update({ last_resent_at: now.toISOString() }).eq("id", invitation.id)
    .is("accepted_at", null).is("revoked_at", null).is("expired_at", null).gt("expires_at", now.toISOString())
    .or(`last_resent_at.is.null,last_resent_at.lt.${cutoff}`).select("id").maybeSingle();
  if (claimError) return NextResponse.json({ error: "Invitation resend could not be reserved." }, { status: 503 });
  if (!resendClaim) return NextResponse.json({ error: "Please wait one minute before requesting another invitation code." }, { status: 429 });
  if (!isBrevoEmailConfigured()) return NextResponse.json({ error: "Brevo transactional email is not configured." }, { status: 503 });
  let permissionDescriptions: string[];
  try { permissionDescriptions = await getPermissionDescriptions(service, invitation.admin_role as AdminRole); }
  catch { return NextResponse.json({ error: "The selected administrator role is missing its permission configuration." }, { status: 503 }); }
  const activationUrl = new URL("/auth/admin-activate", new URL(request.url).origin);
  activationUrl.searchParams.set("email", email);
  activationUrl.searchParams.set("type", invitation.requires_password_setup && !invitation.target_user_id ? "invite" : "email");
  try {
    if (invitation.requires_password_setup && !invitation.target_user_id) {
      const { data, error: generateError } = await service.auth.admin.generateLink({ type: "invite", email, options: { redirectTo: activationUrl.toString() } });
      if (generateError || !data?.properties?.email_otp || data.user.id !== invitation.target_user_id) throw new Error("Invitation verification code could not be created.");
      await sendAdminInvitationEmail(email, invitation.admin_role, data.properties.email_otp, activationUrl.toString(), permissionDescriptions);
    } else {
      const callback = new URL("/auth/callback", new URL(request.url).origin);
      callback.searchParams.set("next", `/auth/admin-activate?email=${encodeURIComponent(email)}&type=email`);
      const { error: otpError } = await service.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: callback.toString() } });
      if (otpError) throw otpError;
      await sendAdminInvitationNotice(email, invitation.admin_role, activationUrl.toString(), permissionDescriptions, invitation.requires_password_setup);
    }
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error("[admin-invitations] resend failed", { invitationId: invitation.id, code: cause instanceof Error ? cause.name : "unknown" });
    return NextResponse.json({ error: "The verification email could not be resent. Check email configuration and try again." }, { status: 502 });
  }
}
