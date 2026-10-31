import { NextResponse } from "next/server";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to initiate a booking." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      vendorId,
      vendorName,
      vendorCategory,
      packageName,
      eventDate,
      eventCity,
      guestCount,
      totalAmount, // in INR
      advancePercentage = 25, // default 25% advance
      requirements,
      serviceDetails,
      requiresVendorConfirmation = false,
    } = body;

    if (!vendorId || !vendorName || !eventDate || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required booking details (vendorId, vendorName, eventDate, totalAmount)." },
        { status: 400 }
      );
    }

    const totalPaise = Math.round(Number(totalAmount) * 100);
    const advancePaise = Math.round(totalPaise * (advancePercentage / 100));

    if (totalPaise <= 0 || advancePaise <= 0) {
      return NextResponse.json(
        { error: "Invalid booking amount." },
        { status: 400 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const bookingReference = `EVN-${dateStr}-${randomSuffix}`;

    const initialStatus = requiresVendorConfirmation
      ? "pending_vendor_confirmation"
      : "awaiting_payment";

    const supabase = createAdminSupabaseClient();

    // Check if vendor has a linked vendor_profile
    let vendorProfileId: string | null = null;
    const { data: vp } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", vendorId)
      .maybeSingle();

    if (vp) {
      vendorProfileId = vp.id;
    }

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_id: user.id,
        vendor_id: String(vendorId),
        vendor_profile_id: vendorProfileId,
        vendor_name: vendorName,
        vendor_category: vendorCategory || "Artisan Services",
        package_name: packageName || "Custom Luxury Package",
        service_details: serviceDetails || {},
        event_date: eventDate,
        event_city: eventCity || "India",
        guest_count: guestCount ? Number(guestCount) : null,
        requirements: requirements || null,
        total_amount: totalPaise,
        advance_amount: advancePaise,
        paid_amount: 0,
        currency: "INR",
        status: initialStatus,
      })
      .select("*")
      .single();

    if (insertError || !booking) {
      console.error("Failed to insert booking into Supabase:", insertError);
      return NextResponse.json(
        { error: "Failed to persist booking. " + (insertError?.message || "") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Booking creation error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

