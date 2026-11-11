import { NextResponse } from "next/server";
import { getAuthenticatedUser, createServiceRoleSupabaseClient } from "@/lib/supabase-server";

async function ownerOnly() {
  const auth = await getAuthenticatedUser();
  if (!auth.user || auth.error) return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const { data, error } = await auth.supabase.rpc("is_evntora_owner");
  if (error) return { response: NextResponse.json({ error: "Owner access could not be verified." }, { status: 503 }) };
  if (!data) return { response: NextResponse.json({ error: "Platform Owner access required." }, { status: 403 }) };
  try { return { auth, service: createServiceRoleSupabaseClient() }; }
  catch { return { response: NextResponse.json({ error: "Admin invitations require server configuration." }, { status: 503 }) }; }
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
  const { data: profiles, error: profileError } = ids.length ? await access.service.from("profiles").select("id,email").in("id", ids) : { data: [], error: null };
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
  let body: { email?: unknown; adminRole?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const adminRole = body.adminRole;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (adminRole !== "super_admin" && adminRole !== "vendor_moderator" && adminRole !== "support_admin" && adminRole !== "finance_admin") return NextResponse.json({ error: "Choose a valid administrator role." }, { status: 400 });
  const now = new Date().toISOString();
  const emailPattern = email.replace(/[\\%_]/g, "\\$&");
  const { error: expiredError } = await access.service.from("admin_invitations").update({ expired_at: now }).ilike("email", emailPattern).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).lte("expires_at", now);
  if (expiredError) return NextResponse.json({ error: "Expired invitation status could not be updated." }, { status: 503 });
  const { data: existing, error: existingError } = await access.service.from("admin_invitations").select("id").ilike("email", emailPattern).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).gt("expires_at", now).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Invitation status could not be verified." }, { status: 503 });
  if (existing) return NextResponse.json({ error: "A pending invitation already exists for this email address." }, { status: 409 });
  const { data: matchingProfiles, error: profileError } = await access.service.from("profiles").select("id,email").ilike("email", emailPattern).limit(2);
  if (profileError) return NextResponse.json({ error: "Account identity could not be checked." }, { status: 503 });
  const existingProfile = (matchingProfiles ?? []).find((profile) => profile.email?.trim().toLowerCase() === email);
  if ((matchingProfiles ?? []).filter((profile) => profile.email?.trim().toLowerCase() === email).length > 1) return NextResponse.json({ error: "Multiple account records require support before this invitation can be issued." }, { status: 409 });
  // A legacy Auth identity may lack its profile row. Search Auth as well so an
  // existing password is never replaced or a duplicate identity invited.
  let existingAuthUserId: string | null = existingProfile?.id ?? null;
  let authSearchComplete = Boolean(existingAuthUserId);
  if (!existingAuthUserId) {
    for (let page = 1; page <= 50; page += 1) {
      const { data: authPage, error: authListError } = await access.service.auth.admin.listUsers({ page, perPage: 1000 });
      if (authListError) return NextResponse.json({ error: "Account identity could not be checked." }, { status: 503 });
      const matches = (authPage.users ?? []).filter((candidate) => candidate.email?.trim().toLowerCase() === email);
      if (matches.length > 1) return NextResponse.json({ error: "Multiple account identities require support before this invitation can be issued." }, { status: 409 });
      if (matches[0]) { existingAuthUserId = matches[0].id; authSearchComplete = true; break; }
      if ((authPage.users ?? []).length < 1000) { authSearchComplete = true; break; }
    }
  }
  if (!authSearchComplete) return NextResponse.json({ error: "Account identity could not be conclusively checked. Try again later." }, { status: 503 });
  const isExistingIdentity = Boolean(existingAuthUserId);
  const { data: invitation, error: insertError } = await access.service.from("admin_invitations").insert({ email, admin_role: adminRole, invited_by: access.auth!.user!.id, target_user_id: existingAuthUserId, requires_password_setup: !isExistingIdentity }).select("id").single();
  if (insertError || !invitation) return NextResponse.json({ error: insertError?.code === "23505" ? "A valid invitation already exists for this email address." : "The invitation could not be created." }, { status: insertError?.code === "23505" ? 409 : 503 });
  const callback = new URL("/auth/callback", new URL(request.url).origin);
  callback.searchParams.set("next", "/auth/admin-activate");
  const { error: otpError } = await access.service.auth.signInWithOtp({ email, options: { shouldCreateUser: !isExistingIdentity, emailRedirectTo: callback.toString() } });
  if (otpError) {
    const { error: revokeError } = await access.service.from("admin_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", invitation.id);
    if (revokeError) console.error("[admin-invitations] failed to revoke unsent invitation", { invitationId: invitation.id, code: revokeError.code });
    return NextResponse.json({ error: "Invitation email could not be sent." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, invitationId: invitation.id, existingAccount: isExistingIdentity });
}

export async function PATCH(request: Request) {
  const access = await ownerOnly();
  if ("response" in access) return access.response;
  let body: { action?: unknown; id?: unknown; userId?: unknown; adminRole?: unknown; active?: unknown };
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
    const { data, error } = await access.auth!.supabase.rpc("set_admin_membership", { p_user_id: body.userId, p_active: false });
    return error || !data ? NextResponse.json({ error: "Administrator access could not be changed." }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "reactivate-admin" && typeof body.userId === "string") {
    const { data, error } = await access.auth!.supabase.rpc("set_admin_membership", { p_user_id: body.userId, p_active: true });
    return error || !data ? NextResponse.json({ error: "Administrator access could not be changed." }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "set-admin-role" && typeof body.userId === "string" && typeof body.adminRole === "string" && typeof body.active === "boolean") {
    const { data, error } = await access.auth!.supabase.rpc("set_admin_assignment", { p_user_id: body.userId, p_admin_role: body.adminRole, p_active: body.active });
    return error || !data ? NextResponse.json({ error: "Administrator role could not be changed." }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
