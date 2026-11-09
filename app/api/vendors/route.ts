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
  const [services, packages, portfolio, listings, areas, reviews] = await Promise.all([
    supabase.from("vendor_services").select("*").in("vendor_profile_id", ids).eq("is_active", true).order("sort_order"),
    supabase.from("vendor_packages").select("*").in("vendor_profile_id", ids).eq("is_active", true).order("sort_order"),
    supabase.from("vendor_portfolio").select("*").in("vendor_profile_id", ids).order("sort_order"),
    supabase.from("vendor_listings").select("id,vendor_profile_id,vendor_service_id,name,category,subcategory,description,pricing_model,starting_price,capacity,duration_minutes,booking_requirements,terms").in("vendor_profile_id", ids).eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("vendor_service_areas").select("vendor_profile_id,city,region").in("vendor_profile_id", ids).order("city"),
    supabase.from("vendor_reviews").select("id,vendor_profile_id,rating,review_text,vendor_response,created_at").in("vendor_profile_id", ids).order("created_at", { ascending: false }).limit(1000),
  ]);
  const listingIds = (listings.data ?? []).map((listing) => listing.id);
  const { data: addons, error: addonError } = listingIds.length ? await supabase.from("vendor_listing_addons").select("id,listing_id,name,description,price").in("listing_id", listingIds).eq("is_active", true) : { data: [], error: null };
  if (services.error || packages.error || portfolio.error || listings.error || areas.error || reviews.error || addonError) return NextResponse.json({ error: "Unable to load vendor details" }, { status: 500 });
  return NextResponse.json({ vendors: (vendors ?? []).map((vendor) => ({
    ...vendor,
    vendor_services: (services.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
    vendor_packages: (packages.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
    vendor_portfolio: (portfolio.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
    vendor_listings: (listings.data ?? []).filter((item) => item.vendor_profile_id === vendor.id).map((listing) => ({ ...listing, addons: (addons ?? []).filter((addon) => addon.listing_id === listing.id) })),
    vendor_service_areas: (areas.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
    vendor_reviews: (reviews.data ?? []).filter((item) => item.vendor_profile_id === vendor.id),
    rating: (reviews.data ?? []).filter((item) => item.vendor_profile_id === vendor.id).length ? (reviews.data ?? []).filter((item) => item.vendor_profile_id === vendor.id).reduce((sum, item) => sum + item.rating, 0) / (reviews.data ?? []).filter((item) => item.vendor_profile_id === vendor.id).length : null,
    review_count: (reviews.data ?? []).filter((item) => item.vendor_profile_id === vendor.id).length,
  })) });
}

export async function POST(request: Request) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: canReviewVendors, error: roleError } = await supabase.rpc("has_admin_permission", { p_permission: "vendor_verification" });
  if (roleError) return NextResponse.json({ error: "Account access could not be verified" }, { status: 503 });
  if (!canReviewVendors) return NextResponse.json({ error: "Vendor verification permission required" }, { status: 403 });
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
