import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyWebhookSignature } from "@/lib/razorpay-server";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn("RAZORPAY_WEBHOOK_SECRET is not configured. Webhook cannot be verified.");
      return NextResponse.json(
        { error: "Webhook secret not configured on server" },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    const isValid = verifyWebhookSignature({
      rawBody,
      signature,
      secret: webhookSecret,
    });

    if (!isValid) {
      console.error("Invalid Razorpay webhook signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const eventId = event.event_id || event.payload?.payment?.entity?.id || `evt_${Date.now()}`;

    const supabase = createAdminSupabaseClient();

    // Idempotency: Check if this event was already processed
    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ received: true, message: "Event already processed" });
    }

    // Log the event to payment_events for auditability
    await supabase.from("payment_events").insert({
      event_id: eventId,
      event_type: eventType,
      payload: event,
      status: "processed",
    });

    // Handle specific event types
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("*")
          .eq("razorpay_order_id", orderId)
          .maybeSingle();

        if (paymentRecord && paymentRecord.status !== "captured") {
          await supabase
            .from("payments")
            .update({
              razorpay_payment_id: paymentId || paymentRecord.razorpay_payment_id,
              status: "captured",
              payment_method: paymentEntity?.method || paymentRecord.payment_method,
              verified_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);

          // Update booking
          const { data: booking } = await supabase
            .from("bookings")
            .select("total_amount, paid_amount")
            .eq("id", paymentRecord.booking_id)
            .single();

          if (booking) {
            const newPaid = (booking.paid_amount || 0) + paymentRecord.amount;
            await supabase
              .from("bookings")
              .update({
                paid_amount: newPaid,
                status: "confirmed",
              })
              .eq("id", paymentRecord.booking_id);
          }
        }
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            error_code: paymentEntity?.error_code || "PAYMENT_FAILED",
            error_description: paymentEntity?.error_description || "Transaction failed",
          })
          .eq("razorpay_order_id", orderId);
      }
    } else if (eventType === "refund.processed") {
      const refundEntity = event.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;

      if (paymentId) {
        await supabase
          .from("payments")
          .update({
            status: "refunded",
          })
          .eq("razorpay_payment_id", paymentId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

