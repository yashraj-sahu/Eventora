import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

const listingInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(120),
  subcategory: z.string().trim().max(120).optional().nullable(),
  description: z.string().max(5000).default(""),
  pricingModel: z.enum(["fixed", "starting_at", "custom_quote"]),
  pricingUnit: z.enum(["per_hour", "per_day", "per_event", "per_guest", "per_item", "per_package", "custom_quote"]).default("per_event"),
  startingPrice: z.number().int().nonnegative().nullable().optional(),
  minimumQuantity: z.number().positive().max(100000).nullable().optional(),
  pricingDetails: z.record(z.string(), z.unknown()).default({}),
  inclusions: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  exclusions: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  capacity: z.number().int().min(1).max(100000).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(10080).nullable().optional(),
  bookingRequirements: z.string().max(3000).optional().nullable(),
  terms: z.string().max(5000).optional().nullable(),
  status: z.enum(["draft", "pending_approval"]).optional(),
}).strict();

async function vendorAccess(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return { response: NextResponse.json({ error: "Sign in as a vendor." }, { status: 401 }) };
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return { response: NextResponse.json({ error: "Account access could not be verified." }, { status: 503 }) };
  if (!roles?.some((role) => role.role === "vendor")) return { response: NextResponse.json({ error: "Vendor access is required." }, { status: 403 }) };
  const { data: profile, error: profileError } = await supabase.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (profileError) return { response: NextResponse.json({ error: "Vendor business could not be loaded." }, { status: 503 }) };
  if (!profile) return { response: NextResponse.json({ error: "Complete vendor onboarding before managing listings." }, { status: 404 }) };
  return { user, supabase, vendorId: profile.id };
}

export async function GET(request: Request) {
  const access = await vendorAccess(request);
  if ("response" in access) return access.response;
  const { data, error } = await access.supabase.from("vendor_listings").select("*").eq("vendor_profile_id", access.vendorId).order("updated_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Vendor listings could not be loaded. Apply the vendor business migration if it has not been deployed." }, { status: 503 });
  return NextResponse.json({ listings: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await vendorAccess(request);
  if ("response" in access) return access.response;
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (typeof body === "object" && body !== null && "action" in body) {
    const actionBody = body as { action?: unknown; id?: unknown };
    if (typeof actionBody.id !== "string" || !z.string().uuid().safeParse(actionBody.id).success) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
    if (actionBody.action === "submit") {
      const { data, error } = await access.supabase.from("vendor_listings").update({ status: "pending_approval" }).eq("id", actionBody.id).eq("vendor_profile_id", access.vendorId).select("id,status,vendor_service_id,name,description").maybeSingle();
      if (error) return NextResponse.json({ error: "Listing could not be submitted for review." }, { status: 400 });
      if (!data) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
      return NextResponse.json({ listing: data });
    }
    if (actionBody.action === "delete") {
      const { data: current } = await access.supabase.from("vendor_listings").select("vendor_service_id").eq("id", actionBody.id).eq("vendor_profile_id", access.vendorId).in("status", ["draft", "rejected"]).maybeSingle();
      const { error } = await access.supabase.from("vendor_listings").delete().eq("id", actionBody.id).eq("vendor_profile_id", access.vendorId).in("status", ["draft", "rejected"]);
      if (error) return NextResponse.json({ error: "Only drafts or rejected listings can be deleted." }, { status: 409 });
      if (current?.vendor_service_id) await access.supabase.from("vendor_services").delete().eq("id", current.vendor_service_id).eq("vendor_profile_id", access.vendorId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unsupported listing action." }, { status: 400 });
  }
  const parsed = listingInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter valid listing details." }, { status: 400 });
  const { id, pricingModel, pricingUnit, startingPrice, minimumQuantity, pricingDetails, inclusions, exclusions, capacity, durationMinutes, bookingRequirements, terms, subcategory, status, ...fields } = parsed.data;
  if (pricingModel !== "custom_quote" && startingPrice == null) return NextResponse.json({ error: "A starting price is required for fixed or starting-at listings." }, { status: 400 });
  if (pricingModel === "custom_quote" && startingPrice != null) return NextResponse.json({ error: "Custom-quotation listings must not publish a fixed price." }, { status: 400 });
  const update = { ...fields, pricing_model: pricingModel, pricing_unit: pricingModel === "custom_quote" ? "custom_quote" : pricingUnit, starting_price: startingPrice ?? null, minimum_quantity: minimumQuantity ?? null, pricing_details: pricingDetails, inclusions, exclusions, capacity: capacity ?? null, duration_minutes: durationMinutes ?? null, booking_requirements: bookingRequirements ?? null, terms: terms ?? null, subcategory: subcategory ?? null, status: status ?? "draft" };
  const result = id
    ? await access.supabase.from("vendor_listings").update(update).eq("id", id).eq("vendor_profile_id", access.vendorId).select("id,status,vendor_service_id").maybeSingle()
    : await access.supabase.from("vendor_listings").insert({ ...update, vendor_profile_id: access.vendorId }).select("id,status,vendor_service_id").single();
  if (result.error) return NextResponse.json({ error: "Listing could not be saved. A published listing may require review after editing." }, { status: 400 });
  if (!result.data) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  let serviceId = result.data.vendor_service_id;
  if (!serviceId) {
    const { data: service, error: serviceError } = await access.supabase.from("vendor_services").insert({ vendor_profile_id: access.vendorId, name: fields.name, description: fields.description || null, is_active: false }).select("id").single();
    if (serviceError) return NextResponse.json({ error: "Listing saved, but the booking service could not be created." }, { status: 503 });
    serviceId = service.id;
    const { error: linkError } = await access.supabase.from("vendor_listings").update({ vendor_service_id: serviceId }).eq("id", result.data.id).eq("vendor_profile_id", access.vendorId);
    if (linkError) return NextResponse.json({ error: "Listing saved, but its booking service link could not be stored." }, { status: 503 });
  }
  return NextResponse.json({ listing: result.data });
}
