import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";
import { processRazorpayRefund } from "@/lib/razorpay-server";

const refundInput = z.object({
  paymentId: z.string().uuid(),
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().min(1).max(1000),
  idempotencyKey: z.string().uuid(),
}).strict();

type RefundReservation = { refundId: string; amount: number; providerRefundId: string | null; providerPaymentId: string | null; status: "reserved" | "pending" | "processed" | "failed" };
function parseReservation(value: unknown): RefundReservation | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (typeof result.refundId !== "string" || typeof result.amount !== "number" || !["reserved", "pending", "processed", "failed"].includes(String(result.status))) return null;
  return { refundId: result.refundId, amount: result.amount, providerRefundId: typeof result.providerRefundId === "string" ? result.providerRefundId : null, providerPaymentId: typeof result.providerPaymentId === "string" ? result.providerPaymentId : null, status: result.status as RefundReservation["status"] };
}

export async function POST(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((item) => item.role === "admin" || item.role === "platform_owner")) return NextResponse.json({ error: "Administrator access is required to issue refunds." }, { status: 403 });

  const parsed = refundInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid payment, refund amount and request key." }, { status: 400 });

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error: reservationError } = await supabase.rpc("reserve_payment_refund", {
      p_payment_id: parsed.data.paymentId,
      p_requested_amount: parsed.data.amountPaise ?? null,
      p_reason: parsed.data.reason,
      p_created_by: user.id,
      p_idempotency_key: parsed.data.idempotencyKey,
    });
    if (reservationError) {
      console.info("[payment-refund] reservation rejected", { code: reservationError.code });
      return NextResponse.json({ error: "Refund amount exceeds the remaining refundable balance or the payment is not refundable." }, { status: 409 });
    }
    const reservation = parseReservation(data);
    if (!reservation) return NextResponse.json({ error: "Refund reservation could not be read." }, { status: 503 });
    if (reservation.status === "processed") return NextResponse.json({ success: true, refundId: reservation.providerRefundId, amount: reservation.amount, status: "processed", idempotent: true });
    if (reservation.status === "pending") return NextResponse.json({ success: true, refundId: reservation.providerRefundId, amount: reservation.amount, status: "pending", message: "This refund request is already reserved and will not be submitted twice." }, { status: 202 });
    if (reservation.status === "failed") return NextResponse.json({ error: "This request key was already used for a failed refund. Reconcile it before starting a new request." }, { status: 409 });
    if (!reservation.providerPaymentId) return NextResponse.json({ error: "The captured Razorpay payment is missing from the refund record." }, { status: 409 });

    let providerRefund: Awaited<ReturnType<typeof processRazorpayRefund>>;
    try {
      providerRefund = await processRazorpayRefund({
        paymentId: reservation.providerPaymentId,
        amountPaise: reservation.amount,
        notes: { reason: parsed.data.reason, refundedBy: user.id, evntoraRefundId: reservation.refundId },
      });
    } catch (error) {
      // The provider may have accepted a request before a network timeout. Keep
      // the reservation pending so a retry cannot issue a second refund.
      console.error("[payment-refund] provider outcome uncertain", { errorType: error instanceof Error ? error.name : "unknown" });
      return NextResponse.json({ error: "Razorpay did not confirm the outcome. The amount remains reserved while the refund is reconciled." }, { status: 503 });
    }
    if (providerRefund.amount !== reservation.amount || !["processed", "pending", "failed"].includes(providerRefund.status)) {
      console.error("[payment-refund] provider response mismatch", { refundStatus: providerRefund.status });
      return NextResponse.json({ error: "Razorpay returned an unexpected refund result. The reservation is held for reconciliation." }, { status: 503 });
    }
    const { data: completion, error: completionError } = await supabase.rpc("complete_payment_refund", {
      p_refund_id: reservation.refundId,
      p_razorpay_refund_id: providerRefund.id,
      p_provider_status: providerRefund.status,
    });
    if (completionError) {
      console.error("[payment-refund] refund state write failed", { code: completionError.code });
      return NextResponse.json({ error: "Razorpay accepted the refund, but its status could not be synchronized. The reservation prevents duplicate refunds." }, { status: 503 });
    }
    const completed = parseReservation(completion);
    if (completed?.status === "failed") {
      return NextResponse.json({ error: "Razorpay declined the refund. No refund was recorded; review the payment and try again if appropriate." }, { status: 502 });
    }
    return NextResponse.json({ success: true, refundId: providerRefund.id, amount: reservation.amount, status: completed?.status === "processed" ? "processed" : "pending" }, { status: completed?.status === "processed" ? 200 : 202 });
  } catch (error) {
    console.error("[payment-refund] reservation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    const missingServiceKey = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure refund storage is not configured on the server." : "Refund could not be reserved." }, { status: 503 });
  }

}
