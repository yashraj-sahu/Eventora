import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in with a verified email first" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = body.vendorId;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || body.confirmRoleChange !== true) return NextResponse.json({ error: "Explicit role-change confirmation is required" }, { status: 400 });
  const { data, error } = await supabase.rpc("claim_vendor_listing", { p_vendor_id: id, p_confirm_role_change: true });
  if (error) return NextResponse.json({ error: "This listing cannot be claimed by this account" }, { status: 403 });
  return NextResponse.json({ id: data });
}
