import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookingAccess } from "@/lib/booking-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBookingAccess(request, id, { participantsOnly: true });
  if ("response" in access) return access.response;
  const readField = access.role === "vendor" ? "vendor_read_at" : access.role === "customer" ? "customer_read_at" : null;
  if (readField) {
    const update = readField === "vendor_read_at"
      ? access.db.from("booking_messages").update({ vendor_read_at: new Date().toISOString() }).eq("booking_id", id).neq("sender_id", access.user.id).is("vendor_read_at", null)
      : access.db.from("booking_messages").update({ customer_read_at: new Date().toISOString() }).eq("booking_id", id).neq("sender_id", access.user.id).is("customer_read_at", null);
    const { error: readError } = await update;
    if (readError) return NextResponse.json({ error: "Conversation read state could not be updated." }, { status: 503 });
  }
  const { data, error } = await access.db.from("booking_messages").select("id,booking_id,sender_id,body,created_at,customer_read_at,vendor_read_at").eq("booking_id", id).order("created_at", { ascending: true }).limit(500);
  if (error) return NextResponse.json({ error: "Conversation could not be loaded." }, { status: 503 });
  return NextResponse.json({ messages: data ?? [], viewer: access.role });
}

const messageSchema = z.object({ body: z.string().trim().min(1).max(4000), idempotencyKey: z.string().uuid() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBookingAccess(request, id, { participantsOnly: true });
  if ("response" in access) return access.response;
  if (access.role === "admin") return NextResponse.json({ error: "Only the customer and vendor participants can message in this conversation." }, { status: 403 });
  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a message before sending." }, { status: 400 });
  const key = parsed.data.idempotencyKey;
  const { data: existing, error: lookupError } = await access.db.from("booking_messages").select("id,booking_id,sender_id,body,created_at,customer_read_at,vendor_read_at")
    .eq("booking_id", id).eq("sender_id", access.user.id).eq("client_message_key", key).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Message status could not be checked." }, { status: 503 });
  if (existing) {
    if (existing.body !== parsed.data.body) return NextResponse.json({ error: "Message request key was reused with different content." }, { status: 409 });
    return NextResponse.json({ success: true, message: existing, duplicate: true });
  }
  const { data: message, error } = await access.db.from("booking_messages").insert({ booking_id: id, sender_id: access.user.id, body: parsed.data.body, client_message_key: key })
    .select("id,booking_id,sender_id,body,created_at,customer_read_at,vendor_read_at").single();
  if (error || !message) {
    if (error?.code === "23505") return NextResponse.json({ error: "This message was already submitted. Refresh the conversation." }, { status: 409 });
    console.error("[booking-message] message write failed", { code: error?.code ?? "unknown" });
    return NextResponse.json({ error: "Message could not be saved. Your message has not been sent." }, { status: 503 });
  }
  const recipientId = access.role === "customer" ? access.booking.vendor_id : access.booking.customer_id;
  const { error: notificationError } = await access.db.rpc("notify_booking_participant", {
    p_booking_id: id,
    p_recipient_id: recipientId,
    p_event_type: "booking_message",
    p_title: "New booking message",
    p_message: `New message about booking ${access.booking.booking_reference}.`,
    p_dedupe_key: `message:${message.id}`,
  });
  if (notificationError) console.warn("[booking-message] notification skipped", { code: notificationError.code });
  return NextResponse.json({ success: true, message }, { status: 201 });
}
