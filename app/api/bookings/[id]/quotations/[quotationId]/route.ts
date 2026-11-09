import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookingAccess } from "@/lib/booking-access";

const responseSchema = z.object({ action: z.enum(["accept", "decline", "request_revision"]), reason: z.string().trim().max(1000).optional() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string; quotationId: string }> }) {
  const { id, quotationId } = await params;
  const access = await getBookingAccess(request, id);
  if ("response" in access) return access.response;
  if (access.role !== "customer") return NextResponse.json({ error: "Only the customer for this booking can respond to its quotation." }, { status: 403 });
  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid quotation action." }, { status: 400 });
  const { data, error } = await access.db.rpc("respond_to_booking_quotation", {
    p_booking_id: id, p_quotation_id: quotationId, p_customer_id: access.user.id,
    p_action: parsed.data.action, p_reason: parsed.data.reason ?? null,
  });
  if (error) {
    console.info("[booking-quotation] customer response rejected", { code: error.code, action: parsed.data.action });
    return NextResponse.json({ error: error.code === "42501" ? "You do not have access to this quotation." : "This quotation is expired or no longer available. Refresh the booking and try again." }, { status: error.code === "42501" ? 403 : 409 });
  }
  return NextResponse.json({ success: true, result: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; quotationId: string }> }) {
  const { id, quotationId } = await params;
  const access = await getBookingAccess(request, id);
  if ("response" in access) return access.response;
  if (access.role !== "vendor") return NextResponse.json({ error: "Only the vendor for this booking can withdraw its quotation." }, { status: 403 });
  const { data, error } = await access.db.rpc("withdraw_booking_quotation", { p_booking_id: id, p_quotation_id: quotationId, p_vendor_id: access.user.id });
  if (error) return NextResponse.json({ error: "This quotation can no longer be withdrawn." }, { status: 409 });
  return NextResponse.json({ success: true, result: data });
}
