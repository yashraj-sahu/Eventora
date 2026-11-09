import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookingAccess } from "@/lib/booking-access";

const moneyINR = z.number().finite().min(0).max(1_000_000_000).refine((value) => Number.isSafeInteger(Math.round(value * 100)), "Invalid currency amount");
const createSchema = z.object({
  items: z.array(z.object({ description: z.string().trim().min(1).max(300), details: z.string().trim().max(1000).optional(), quantity: z.number().finite().positive().max(100000).refine((value) => Number.isSafeInteger(Math.round(value * 100))), unitPriceINR: moneyINR }).strict()).min(1).max(30),
  discountINR: moneyINR.default(0), additionalChargesINR: moneyINR.default(0),
  advancePercentage: z.number().int().min(1).max(100), allowPartialPayments: z.boolean().default(false),
  paymentTerms: z.string().trim().max(2000).default("Pay the stated advance to confirm the booking; the remaining balance is payable under these terms."),
  validUntil: z.string().date(), description: z.string().trim().max(2000).optional(), conditions: z.string().trim().max(4000).optional(),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBookingAccess(request, id);
  if ("response" in access) return access.response;
  const { data: quotations, error } = await access.db.from("booking_quotations").select("id,quotation_reference,booking_id,event_id,version,status,subtotal,discount_amount,additional_charges,total_amount,advance_percentage,advance_amount,allow_partial_payments,payment_terms,remaining_balance,valid_until,description,conditions,created_at,sent_at,responded_at,accepted_at").eq("booking_id", id).order("version", { ascending: false });
  if (error) return NextResponse.json({ error: "Quotations could not be loaded." }, { status: 503 });
  const quoteIds = (quotations ?? []).map((item) => item.id);
  const { data: items, error: itemError } = quoteIds.length ? await access.db.from("booking_quotation_items").select("id,quotation_id,description,details,quantity,unit_price,line_total,sort_order").in("quotation_id", quoteIds).order("sort_order") : { data: [], error: null };
  if (itemError) return NextResponse.json({ error: "Quotation items could not be loaded." }, { status: 503 });
  const currentDate = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ quotations: (quotations ?? []).map((quote) => ({ ...quote, status: quote.status === "sent" && quote.valid_until < currentDate ? "expired" : quote.status, items: (items ?? []).filter((item) => item.quotation_id === quote.id) })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBookingAccess(request, id);
  if ("response" in access) return access.response;
  if (access.role !== "vendor") return NextResponse.json({ error: "Only the vendor for this booking can create a quotation." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the quotation items, amounts, terms and expiry date." }, { status: 400 });
  try {
    const input = parsed.data;
    const paise = (inr: number) => Math.round(inr * 100);
    const items = input.items.map((item) => ({ description: item.description, details: item.details ?? "", quantity: item.quantity, unitPricePaise: paise(item.unitPriceINR) }));
    const { data, error } = await access.db.rpc("create_booking_quotation", {
      p_booking_id: id, p_vendor_id: access.user.id, p_items: items,
      p_discount: paise(input.discountINR), p_additional_charges: paise(input.additionalChargesINR),
      p_advance_percentage: input.advancePercentage, p_allow_partial: input.allowPartialPayments,
      p_payment_terms: input.paymentTerms, p_valid_until: input.validUntil,
      p_description: input.description ?? null, p_conditions: input.conditions ?? null,
    });
    if (error) {
      console.info("[booking-quotation] create rejected", { code: error.code });
      return NextResponse.json({ error: error.code === "42501" ? "You do not own this booking." : "This booking cannot accept that quotation. Review its current status and quotation terms." }, { status: error.code === "42501" ? 403 : 409 });
    }
    return NextResponse.json({ success: true, quotation: data }, { status: 201 });
  } catch (cause) {
    console.error("[booking-quotation] create failed", { errorType: cause instanceof Error ? cause.name : "unknown" });
    return NextResponse.json({ error: cause instanceof Error && cause.message.includes("SUPABASE_SERVICE_ROLE_KEY") ? "Secure booking storage is not configured on the server." : "Quotation could not be saved." }, { status: 503 });
  }
}
