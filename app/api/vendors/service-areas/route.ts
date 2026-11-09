import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

async function access(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return { response: NextResponse.json({ error: "Sign in as a vendor." }, { status: 401 }) };
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return { response: NextResponse.json({ error: "Account access could not be verified." }, { status: 503 }) };
  if (!roles?.some((role) => role.role === "vendor")) return { response: NextResponse.json({ error: "Vendor access is required." }, { status: 403 }) };
  const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (vendorError) return { response: NextResponse.json({ error: "Vendor profile could not be loaded." }, { status: 503 }) };
  if (!vendor) return { response: NextResponse.json({ error: "Complete vendor onboarding first." }, { status: 404 }) };
  return { supabase, vendorId: vendor.id };
}

export async function GET(request: Request) {
  const allowed = await access(request); if ("response" in allowed) return allowed.response;
  const { data, error } = await allowed.supabase.from("vendor_service_areas").select("id,city,region,created_at").eq("vendor_profile_id", allowed.vendorId).order("city");
  if (error) return NextResponse.json({ error: "Service areas could not be loaded. Apply the vendor business migration." }, { status: 503 });
  return NextResponse.json({ serviceAreas: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const allowed = await access(request); if ("response" in allowed) return allowed.response;
  const body = z.object({ city: z.string().trim().min(2).max(120), region: z.string().trim().max(120).optional().nullable() }).strict().safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter a valid service city." }, { status: 400 });
  const { data, error } = await allowed.supabase.from("vendor_service_areas").upsert({ vendor_profile_id: allowed.vendorId, city: body.data.city, region: body.data.region || "" }, { onConflict: "vendor_profile_id,city,region" }).select("id,city,region,created_at").single();
  if (error) return NextResponse.json({ error: "Service area could not be saved." }, { status: 400 });
  return NextResponse.json({ serviceArea: data });
}

export async function DELETE(request: Request) {
  const allowed = await access(request); if ("response" in allowed) return allowed.response;
  const body = z.object({ id: z.string().uuid() }).strict().safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid service area." }, { status: 400 });
  const { error } = await allowed.supabase.from("vendor_service_areas").delete().eq("id", body.data.id).eq("vendor_profile_id", allowed.vendorId);
  if (error) return NextResponse.json({ error: "Service area could not be removed." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
