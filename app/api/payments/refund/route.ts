import { NextResponse } from "next/server";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";
import { processRazorpayRefund } from "@/lib/razorpay-server";

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Only administrators can issue refunds." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { paymentId, amountPaise, reason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required for refund processing." },
        { status: 400 }
      );
    }

    // Look up payment
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !paymentRecord) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    if (paymentRecord.status !== "captured") {
      return NextResponse.json(
        { error: `Cannot refund payment with status: ${paymentRecord.status}` },
        { status: 400 }
      );
    }

    if (!paymentRecord.razorpay_payment_id) {
      return NextResponse.json(
        { error: "Razorpay payment ID missing on record." },
        { status: 400 }
      );
    }

    const refundAmount = amountPaise ? Number(amountPaise) : paymentRecord.amount;

    // Call Razorpay refund API
    const refundResponse = await processRazorpayRefund({
      paymentId: paymentRecord.razorpay_payment_id,
      amountPaise: refundAmount,
      notes: {
        reason: reason || "Administrative Refund",
        refundedBy: user.id,
      },
    });

    // Record in refunds table
    await supabase.from("refunds").insert({
      payment_id: paymentRecord.id,
      booking_id: paymentRecord.booking_id,
      razorpay_refund_id: refundResponse.id,
      amount: refundAmount,
      reason: reason || "Administrative Refund",
      status: "processed",
      created_by: user.id,
    });

    // Update payment record status
    await supabase
      .from("payments")
      .update({
        status: "refunded",
      })
      .eq("id", paymentRecord.id);

    return NextResponse.json({
      success: true,
      refundId: refundResponse.id,
      amount: refundAmount,
      status: "processed",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Refund error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

