import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { supabase } = await getAuthenticatedUser(request);
  let query = supabase.from("vendor_profiles").select("*")
    .eq("approval_status", "approved").eq("is_published", true).order("is_featured", { ascending: false });
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  if (category && category !== "All") query = query.eq("business_category", category);
  if (city && city !== "All") query = query.eq("city", city);
  const { data: vendors, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load vendors" }, { status: 500 });
  const ids = (vendors ?? []).map((v) => v.id);
  if (!ids.length) return NextResponse.json({ vendors: [] });
  const [services, packages, portfolio] = await Promise.all([
    supabase.from("vendor_services").select("*").in("vendor_profile_id", ids).eq("is_active", true).order("sort_order"),
    supabase.from("vendor_packages").select("*").in("vendor_profile_id", ids).eq("is_active", true).order("sort_order"),
    supabase.from("vendor_portfolio").select("*").in("vendor_profile_id", ids).order("sort_order"),
  ]);
  if (services.error || packages.error || portfolio.error) return NextResponse.json({ error: "Unable to load vendor details" }, { status: 500 });
  return NextResponse.json({ vendors: (vendors ?? []).map((vendor) => ({
    ...vendor,
    vendor_services: (services.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
    vendor_packages: (packages.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
    vendor_portfolio: (portfolio.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
  })) });
}

export async function POST(request: Request) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified" }, { status: 503 });
  if (!roles?.some((item) => item.role === "admin" || item.role === "platform_owner")) return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const businessName = typeof body.business_name === "string" ? body.business_name.trim() : "";
  const category = typeof body.business_category === "string" ? body.business_category.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (!businessName || businessName.length > 160 || !category || category.length > 80 || !city || city.length > 120)
    return NextResponse.json({ error: "Business name, category and city are required" }, { status: 400 });
  const { data, error } = await supabase.from("vendor_profiles").insert({
    business_name: businessName, business_category: category, city,
    business_description: typeof body.business_description === "string" ? body.business_description.slice(0, 5000) : null,
    address: typeof body.address === "string" ? body.address.trim().slice(0, 300) : null,
    contact_email: typeof body.contact_email === "string" ? body.contact_email.trim().toLowerCase() : null,
    contact_phone: typeof body.contact_phone === "string" ? body.contact_phone.trim().slice(0, 40) : null,
    approval_status: "pending", is_published: false,
  }).select("id").single();
  if (error) return NextResponse.json({ error: "Unable to create listing" }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
