import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { user, token } = await getAuthenticatedUser(request);
  if (!user || !token) return NextResponse.json({ error: "Sign in with a verified email first" }, { status: 401 });
  let id: unknown;
  try { id = (await request.json()).vendorId; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  const { data, error } = await createServerSupabaseClient(token).rpc("claim_vendor_listing", { p_vendor_id: id });
  if (error) return NextResponse.json({ error: "This listing cannot be claimed by this account" }, { status: 403 });
  return NextResponse.json({ id: data });
}
