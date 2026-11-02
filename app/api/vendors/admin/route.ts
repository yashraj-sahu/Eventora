import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";

async function adminClient(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return null;
  const { data, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  return !roleError && data?.some((item) => item.role === "admin" || item.role === "platform_owner") ? supabase : null;
}

export async function GET(request: Request) {
  const client = await adminClient(request);
  if (!client) return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const { data, error } = await client.from("vendor_profiles").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load listings" }, { status: 500 });
  return NextResponse.json({ vendors: data });
}

export async function PATCH(request: Request) {
  const client = await adminClient(request);
  if (!client) return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = body.id;
  const action = body.action;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject", "suspend", "publish", "unpublish"].includes(String(action)))
    return NextResponse.json({ error: "Invalid listing action" }, { status: 400 });
  const update = action === "approve" ? { approval_status: "approved" as const, is_published: true }
    : action === "reject" ? { approval_status: "rejected" as const, is_published: false }
    : action === "suspend" ? { approval_status: "suspended" as const, is_published: false }
    : action === "publish" ? { is_published: true }
    : { is_published: false };
  const { data, error } = await client.from("vendor_profiles").update(update).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to update listing" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Vendor listing not found or unavailable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
