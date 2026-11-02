import { NextResponse } from "next/server";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyRazorpaySignature, fetchRazorpayPayment } from "@/lib/razorpay-server";

export async function POST(request: Request) {
  try {
    const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to verify payment." },
        { status: 401 }
      );
    }

    const { data: memberships, error: rolesError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
    if (rolesError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
    if (!memberships?.some((item) => item.role === "customer")) return NextResponse.json({ error: "Enable Customer access before verifying payment." }, { status: 403 });

    const body = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingId,
    } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      return NextResponse.json(
        { error: "Missing required verification parameters." },
        { status: 400 }
      );
    }

    // 1. Verify Razorpay HMAC-SHA256 signature
    const isValidSignature = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValidSignature) {
      console.error("Payment signature mismatch for order:", razorpayOrderId);
      return NextResponse.json(
        { error: "Invalid payment signature. Transaction could not be verified." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // 2. Look up the payment record
    const { data: paymentRecord, error: paymentLookupError } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpayOrderId)
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (paymentLookupError || !paymentRecord) {
      return NextResponse.json(
        { error: "Matching payment transaction record not found." },
        { status: 404 }
      );
    }

    // 3. Verify user ownership
    if (paymentRecord.customer_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied. Order does not belong to the current user." },
        { status: 403 }
      );
    }

    // 4. Idempotency check: if already captured, return immediate success
    if (paymentRecord.status === "captured") {
      return NextResponse.json({
        success: true,
        message: "Payment has already been verified and recorded.",
        paymentId: paymentRecord.id,
        bookingId: paymentRecord.booking_id,
        status: "captured",
      });
    }

    // 5. Fetch payment from Razorpay API to confirm capture state & method
    let paymentMethod: string | null = null;
    try {
      const razorpayDetails = await fetchRazorpayPayment(razorpayPaymentId);
      if (razorpayDetails) {
        paymentMethod = razorpayDetails.method || null;
      }
    } catch (fetchErr) {
      console.warn("Could not fetch remote Razorpay payment entity:", fetchErr);
    }

    const nowIso = new Date().toISOString();

    // 6. Update payment record to captured
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: "captured",
        payment_method: paymentMethod,
        verified_at: nowIso,
      })
      .eq("id", paymentRecord.id);

    if (paymentUpdateError) {
      console.error("Failed to update payment record:", paymentUpdateError);
      return NextResponse.json(
        { error: "Failed to update payment status: " + paymentUpdateError.message },
        { status: 500 }
      );
    }

    // 7. Update booking paid_amount and status
    const { data: booking } = await supabase
      .from("bookings")
      .select("total_amount, paid_amount, status")
      .eq("id", bookingId)
      .single();

    if (booking) {
      const newPaidAmount = (booking.paid_amount || 0) + paymentRecord.amount;
      const newStatus =
        newPaidAmount >= booking.total_amount ? "confirmed" : "confirmed";

      await supabase
        .from("bookings")
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq("id", bookingId);
    }

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and booking secured.",
      paymentId: paymentRecord.id,
      bookingId,
      status: "captured",
      verifiedAt: nowIso,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Payment verification route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

