import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { user, token } = await getAuthenticatedUser(request);
  if (!user || !token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await createServerSupabaseClient(token).from("vendor_saves").select("vendor_profile_id");
  if (error) return NextResponse.json({ error: "Unable to load saved vendors" }, { status: 500 });
  return NextResponse.json({ ids: (data ?? []).map((row) => row.vendor_profile_id) });
}

export async function POST(request: Request) {
  const { user, token } = await getAuthenticatedUser(request);
  if (!user || !token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.vendorId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.vendorId) || typeof body.saved !== "boolean")
    return NextResponse.json({ error: "Invalid saved vendor request" }, { status: 400 });
  const client = createServerSupabaseClient(token);
  const result = body.saved
    ? await client.from("vendor_saves").upsert({ user_id: user.id, vendor_profile_id: body.vendorId })
    : await client.from("vendor_saves").delete().eq("user_id", user.id).eq("vendor_profile_id", body.vendorId);
  if (result.error) return NextResponse.json({ error: "Unable to update saved vendors" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
