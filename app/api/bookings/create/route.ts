import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";

const bookingInput = z.object({
  vendorProfileId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  packageId: z.string().uuid().nullable(),
  eventDate: z.string().date(),
  eventCity: z.string().trim().min(2).max(120),
  guestCount: z.number().int().min(1).max(10000),
  advancePercentage: z.union([z.literal(25), z.literal(50), z.literal(100)]),
  requirements: z.string().trim().max(3000).default(""),
}).strict();

export async function POST(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in to request a booking." }, { status: 401 });

  const { data: roles, error: roleError } = await sessionClient.from("user_roles")
    .select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access before requesting a booking." }, { status: 403 });

  const parsed = bookingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the event and package details, then try again." }, { status: 400 });
  const input = parsed.data;
  if (input.eventDate < new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "Choose an event date that has not passed." }, { status: 400 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    if (input.eventId) {
      const { data: event, error: eventError } = await sessionClient.from("events")
        .select("id").eq("id", input.eventId).eq("user_id", user.id).maybeSingle();
      if (eventError) return NextResponse.json({ error: "Event ownership could not be verified." }, { status: 503 });
      if (!event) return NextResponse.json({ error: "This event is not available in your workspace." }, { status: 404 });
    }
    const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles")
      .select("id,user_id,business_name,business_category,city,starting_price,approval_status,is_published")
      .eq("id", input.vendorProfileId).maybeSingle();
    if (vendorError) return NextResponse.json({ error: "Vendor listing could not be verified." }, { status: 503 });
    if (!vendor || vendor.approval_status !== "approved" || !vendor.is_published) {
      return NextResponse.json({ error: "This vendor listing is not currently available for booking." }, { status: 404 });
    }

    let packageName: string;
    let totalPaise: number;
    let serviceDetails: Record<string, unknown>;
    if (input.packageId) {
      const { data: vendorPackage, error: packageError } = await supabase.from("vendor_packages")
        .select("id,name,description,price,features")
        .eq("id", input.packageId).eq("vendor_profile_id", vendor.id).eq("is_active", true).maybeSingle();
      if (packageError) return NextResponse.json({ error: "Vendor package could not be verified." }, { status: 503 });
      if (!vendorPackage) return NextResponse.json({ error: "Choose an active package from this vendor." }, { status: 400 });
      if (!Number.isSafeInteger(vendorPackage.price) || vendorPackage.price <= 0) {
        return NextResponse.json({ error: "This package does not have a valid price." }, { status: 409 });
      }
      packageName = vendorPackage.name;
      totalPaise = vendorPackage.price;
      serviceDetails = { description: vendorPackage.description, features: vendorPackage.features };
    } else {
      // `starting_price` is stored/displayed in INR; package prices are stored in paise.
      const startingPrice = Number(vendor.starting_price);
      if (!Number.isFinite(startingPrice) || startingPrice <= 0 || !Number.isSafeInteger(Math.round(startingPrice * 100))) {
        return NextResponse.json({ error: "This vendor has no bookable package or starting price." }, { status: 400 });
      }
      packageName = "Starting price";
      totalPaise = Math.round(startingPrice * 100);
      serviceDetails = {};
    }

    const advancePaise = Math.round(totalPaise * input.advancePercentage / 100);
    const bookingReference = `EVN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: booking, error: insertError } = await supabase.from("bookings").insert({
      booking_reference: bookingReference,
      customer_id: user.id,
      vendor_id: vendor.user_id ?? vendor.id,
      vendor_profile_id: vendor.id,
      ...(input.eventId ? { event_id: input.eventId } : {}),
      vendor_name: vendor.business_name,
      vendor_category: vendor.business_category,
      package_name: packageName,
      service_details: serviceDetails,
      event_date: input.eventDate,
      event_city: input.eventCity,
      guest_count: input.guestCount,
      requirements: input.requirements || null,
      total_amount: totalPaise,
      advance_amount: advancePaise,
      paid_amount: 0,
      currency: "INR",
      status: "pending_vendor_confirmation",
    }).select("id,booking_reference,status").single();

    if (insertError || !booking) {
      console.error("[booking-create] insert failed", { code: insertError?.code ?? "unknown" });
      return NextResponse.json({ error: "The booking request could not be saved. Please try again." }, { status: 503 });
    }

    return NextResponse.json({ success: true, bookingId: booking.id, bookingReference: booking.booking_reference, status: booking.status }, { status: 201 });
  } catch (error) {
    console.error("[booking-create] trusted database access failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ? "Secure booking storage is not configured on the server." : "The booking request could not be saved. Please try again." }, { status: 503 });
  }
}
