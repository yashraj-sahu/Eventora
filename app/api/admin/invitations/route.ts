import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
    access.service.from("admin_invitations").select("id,email,expires_at,accepted_at,revoked_at,created_at").order("created_at", { ascending: false }),
    access.service.from("user_roles").select("user_id,is_active,role").in("role", ["admin", "platform_owner"]),
  ]);
  if (error || roleError) return NextResponse.json({ error: "Administrator list is unavailable." }, { status: 503 });
  const ids = [...new Set((memberships ?? []).map((item) => item.user_id))];
  const { data: profiles, error: profileError } = ids.length ? await access.service.from("profiles").select("id,email").in("id", ids) : { data: [], error: null };
  if (profileError) return NextResponse.json({ error: "Administrator list is unavailable." }, { status: 503 });
  return NextResponse.json({ invitations: invites ?? [], administrators: (memberships ?? []).map((item) => ({ ...item, profiles: profiles?.find((profile) => profile.id === item.user_id) ?? null })) });
}

export async function POST(request: Request) {
  const access = await ownerOnly();
  if ("response" in access) return access.response;
  let body: { email?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const { data: invitation, error: insertError } = await access.service.from("admin_invitations").insert({ email, invited_by: access.auth!.user!.id }).select("id").single();
  if (insertError || !invitation) return NextResponse.json({ error: "The invitation could not be created." }, { status: 503 });
  const callback = new URL("/auth/callback", new URL(request.url).origin);
  callback.searchParams.set("admin_invite", invitation.id);
  callback.searchParams.set("next", "/admin");
  const { data: invited, error: inviteError } = await access.service.auth.admin.inviteUserByEmail(email, { redirectTo: callback.toString() });
  if (inviteError) {
    // Existing accounts receive a sign-in link only; account creation remains disabled.
    const mailer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: otpError } = await mailer.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: callback.toString() } });
    if (otpError) {
      await access.service.from("admin_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", invitation.id);
      return NextResponse.json({ error: "Invitation email could not be sent." }, { status: 502 });
    }
  } else if (invited.user) {
    await access.service.from("admin_invitations").update({ target_user_id: invited.user.id }).eq("id", invitation.id);
  }
  return NextResponse.json({ ok: true, invitationId: invitation.id });
}

export async function PATCH(request: Request) {
  const access = await ownerOnly();
  if ("response" in access) return access.response;
  let body: { action?: unknown; id?: unknown; userId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.action === "revoke-invitation" && typeof body.id === "string") {
    const { error } = await access.service.from("admin_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", body.id).is("accepted_at", null).is("revoked_at", null);
    return error ? NextResponse.json({ error: "Invitation could not be revoked." }, { status: 503 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "suspend-admin" && typeof body.userId === "string") {
    const { data, error } = await access.auth!.supabase.rpc("set_admin_membership", { p_user_id: body.userId, p_active: false });
    return error || !data ? NextResponse.json({ error: "Administrator access could not be changed." }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
