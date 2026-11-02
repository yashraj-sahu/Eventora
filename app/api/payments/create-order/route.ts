import { NextResponse } from "next/server";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";
import { createRazorpayOrder } from "@/lib/razorpay-server";

export async function POST(request: Request) {
  try {
    const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to initiate checkout." },
        { status: 401 }
      );
    }

    const { data: memberships, error: rolesError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
    if (rolesError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
    if (!memberships?.some((item) => item.role === "customer")) return NextResponse.json({ error: "Enable Customer access before checkout." }, { status: 403 });

    const body = await request.json();
    const { bookingId, purpose = "advance" } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required." },
        { status: 400 }
      );
    }

    if (!["advance", "remaining", "full"].includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid payment purpose. Must be advance, remaining, or full." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // 1. Fetch booking securely from Supabase
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    // 2. Verify ownership
    if (booking.customer_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied. You can only pay for your own bookings." },
        { status: 403 }
      );
    }

    // 3. Verify status & eligibility
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot make payment for a cancelled booking." },
        { status: 400 }
      );
    }

    if (booking.status === "completed") {
      return NextResponse.json(
        { error: "This booking has already been completed and fully settled." },
        { status: 400 }
      );
    }

    if (booking.status === "pending_vendor_confirmation") {
      return NextResponse.json(
        { error: "This booking is awaiting artisan confirmation before payment can be accepted." },
        { status: 400 }
      );
    }

    // 4. Calculate actual payable amount server-side in paise
    let payablePaise = 0;
    const remainingBalancePaise = booking.total_amount - (booking.paid_amount || 0);

    if (remainingBalancePaise <= 0) {
      return NextResponse.json(
        { error: "This booking is already paid in full." },
        { status: 400 }
      );
    }

    if (purpose === "advance") {
      if (booking.paid_amount > 0) {
        return NextResponse.json(
          { error: "Advance has already been paid. Please pay remaining balance." },
          { status: 400 }
        );
      }
      payablePaise = Math.min(booking.advance_amount, remainingBalancePaise);
    } else if (purpose === "remaining") {
      payablePaise = remainingBalancePaise;
    } else if (purpose === "full") {
      payablePaise = remainingBalancePaise;
    }

    if (payablePaise <= 0) {
      return NextResponse.json(
        { error: "No outstanding balance for this booking." },
        { status: 400 }
      );
    }

    // 5. Create Razorpay order via SDK
    const receipt = `rec_${booking.booking_reference}_${Date.now().toString().slice(-6)}`;
    const razorpayOrder = await createRazorpayOrder({
      amountPaise: payablePaise,
      currency: booking.currency || "INR",
      receipt,
      notes: {
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        customerId: user.id,
        vendorName: booking.vendor_name,
        purpose,
      },
    });

    // 6. Record payment attempt in Supabase
    const { data: paymentRecord, error: paymentInsertError } = await supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        customer_id: user.id,
        razorpay_order_id: razorpayOrder.id,
        amount: payablePaise,
        currency: booking.currency || "INR",
        status: "created",
        purpose: purpose as "advance" | "remaining" | "full",
      })
      .select("*")
      .single();

    if (paymentInsertError) {
      console.error("Failed to log payment attempt in Supabase:", paymentInsertError);
      return NextResponse.json(
        { error: "Failed to initialize payment record. " + paymentInsertError.message },
        { status: 500 }
      );
    }

    // 7. Return checkout parameters to client (key_id is safe for browser checkout modal)
    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: payablePaise, // in paise
      amountINR: payablePaise / 100,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: paymentRecord.id,
      bookingReference: booking.booking_reference,
      vendorName: booking.vendor_name,
      purpose,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error creating payment order:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

