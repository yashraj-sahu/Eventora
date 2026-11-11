import { NextResponse } from "next/server";
import { getAuthenticatedUser, createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { isBrevoEmailConfigured, sendAdminAccessGrantedEmail, sendAdminInvitationEmail, sendAdminInvitationNotice } from "@/lib/brevo-email";
import type { AdminRole } from "@/types/database";

async function ownerOnly() {
  const auth = await getAuthenticatedUser();
  if (!auth.user || auth.error) return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const { data, error } = await auth.supabase.rpc("is_evntora_owner");
  if (error) return { response: NextResponse.json({ error: "Owner access could not be verified." }, { status: 503 }) };
  if (!data) return { response: NextResponse.json({ error: "Platform Owner access required." }, { status: 403 }) };
  try { return { auth, service: createServiceRoleSupabaseClient() }; }
  catch { return { response: NextResponse.json({ error: "Admin invitations require server configuration." }, { status: 503 }) }; }
}

async function getPermissionDescriptions(service: ReturnType<typeof createServiceRoleSupabaseClient>, adminRole: AdminRole) {
  const { data: roleRows, error: roleError } = await service.from("admin_role_permissions").select("permission").eq("admin_role", adminRole);
  if (roleError) throw new Error("Administrator permissions could not be loaded.");
  const permissionNames = [...new Set((roleRows ?? []).map((row) => row.permission))];
  if (!permissionNames.length) return [];
  const { data, error } = await service.from("admin_permissions").select("label,description").in("permission", permissionNames).order("label");
  if (error) throw new Error("Administrator permission descriptions could not be loaded.");
  return (data ?? []).map((row) => `${row.label}: ${row.description}`);
}

export async function GET() {
  const access = await ownerOnly();
  if ("response" in access) return access.response;
  const [{ data: invites, error }, { data: memberships, error: roleError }] = await Promise.all([
    access.service.from("admin_invitations").select("id,email,admin_role,expires_at,expired_at,accepted_at,revoked_at,created_at").order("created_at", { ascending: false }),
    access.service.from("user_roles").select("user_id,is_active,role").in("role", ["admin", "platform_owner"]),
  ]);
  if (error || roleError) return NextResponse.json({ error: "Administrator list is unavailable." }, { status: 503 });
  const ids = [...new Set((memberships ?? []).map((item) => item.user_id))];
  const { data: profiles, error: profileError } = ids.length ? await access.service.from("profiles").select("id,email,full_name,phone,updated_at").in("id", ids) : { data: [], error: null };
  if (profileError) return NextResponse.json({ error: "Administrator list is unavailable." }, { status: 503 });
  const [{ data: assignments, error: assignmentError }, { data: permissionRows, error: permissionError }, { data: rolePermissions, error: rolePermissionError }] = await Promise.all([
    access.service.from("admin_role_assignments").select("user_id,admin_role,is_active,created_at,updated_at"),
    access.service.from("admin_permissions").select("permission,label,description").order("label"),
    access.service.from("admin_role_permissions").select("admin_role,permission"),
  ]);
  if (assignmentError || permissionError || rolePermissionError) return NextResponse.json({ error: "Administrator list is unavailable." }, { status: 503 });
  return NextResponse.json({ invitations: invites ?? [], administrators: (memberships ?? []).map((item) => ({ ...item, assignments: assignments?.filter((assignment) => assignment.user_id === item.user_id) ?? [], profiles: profiles?.find((profile) => profile.id === item.user_id) ?? null })), permissions: permissionRows ?? [], rolePermissions: rolePermissions ?? [], now: new Date().toISOString() });
}

export async function POST(request: Request) {
  const access = await ownerOnly();
  if ("response" in access) return access.response;
  let body: { email?: unknown; adminRole?: unknown; reason?: unknown; intent?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const adminRole = body.adminRole;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (adminRole !== "super_admin" && adminRole !== "vendor_moderator" && adminRole !== "support_admin" && adminRole !== "finance_admin") return NextResponse.json({ error: "Choose a valid administrator role." }, { status: 400 });
  const selectedAdminRole = adminRole as AdminRole;
  if (body.intent !== "existing" && body.intent !== "new") return NextResponse.json({ error: "Choose whether this is an existing account grant or a new account invitation." }, { status: 400 });
  if (reason.length < 3) return NextResponse.json({ error: "Provide a short reason for granting this administrator access." }, { status: 400 });
  let permissionDescriptions: string[];
  try { permissionDescriptions = await getPermissionDescriptions(access.service, selectedAdminRole); }
  catch { return NextResponse.json({ error: "The selected administrator role is missing its permission configuration." }, { status: 503 }); }
  if (!permissionDescriptions.length) return NextResponse.json({ error: "The selected administrator role has no configured permissions." }, { status: 409 });

  const emailPattern = email.replace(/[\\%_]/g, "\\$&");
  const { data: matchingProfiles, error: profileError } = await access.service.from("profiles").select("id,email").ilike("email", emailPattern).limit(2);
  if (profileError) return NextResponse.json({ error: "Account identity could not be checked." }, { status: 503 });
  const profileMatches = (matchingProfiles ?? []).filter((profile) => profile.email?.trim().toLowerCase() === email);
  if (profileMatches.length > 1) return NextResponse.json({ error: "Multiple account records require support before access can be granted." }, { status: 409 });

  let existingAuthUser: { id: string; email?: string; email_confirmed_at?: string | null } | null = null;
  if (profileMatches[0]) {
    const { data, error } = await access.service.auth.admin.getUserById(profileMatches[0].id);
    if (error) return NextResponse.json({ error: "Account identity could not be verified." }, { status: 503 });
    if (data.user?.email?.trim().toLowerCase() === email) existingAuthUser = data.user;
  } else {
    for (let page = 1; page <= 50; page += 1) {
      const { data: authPage, error } = await access.service.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return NextResponse.json({ error: "Account identity could not be checked." }, { status: 503 });
      const matches = (authPage.users ?? []).filter((candidate) => candidate.email?.trim().toLowerCase() === email);
      if (matches.length > 1) return NextResponse.json({ error: "Multiple account identities require support before access can be granted." }, { status: 409 });
      if (matches[0]) { existingAuthUser = matches[0]; break; }
      if ((authPage.users ?? []).length < 1000) break;
      if (page === 50) return NextResponse.json({ error: "Account identity could not be conclusively checked." }, { status: 503 });
    }
  }

  const verifiedExisting = Boolean(existingAuthUser?.email_confirmed_at);
  if (body.intent === "existing") {
    if (!existingAuthUser) return NextResponse.json({ error: "No existing EVNTORA identity was found. Use the new account invitation flow." }, { status: 404 });
    if (!verifiedExisting) return NextResponse.json({ error: "This account's email is not verified yet. Complete its existing verification flow before granting Admin access." }, { status: 409 });
    const { data: granted, error } = await access.auth!.supabase.rpc("grant_admin_access", {
      p_user_id: existingAuthUser.id, p_admin_role: adminRole, p_reason: reason,
    });
    if (error || !granted) {
      const status = error?.code === "42501" ? 403 : error?.code === "23514" || error?.code === "22023" ? 400 : 503;
      return NextResponse.json({ error: error?.code === "42501" ? "This account cannot be granted that administrator access." : "Administrator access could not be granted. Apply migration 024 and retry." }, { status });
    }
    let emailSent = false;
    try { await sendAdminAccessGrantedEmail(email, selectedAdminRole, permissionDescriptions); emailSent = true; }
    catch (cause) { console.error("[admin-access] access granted but notification email failed", { code: cause instanceof Error ? cause.name : "unknown" }); }
    return NextResponse.json({ ok: true, existingAccount: true, accessGranted: true, emailSent, adminRole: selectedAdminRole });
  }

  if (existingAuthUser && verifiedExisting) return NextResponse.json({ error: "This email belongs to an existing verified account. Use the existing account grant flow." }, { status: 409 });
  if (existingAuthUser && !verifiedExisting) return NextResponse.json({ error: "This email already has an unverified Evntora identity. Complete its existing email verification first; the invitation flow will not replace its password." }, { status: 409 });
  if (!isBrevoEmailConfigured()) return NextResponse.json({ error: "Brevo transactional email is not configured. Configure BREVO_API_KEY and BREVO_SENDER_EMAIL before inviting a new administrator." }, { status: 503 });
  const now = new Date().toISOString();
  const { error: expiredError } = await access.service.from("admin_invitations").update({ expired_at: now }).ilike("email", emailPattern).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).lte("expires_at", now);
  if (expiredError) return NextResponse.json({ error: "Expired invitation status could not be updated." }, { status: 503 });
  const { data: existing, error: existingError } = await access.service.from("admin_invitations").select("id").ilike("email", emailPattern).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).gt("expires_at", now).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Invitation status could not be verified." }, { status: 503 });
  if (existing) return NextResponse.json({ error: "A pending invitation already exists for this email address. Use Resend invitation or revoke it before creating another." }, { status: 409 });
  const newIdentity = !existingAuthUser;
  const requiresPasswordSetup = newIdentity;
  const { data: invitation, error: insertError } = await access.service.from("admin_invitations").insert({ email, admin_role: selectedAdminRole, invited_by: access.auth!.user!.id, target_user_id: existingAuthUser?.id ?? null, requires_password_setup: requiresPasswordSetup, last_resent_at: new Date().toISOString() }).select("id").single();
  if (insertError || !invitation) return NextResponse.json({ error: insertError?.code === "23505" ? "A valid invitation already exists for this email address." : "The invitation could not be created." }, { status: insertError?.code === "23505" ? 409 : 503 });
  const activationUrl = new URL("/auth/admin-activate", new URL(request.url).origin);
  activationUrl.searchParams.set("email", email);
  activationUrl.searchParams.set("type", newIdentity ? "invite" : "email");
  let sendError: Error | null = null;
  let targetUserId = existingAuthUser?.id ?? null;
  let generatedOtp = "";
  if (newIdentity) {
    const { data: generated, error } = await access.service.auth.admin.generateLink({ type: "invite", email, options: { redirectTo: activationUrl.toString() } });
    if (error || !generated?.user?.id || !generated.properties?.email_otp) sendError = new Error("Supabase Auth could not create the invitation code.");
    else { targetUserId = generated.user.id; generatedOtp = generated.properties.email_otp; }
  }
  if (!sendError && targetUserId) {
    const { error } = await access.service.from("admin_invitations").update({ target_user_id: targetUserId }).eq("id", invitation.id).is("accepted_at", null).is("revoked_at", null);
    if (error) sendError = new Error("The invitation target could not be linked.");
  }
  if (!sendError) {
    try {
      if (newIdentity) await sendAdminInvitationEmail(email, selectedAdminRole, generatedOtp, activationUrl.toString(), permissionDescriptions);
      else await sendAdminInvitationNotice(email, selectedAdminRole, activationUrl.toString(), permissionDescriptions, requiresPasswordSetup);
    } catch (cause) { sendError = cause instanceof Error ? cause : new Error("Email provider failed."); }
  }
  if (sendError) {
    const { error: revokeError } = await access.service.from("admin_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", invitation.id);
    if (revokeError) console.error("[admin-invitations] failed to revoke unsent invitation", { invitationId: invitation.id, code: revokeError.code });
    console.error("[admin-invitations] delivery failed", { invitationId: invitation.id, code: sendError.name });
    return NextResponse.json({ error: "The invitation could not be delivered. The invitation was revoked; correct email configuration and try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, invitationId: invitation.id, existingAccount: Boolean(existingAuthUser), adminRole: selectedAdminRole, emailSent: true });
}

export async function PATCH(request: Request) {
  const access = await ownerOnly();
  if ("response" in access) return access.response;
  let body: { action?: unknown; id?: unknown; userId?: unknown; adminRole?: unknown; active?: unknown; reason?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.action === "revoke-invitation" && typeof body.id === "string") {
    const { data: current, error: lookupError } = await access.service.from("admin_invitations").select("id,email,admin_role,expires_at,accepted_at,revoked_at,expired_at").eq("id", body.id).maybeSingle();
    if (lookupError || !current || current.accepted_at || current.revoked_at || current.expired_at) return NextResponse.json({ error: "Invitation cannot be revoked in its current state." }, { status: 409 });
    const now = new Date().toISOString();
    const isExpired = new Date(current.expires_at).getTime() <= Date.now();
    const { data, error } = await access.service.from("admin_invitations").update(isExpired ? { expired_at: now } : { revoked_at: now }).eq("id", body.id).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).select("id,email,admin_role").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Invitation could not be revoked." }, { status: 503 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "suspend-admin" && typeof body.userId === "string") {
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (reason.length < 3) return NextResponse.json({ error: "Provide a reason for suspending administrator access." }, { status: 400 });
    const { data, error } = await access.auth!.supabase.rpc("set_admin_membership_reasoned", { p_user_id: body.userId, p_active: false, p_reason: reason });
    return error || !data ? NextResponse.json({ error: error?.code === "PGRST202" ? "Apply migration 024 before changing administrator access." : "Administrator access could not be changed." }, { status: error?.code === "PGRST202" ? 503 : 400 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "reactivate-admin" && typeof body.userId === "string") {
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (reason.length < 3) return NextResponse.json({ error: "Provide a reason for restoring administrator access." }, { status: 400 });
    const { data, error } = await access.auth!.supabase.rpc("set_admin_membership_reasoned", { p_user_id: body.userId, p_active: true, p_reason: reason });
    return error || !data ? NextResponse.json({ error: error?.code === "PGRST202" ? "Apply migration 024 before changing administrator access." : "Administrator access could not be changed." }, { status: error?.code === "PGRST202" ? 503 : 400 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "set-admin-role" && typeof body.userId === "string" && typeof body.adminRole === "string" && typeof body.active === "boolean") {
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (reason.length < 3) return NextResponse.json({ error: "Provide a reason for changing this administrator role." }, { status: 400 });
    if (!(["super_admin", "vendor_moderator", "support_admin", "finance_admin"] as string[]).includes(body.adminRole)) return NextResponse.json({ error: "Choose a valid administrator role." }, { status: 400 });
    const { data, error } = await access.auth!.supabase.rpc("set_admin_assignment_reasoned", { p_user_id: body.userId, p_admin_role: body.adminRole as AdminRole, p_active: body.active, p_reason: reason });
    return error || !data ? NextResponse.json({ error: "Administrator role could not be changed." }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
