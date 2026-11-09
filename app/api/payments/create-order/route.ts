import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";
import { createRazorpayOrder, fetchRazorpayPayment, getRazorpayClient } from "@/lib/razorpay-server";

const inputSchema = z.object({
  bookingId: z.string().uuid(),
  purpose: z.enum(["advance", "remaining", "full", "partial"]).default("advance"),
  amountINR: z.number().finite().positive().max(1_000_000_000).optional(),
}).strict();

const reservationSchema = z.object({
  status: z.enum(["reserved", "reuse", "creating", "uncertain"]),
  intentId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  orderId: z.string().min(1).optional(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  purpose: z.enum(["advance", "remaining", "full", "partial"]),
  bookingReference: z.string().optional(),
  vendorName: z.string().optional(),
}).passthrough();

const providerOrderSchema = z.object({
  id: z.string().min(1).max(100),
  receipt: z.string().nullable().optional(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.enum(["created", "attempted", "paid"]),
  notes: z.object({ paymentIntentId: z.string(), bookingId: z.string() }).passthrough(),
}).passthrough();

function isDefinitiveProviderRejection(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { statusCode?: unknown; error?: { statusCode?: unknown } };
  const status = record.statusCode ?? record.error?.statusCode;
  if (error instanceof Error && /credentials missing|not configured/i.test(error.message)) return true;
  return typeof status === "number" && [400, 401, 403, 422].includes(status);
}

async function recordOrderOutcome(db: ReturnType<typeof createAdminSupabaseClient>, intentId: string, outcome: "failed" | "uncertain") {
  const { error } = await db.rpc("mark_payment_order_intent", { p_intent_id: intentId, p_outcome: outcome });
  if (error) console.error("[payment-order] reservation outcome could not be recorded", { code: error.code, outcome });
}

function verifyOrderIdentity(orderValue: unknown, intentId: string, bookingId: string, amount: number, currency: string) {
  const parsed = providerOrderSchema.safeParse(orderValue);
  if (!parsed.success) return null;
  const order = parsed.data;
  if (order.receipt !== `EVN-${intentId}` || order.amount !== amount || order.currency !== currency
      || order.notes.paymentIntentId !== intentId || order.notes.bookingId !== bookingId) return null;
  return order;
}

async function finalizeVerifiedOrder(
  db: ReturnType<typeof createAdminSupabaseClient>,
  intentId: string,
  bookingId: string,
  order: z.infer<typeof providerOrderSchema>,
) {
  return db.rpc("finalize_payment_order_intent", {
    p_intent_id: intentId,
    p_razorpay_order_id: order.id,
    p_receipt: order.receipt ?? "",
    p_amount: order.amount,
    p_currency: order.currency,
    p_provider_status: order.status,
    p_provider_intent_id: order.notes.paymentIntentId,
    p_provider_booking_id: bookingId,
  });
}

async function reconcileIntentOrder(
  db: ReturnType<typeof createAdminSupabaseClient>,
  intentId: string,
  bookingId: string,
  amount: number,
  currency: string,
) {
  try {
    const receipt = `EVN-${intentId}`;
    const result = await getRazorpayClient().orders.all({ receipt, count: 100 });
    // A missing or duplicate result is inconclusive. Never release the intent on that basis.
    if (result.items.length !== 1) return { status: "uncertain" as const };
    const order = verifyOrderIdentity(result.items[0], intentId, bookingId, amount, currency);
    if (!order) return { status: "uncertain" as const };
    if (order.status === "created" || order.status === "attempted") {
      const { data, error } = await finalizeVerifiedOrder(db, intentId, bookingId, order);
      if (error || !data) return { status: "uncertain" as const };
      const finalized = z.object({ paymentId: z.string().uuid(), orderId: z.string() }).safeParse(data);
      if (!finalized.success || finalized.data.orderId !== order.id) return { status: "uncertain" as const };
      return { status: "ready" as const, order, paymentId: finalized.data.paymentId };
    }

    // A paid order cannot be offered for checkout again. Only reconcile it after
    // independently confirming a captured payment against the provider API.
    const payments = await getRazorpayClient().orders.fetchPayments(order.id);
    const captured = payments.items.filter((payment) => payment.order_id === order.id
      && payment.amount === amount && payment.currency === currency
      && payment.status === "captured" && payment.captured === true);
    if (captured.length !== 1) return { status: "uncertain" as const };
    const remote = await fetchRazorpayPayment(captured[0].id);
    if (remote.order_id !== order.id || remote.amount !== amount || remote.currency !== currency
        || remote.status !== "captured" || remote.captured !== true) return { status: "uncertain" as const };
    const { data, error } = await finalizeVerifiedOrder(db, intentId, bookingId, order);
    if (error || !data) return { status: "uncertain" as const };
    const finalized = z.object({ paymentId: z.string().uuid(), orderId: z.string() }).safeParse(data);
    if (!finalized.success || finalized.data.orderId !== order.id) return { status: "uncertain" as const };
    const { error: captureError } = await db.rpc("apply_razorpay_capture", {
      p_order_id: order.id,
      p_payment_id: remote.id,
      p_amount: remote.amount,
      p_currency: remote.currency,
      p_payment_method: remote.method ?? null,
      p_verified_at: new Date().toISOString(),
    });
    if (captureError) return { status: "uncertain" as const };
    return { status: "paid" as const, order, paymentId: finalized.data.paymentId };
  } catch {
    // Provider lookup failures and malformed responses are inconclusive by design.
    return { status: "uncertain" as const };
  }
}

export async function POST(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (authError || !user) return NextResponse.json({ error: "Authentication required to initiate checkout." }, { status: 401 });

  const { data: memberships, error: rolesError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (rolesError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!memberships?.some((item) => item.role === "customer")) return NextResponse.json({ error: "Enable Customer access before checkout." }, { status: 403 });

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid booking and payment option." }, { status: 400 });
  const { bookingId, purpose, amountINR } = parsed.data;
  const partialAmountPaise = purpose === "partial" && amountINR !== undefined ? Math.round(amountINR * 100) : null;
  if (purpose === "partial" && (partialAmountPaise === null || !Number.isSafeInteger(partialAmountPaise))) {
    return NextResponse.json({ error: "Enter a valid partial payment amount." }, { status: 400 });
  }

  try {
    const db = createAdminSupabaseClient();
    const { data, error } = await db.rpc("reserve_payment_order", {
      p_booking_id: bookingId,
      p_customer_id: user.id,
      p_purpose: purpose,
      p_partial_amount: partialAmountPaise,
    });
    if (error || !data) {
      console.error("[payment-order] reservation failed", { code: error?.code ?? "no-data" });
      const conflict = error?.code === "55000";
      return NextResponse.json({ error: conflict
        ? "A payment order for this booking is already pending or needs reconciliation. Do not retry checkout; contact support if it remains unresolved."
        : "Payment eligibility could not be confirmed. Please review the booking and try again." }, { status: conflict ? 409 : 400 });
    }
    const reservation = reservationSchema.safeParse(data);
    if (!reservation.success) {
      console.error("[payment-order] invalid reservation response");
      return NextResponse.json({ error: "Payment reservation could not be verified." }, { status: 503 });
    }
    const reserved = reservation.data;
    if (reserved.status === "reuse") {
      if (!reserved.orderId || !reserved.paymentId || !reserved.bookingReference || !reserved.vendorName) {
        return NextResponse.json({ error: "The existing payment order requires reconciliation." }, { status: 503 });
      }
      return NextResponse.json({ success: true, orderId: reserved.orderId, amount: reserved.amount,
        amountINR: reserved.amount / 100, currency: reserved.currency, keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: reserved.paymentId, bookingReference: reserved.bookingReference, vendorName: reserved.vendorName,
        purpose: reserved.purpose, reused: true });
    }
    if (reserved.status === "creating" || reserved.status === "uncertain") {
      const reconciled = await reconcileIntentOrder(db, reserved.intentId, bookingId, reserved.amount, reserved.currency);
      if (reconciled.status === "ready") {
        return NextResponse.json({ success: true, orderId: reconciled.order.id, amount: reserved.amount,
          amountINR: reserved.amount / 100, currency: reserved.currency, keyId: process.env.RAZORPAY_KEY_ID,
          paymentId: reconciled.paymentId, bookingReference: reserved.bookingReference, vendorName: reserved.vendorName,
          purpose: reserved.purpose, reused: true, reconciled: true });
      }
      if (reconciled.status === "paid") {
        return NextResponse.json({ error: "The existing provider order was paid and reconciled. Refresh the booking payment status before continuing." }, { status: 409 });
      }
      if (reserved.status === "creating") await recordOrderOutcome(db, reserved.intentId, "uncertain");
      return NextResponse.json({ error: "The provider result could not be conclusively reconciled. This payment intent remains reserved; do not retry checkout." }, { status: 503 });
    }

    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder({
        amountPaise: reserved.amount,
        currency: reserved.currency,
        receipt: `EVN-${reserved.intentId}`,
        notes: { bookingId, paymentIntentId: reserved.intentId, bookingReference: reserved.bookingReference ?? "" },
      });
    } catch (providerError) {
      const outcome = isDefinitiveProviderRejection(providerError) ? "failed" : "uncertain";
      await recordOrderOutcome(db, reserved.intentId, outcome);
      console.error("[payment-order] provider order creation failed", { outcome,
        errorType: providerError instanceof Error ? providerError.name : "unknown" });
      return NextResponse.json({ error: outcome === "failed"
        ? "The payment provider rejected this order request. Please review the booking and try again."
        : "The payment provider response is uncertain. Do not retry checkout; the order must be reconciled first." }, { status: outcome === "failed" ? 502 : 503 });
    }

    const verifiedOrder = verifyOrderIdentity(razorpayOrder, reserved.intentId, bookingId, reserved.amount, reserved.currency);
    if (!verifiedOrder || verifiedOrder.status !== "created") {
      await recordOrderOutcome(db, reserved.intentId, "uncertain");
      console.error("[payment-order] provider order identity or status mismatch", { intentId: reserved.intentId });
      return NextResponse.json({ error: "The provider order does not match the reserved booking intent and requires reconciliation." }, { status: 503 });
    }

    const { data: finalized, error: finalizeError } = await finalizeVerifiedOrder(db, reserved.intentId, bookingId, verifiedOrder);
    if (finalizeError || !finalized) {
      await recordOrderOutcome(db, reserved.intentId, "uncertain");
      console.error("[payment-order] provider order requires reconciliation", { code: finalizeError?.code ?? "no-data" });
      return NextResponse.json({ error: "The provider order exists but its local record needs reconciliation. Do not retry checkout." }, { status: 503 });
    }
    const finalizedOrder = z.object({ paymentId: z.string().uuid(), orderId: z.string(), amount: z.number().int().positive(), currency: z.string().length(3), purpose: z.string() }).safeParse(finalized);
    if (!finalizedOrder.success || finalizedOrder.data.orderId !== razorpayOrder.id) {
      await recordOrderOutcome(db, reserved.intentId, "uncertain");
      return NextResponse.json({ error: "The provider order requires reconciliation before checkout can continue." }, { status: 503 });
    }
    return NextResponse.json({ success: true, orderId: razorpayOrder.id, amount: reserved.amount,
      amountINR: reserved.amount / 100, currency: reserved.currency, keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: finalizedOrder.data.paymentId, bookingReference: reserved.bookingReference,
      vendorName: reserved.vendorName, purpose: reserved.purpose });
  } catch (err: unknown) {
    console.error("[payment-order] failed", { errorType: err instanceof Error ? err.name : "unknown" });
    const missingServiceKey = err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure payment storage is not configured on the server." : "Payment order could not be created. Please try again." }, { status: missingServiceKey ? 503 : 502 });
  }
}
