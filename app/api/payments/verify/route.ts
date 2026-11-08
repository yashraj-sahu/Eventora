import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";
import { fetchRazorpayPayment, verifyRazorpaySignature } from "@/lib/razorpay-server";

const verificationInput = z.object({
  razorpayOrderId: z.string().min(1).max(100),
  razorpayPaymentId: z.string().min(1).max(100),
  razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i),
  bookingId: z.string().uuid(),
}).strict();

export async function POST(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Authentication required to verify payment." }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role")
    .eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access before verifying payment." }, { status: 403 });

  const parsed = verificationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payment verification details are invalid." }, { status: 400 });
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = parsed.data;
  try {
    if (!verifyRazorpaySignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature })) {
      return NextResponse.json({ error: "Invalid payment signature. Transaction could not be verified." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: payment, error: paymentError } = await supabase.from("payments")
      .select("id,booking_id,customer_id,razorpay_order_id,amount,currency,status")
      .eq("razorpay_order_id", razorpayOrderId).eq("booking_id", bookingId).maybeSingle();
    if (paymentError) return NextResponse.json({ error: "Payment record could not be verified." }, { status: 503 });
    if (!payment) return NextResponse.json({ error: "Matching payment transaction record not found." }, { status: 404 });
    if (payment.customer_id !== user.id) return NextResponse.json({ error: "This payment does not belong to the current account." }, { status: 403 });

    const remote = await fetchRazorpayPayment(razorpayPaymentId);
    if (remote.order_id !== payment.razorpay_order_id || remote.amount !== payment.amount || remote.currency !== payment.currency) {
      return NextResponse.json({ error: "Razorpay payment details do not match the recorded order." }, { status: 409 });
    }
    if (remote.status !== "captured" || remote.captured !== true) {
      return NextResponse.json({ error: "Razorpay has not confirmed that this payment was captured." }, { status: 409 });
    }

    const verifiedAt = new Date().toISOString();
    const { data: result, error: finalizeError } = await supabase.rpc("apply_razorpay_capture", {
      p_order_id: payment.razorpay_order_id,
      p_payment_id: razorpayPaymentId,
      p_amount: remote.amount,
      p_currency: remote.currency,
      p_payment_method: remote.method ?? null,
      p_verified_at: verifiedAt,
    });
    if (finalizeError) {
      console.error("[payment-verify] capture finalization failed", { code: finalizeError.code });
      return NextResponse.json({ error: "Captured payment could not be reconciled yet. Please contact support before retrying checkout." }, { status: 503 });
    }

    return NextResponse.json({ success: true, message: "Payment verified and recorded.", paymentId: payment.id, bookingId: payment.booking_id, status: "captured", verifiedAt });
  } catch (error) {
    console.error("[payment-verify] failed", { errorType: error instanceof Error ? error.name : "unknown" });
    const missingServiceKey = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure payment storage is not configured on the server." : "Razorpay verification is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
