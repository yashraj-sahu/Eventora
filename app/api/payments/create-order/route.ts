import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";
import { createRazorpayOrder } from "@/lib/razorpay-server";

const inputSchema = z.object({ bookingId: z.string().uuid(), purpose: z.enum(["advance", "remaining", "full"]).default("advance") }).strict();

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

    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Provide a valid booking and payment option." }, { status: 400 });
    const { bookingId, purpose } = parsed.data;

    const supabase = createAdminSupabaseClient();

    // 1. Fetch booking securely from Supabase
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id,booking_reference,customer_id,vendor_name,total_amount,advance_amount,paid_amount,currency,status")
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

    if (!["awaiting_payment", "confirmed"].includes(booking.status)) {
      return NextResponse.json({ error: "This booking is not ready for payment." }, { status: 409 });
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
      .select("id")
      .single();

    if (paymentInsertError) {
      console.error("[payment-order] payment attempt insert failed", { code: paymentInsertError.code });
      return NextResponse.json(
        { error: "Failed to initialize the payment record. Please try again." },
        { status: 503 }
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
    console.error("[payment-order] failed", { errorType: err instanceof Error ? err.name : "unknown" });
    const missingServiceKey = err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure payment storage is not configured on the server." : "Payment order could not be created. Please try again." }, { status: missingServiceKey ? 503 : 502 });
  }
}

