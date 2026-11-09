import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

type Context = { params: Promise<{ id: string }> };
const input = z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(1000).optional().nullable(), price: z.number().int().nonnegative(), is_active: z.boolean().optional() }).strict();

async function ownedListing(request: Request, listingId: string) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return { response: NextResponse.json({ error: "Sign in as a vendor." }, { status: 401 }) };
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return { response: NextResponse.json({ error: "Account access could not be verified." }, { status: 503 }) };
  if (!roles?.some((role) => role.role === "vendor")) return { response: NextResponse.json({ error: "Vendor access is required." }, { status: 403 }) };
  const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (vendorError) return { response: NextResponse.json({ error: "Vendor profile could not be loaded." }, { status: 503 }) };
  if (!vendor) return { response: NextResponse.json({ error: "Vendor profile not found." }, { status: 404 }) };
  const { data: listing, error: listingError } = await supabase.from("vendor_listings").select("id,status").eq("id", listingId).eq("vendor_profile_id", vendor.id).maybeSingle();
  if (listingError) return { response: NextResponse.json({ error: "Listing could not be loaded." }, { status: 503 }) };
  if (!listing) return { response: NextResponse.json({ error: "Listing not found." }, { status: 404 }) };
  return { supabase, listing };
}

export async function GET(request: Request, { params }: Context) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  const { supabase } = await getAuthenticatedUser(request);
  const { data, error } = await supabase.from("vendor_listing_addons").select("id,listing_id,name,description,price,is_active,created_at,updated_at").eq("listing_id", id).order("created_at");
  if (error) return NextResponse.json({ error: "Listing add-ons could not be loaded." }, { status: 503 });
  return NextResponse.json({ addons: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  const access = await ownedListing(request, id); if ("response" in access) return access.response;
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (typeof body === "object" && body !== null && "id" in body) {
    const record = body as { id?: unknown; action?: unknown };
    if (typeof record.id !== "string" || !z.string().uuid().safeParse(record.id).success) return NextResponse.json({ error: "Invalid add-on." }, { status: 400 });
    if (record.action === "delete") { const { error } = await access.supabase.from("vendor_listing_addons").delete().eq("id", record.id).eq("listing_id", id); if (error) return NextResponse.json({ error: "Add-on could not be deleted." }, { status: 400 }); return NextResponse.json({ ok: true }); }
    const parsed = input.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "Enter valid add-on details." }, { status: 400 });
    const { data, error } = await access.supabase.from("vendor_listing_addons").update(parsed.data).eq("id", record.id).eq("listing_id", id).select("id,name,description,price,is_active").maybeSingle();
    if (error) return NextResponse.json({ error: "Add-on could not be updated." }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Add-on not found." }, { status: 404 });
    return NextResponse.json({ addon: data });
  }
  const parsed = input.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "Enter valid add-on details." }, { status: 400 });
  const { data, error } = await access.supabase.from("vendor_listing_addons").insert({ ...parsed.data, listing_id: id }).select("id,name,description,price,is_active").single();
  if (error) return NextResponse.json({ error: "Add-on could not be created." }, { status: 400 });
  return NextResponse.json({ addon: data }, { status: 201 });
}
