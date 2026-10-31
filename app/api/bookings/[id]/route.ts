import { NextResponse } from "next/server";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Authorization: User must be customer, vendor, or admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const isCustomer = booking.customer_id === user.id;

    let isVendor = false;
    if (booking.vendor_profile_id) {
      const { data: vp } = await supabase
        .from("vendor_profiles")
        .select("id")
        .eq("id", booking.vendor_profile_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (vp) isVendor = true;
    }

    if (!isAdmin && !isCustomer && !isVendor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch customer profile details
    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", booking.customer_id)
      .maybeSingle();

    // Fetch payments for this booking
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      booking,
      customer: customerProfile,
      payments: payments || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const allowedStatuses = [
      "awaiting_payment",
      "confirmed",
      "cancelled",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status change. Allowed: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const isCustomer = booking.customer_id === user.id;

    // Customers can only cancel their booking if not yet confirmed or completed
    if (isCustomer && !isAdmin) {
      if (status !== "cancelled") {
        return NextResponse.json(
          { error: "Customers can only cancel unfulfilled bookings." },
          { status: 403 }
        );
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

