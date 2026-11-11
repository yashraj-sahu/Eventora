import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";

const schema = z.object({ email: z.string().trim().email().max(254) }).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the invited email address." }, { status: 400 });
  let service;
  try { service = createServiceRoleSupabaseClient(); }
  catch { return NextResponse.json({ error: "Invitation email is not configured on the server." }, { status: 503 }); }
  const email = parsed.data.email.toLowerCase();
  const { data: invitation, error } = await service.from("admin_invitations").select("id,invited_by")
    .eq("email", email).is("accepted_at", null).is("revoked_at", null).is("expired_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) return NextResponse.json({ error: "Invitation status could not be checked." }, { status: 503 });
  if (!invitation) return NextResponse.json({ ok: true });
  const { data: owner, error: ownerError } = await service.from("user_roles").select("user_id").eq("user_id", invitation.invited_by).eq("role", "platform_owner").eq("is_active", true).maybeSingle();
  if (ownerError) return NextResponse.json({ error: "Invitation authority could not be checked." }, { status: 503 });
  if (!owner) return NextResponse.json({ ok: true });
  const callback = new URL("/auth/callback", new URL(request.url).origin);
  callback.searchParams.set("next", "/auth/admin-activate");
  const { error: sendError } = await service.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: callback.toString() } });
  if (sendError) return NextResponse.json({ error: "The verification code could not be resent. Try again later." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
