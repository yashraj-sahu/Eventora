import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { fetchRazorpayPayment, verifyWebhookSignature } from "@/lib/razorpay-server";

const paymentEntitySchema = z.object({
  id: z.string().min(1), order_id: z.string().min(1), amount: z.number().int().positive(), currency: z.string().length(3),
  status: z.string().optional(), captured: z.boolean().optional(), method: z.string().optional(),
  error_code: z.string().optional(), error_description: z.string().optional(),
}).passthrough();
const eventSchema = z.object({
  event: z.string().min(1), event_id: z.string().optional(),
  payload: z.object({
    payment: z.object({ entity: paymentEntitySchema }).optional(),
    refund: z.object({ entity: z.object({ id: z.string().min(1), payment_id: z.string().min(1), amount: z.number().int().positive() }).passthrough() }).optional(),
  }).passthrough(),
}).passthrough();

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return jsonError("Webhook verification is not configured on the server.", 503);
  if (!signature) return jsonError("Missing Razorpay webhook signature.", 400);

  const rawBody = await request.text();
  if (!verifyWebhookSignature({ rawBody, signature, secret: webhookSecret })) return jsonError("Invalid webhook signature.", 400);
  let rawEvent: unknown;
  try { rawEvent = JSON.parse(rawBody); } catch { return jsonError("Invalid webhook payload.", 400); }
  const parsed = eventSchema.safeParse(rawEvent);
  if (!parsed.success) return jsonError("Invalid webhook payload.", 400);
  const event = parsed.data;
  const eventId = event.event_id || createHash("sha256").update(rawBody).digest("hex");

  try {
    const supabase = createAdminSupabaseClient();
    const { data: existing, error: lookupError } = await supabase.from("payment_events").select("id").eq("event_id", eventId).maybeSingle();
    if (lookupError) return jsonError("Webhook event status could not be checked. Razorpay may retry.", 503);
    if (existing) return NextResponse.json({ received: true, duplicate: true });

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const entity = event.payload.payment?.entity;
      if (!entity || (entity.status !== "captured" && entity.captured !== true)) return jsonError("Razorpay event does not confirm a captured payment.", 409);
      const { data: payment, error } = await supabase.from("payments")
        .select("id,booking_id,razorpay_order_id,amount,currency")
        .eq("razorpay_order_id", entity.order_id).maybeSingle();
      if (error || !payment) return jsonError("Matching payment order is not available yet. Razorpay may retry.", 503);
      if (payment.amount !== entity.amount || payment.currency !== entity.currency) return jsonError("Webhook amount or currency does not match the stored order.", 409);

      // Treat the signed webhook as a notification; confirm current provider
      // state before changing local balances.
      const remote = await fetchRazorpayPayment(entity.id);
      if (remote.order_id !== payment.razorpay_order_id || remote.amount !== payment.amount || remote.currency !== payment.currency) {
        return jsonError("Razorpay payment details do not match the stored order.", 409);
      }
      if (remote.status !== "captured" || remote.captured !== true) {
        return jsonError("Razorpay has not confirmed that this payment was captured. Razorpay may retry.", 409);
      }

      const { error: finalizeError } = await supabase.rpc("apply_razorpay_capture", {
        p_order_id: payment.razorpay_order_id,
        p_payment_id: entity.id,
        p_amount: remote.amount,
        p_currency: remote.currency,
        p_payment_method: remote.method ?? null,
        p_verified_at: new Date().toISOString(),
      });
      if (finalizeError) {
        console.error("[razorpay-webhook] capture finalization failed", { code: finalizeError.code });
        return jsonError("Captured payment could not be reconciled yet. Razorpay may retry.", 503);
      }
    } else if (event.event === "payment.failed") {
      const entity = event.payload.payment?.entity;
      if (entity) {
        const { data: payment, error: lookupPaymentError } = await supabase.from("payments").select("id,amount,currency")
          .eq("razorpay_order_id", entity.order_id).maybeSingle();
        if (lookupPaymentError || !payment) return jsonError("Matching payment order is not available yet. Razorpay may retry.", 503);
        if (payment.amount !== entity.amount || payment.currency !== entity.currency) return jsonError("Webhook amount or currency does not match the stored order.", 409);
        const { error } = await supabase.from("payments").update({ status: "failed", error_code: entity.error_code || "PAYMENT_FAILED", error_description: entity.error_description || "Transaction failed" })
          .eq("id", payment.id).eq("status", "created");
        if (error) return jsonError("Payment failure could not be recorded. Razorpay may retry.", 503);
      }
    } else if (event.event === "refund.processed") {
      const entity = event.payload.refund?.entity;
      if (entity) {
        const { error } = await supabase.rpc("apply_razorpay_refund_webhook", {
          p_razorpay_refund_id: entity.id,
          p_razorpay_payment_id: entity.payment_id,
          p_amount: entity.amount,
        });
        if (error) {
          console.error("[razorpay-webhook] refund reconciliation failed", { code: error.code });
          return jsonError("Refund could not be reconciled yet. Razorpay may retry.", 503);
        }
      }
    }

    const { error: insertError } = await supabase.from("payment_events").insert({ event_id: eventId, event_type: event.event, payload: event, status: "processed" });
    if (insertError && insertError.code !== "23505") {
      console.error("[razorpay-webhook] event log write failed", { code: insertError.code });
      return jsonError("Webhook event log could not be saved. Razorpay may retry.", 503);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[razorpay-webhook] processing failed", { errorType: error instanceof Error ? error.name : "unknown" });
    const missingServiceKey = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return jsonError(missingServiceKey ? "Secure payment storage is not configured on the server." : "Webhook processing failed. Razorpay may retry.", 503);
  }
}
