import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";

const bookingFields = "id,booking_reference,customer_id,event_id,vendor_id,vendor_profile_id,vendor_package_id,vendor_service_id,vendor_name,vendor_category,package_name,service_details,event_date,event_city,guest_count,requirements,total_amount,advance_amount,paid_amount,currency,status,cancellation_terms,allow_partial_payments,requested_advance_percentage,rejection_reason,cancellation_reason,accepted_at,confirmed_at,started_at,completed_at,completion_acknowledged_at,cancellation_requested_at,cancelled_at,created_at,updated_at";
const paymentFields = "id,booking_id,razorpay_order_id,razorpay_payment_id,amount,currency,status,purpose,payment_method,verified_at,created_at";

async function activeRoles(sessionClient: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"], userId: string) {
  return sessionClient.from("user_roles").select("role").eq("user_id", userId).eq("is_active", true);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: roles, error: rolesError } = await activeRoles(sessionClient, user.id);
  if (rolesError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  const { data: hasBookingSupport, error: adminPermissionError } = await sessionClient.rpc("has_admin_permission", { p_permission: "booking_support" });
  if (adminPermissionError) return NextResponse.json({ error: "Booking support permission could not be checked." }, { status: 503 });

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const { data: booking, error } = await supabase.from("bookings").select(bookingFields).eq("id", id).maybeSingle();
    if (error || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const isAdmin = Boolean(hasBookingSupport);
    const isCustomer = Boolean(roles?.some((item) => item.role === "customer")) && booking.customer_id === user.id;
    let isVendor = false;
    if (booking.vendor_profile_id && roles?.some((item) => item.role === "vendor")) {
      const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles").select("id")
        .eq("id", booking.vendor_profile_id).eq("user_id", user.id).maybeSingle();
      if (vendorError) return NextResponse.json({ error: "Booking access could not be verified." }, { status: 503 });
      isVendor = Boolean(vendor);
    }
    if (!isAdmin && !isCustomer && !isVendor) return NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 });

    const [{ data: customerProfile }, { data: payments, error: paymentsError }, { data: quotes, error: quoteError }, { data: history, error: historyError }] = await Promise.all([
      supabase.from("profiles").select("full_name,email,phone").eq("id", booking.customer_id).maybeSingle(),
      supabase.from("payments").select(paymentFields).eq("booking_id", booking.id).order("created_at", { ascending: false }),
      supabase.from("booking_quotations").select("id,quotation_reference,booking_id,customer_id,vendor_profile_id,event_id,version,status,subtotal,discount_amount,additional_charges,total_amount,advance_percentage,advance_amount,allow_partial_payments,payment_terms,remaining_balance,valid_until,description,conditions,created_at,updated_at,sent_at,responded_at,accepted_at").eq("booking_id", booking.id).order("version", { ascending: false }),
      supabase.from("booking_status_history").select("id,actor_role,from_status,to_status,reason,created_at").eq("booking_id", booking.id).order("created_at", { ascending: true }),
    ]);
    if (paymentsError || quoteError || historyError) return NextResponse.json({ error: "Booking history is temporarily unavailable." }, { status: 503 });
    const quoteIds = (quotes ?? []).map((quote) => quote.id);
    const { data: quoteItems, error: itemError } = quoteIds.length
      ? await supabase.from("booking_quotation_items").select("id,quotation_id,description,details,quantity,unit_price,line_total,sort_order").in("quotation_id", quoteIds).order("sort_order")
      : { data: [], error: null };
    if (itemError) return NextResponse.json({ error: "Quotation details are temporarily unavailable." }, { status: 503 });
    const paymentIds = (payments ?? []).map((payment) => payment.id);
    const { data: refunds, error: refundError } = paymentIds.length
      ? await supabase.from("refunds").select("id,payment_id,booking_id,razorpay_refund_id,amount,reason,status,created_at,updated_at").in("payment_id", paymentIds).order("created_at", { ascending: false })
      : { data: [], error: null };
    if (refundError) return NextResponse.json({ error: "Refund history is temporarily unavailable." }, { status: 503 });
    return NextResponse.json({ booking, customer: customerProfile, payments: payments ?? [], quotations: (quotes ?? []).map((quote) => ({ ...quote, items: (quoteItems ?? []).filter((item) => item.quotation_id === quote.id) })), refunds: refunds ?? [], history: history ?? [], viewer: isAdmin ? "admin" : isVendor ? "vendor" : "customer" });
  } catch (error) {
    console.error("[booking-detail] read failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ? "Secure booking access is not configured on the server." : "Booking details are temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["accept", "reject", "withdraw", "request_cancellation", "approve_cancellation", "start", "complete", "acknowledge_completion"]).optional(), status: z.enum(["awaiting_payment", "confirmed", "cancelled", "completed"]).optional(), reason: z.string().trim().max(1000).nullable().optional(), expectedUpdatedAt: z.string().datetime({ offset: true }).nullable().optional() }).strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.action && !parsed.data.status)) return NextResponse.json({ error: "Invalid booking action." }, { status: 400 });

  const { data: roles, error: rolesError } = await activeRoles(sessionClient, user.id);
  if (rolesError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  const { data: hasBookingSupport, error: adminPermissionError } = await sessionClient.rpc("has_admin_permission", { p_permission: "booking_support" });
  if (adminPermissionError) return NextResponse.json({ error: "Booking support permission could not be checked." }, { status: 503 });
  const isAdmin = Boolean(hasBookingSupport);
  const hasCustomerRole = Boolean(roles?.some((item) => item.role === "customer"));
  const hasVendorRole = Boolean(roles?.some((item) => item.role === "vendor"));

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const { data: booking, error: fetchError } = await supabase.from("bookings").select(bookingFields).eq("id", id).maybeSingle();
    if (fetchError || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const isCustomer = hasCustomerRole && booking.customer_id === user.id;
    let isVendor = false;
    if (hasVendorRole && booking.vendor_profile_id) {
      const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles").select("id")
        .eq("id", booking.vendor_profile_id).eq("user_id", user.id).maybeSingle();
      if (vendorError) return NextResponse.json({ error: "Booking access could not be verified." }, { status: 503 });
      isVendor = Boolean(vendor);
    }
    if (!isAdmin && !isCustomer && !isVendor) return NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 });

    const actorRole = isAdmin ? "admin" : isVendor ? "vendor" : isCustomer ? "customer" : null;
    if (!actorRole) return NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 });
    const legacyAction = parsed.data.status === "awaiting_payment" ? "accept" : parsed.data.status === "completed" ? "complete" : parsed.data.status === "cancelled" ? (actorRole === "customer" ? "request_cancellation" : "reject") : null;
    const action = parsed.data.action ?? legacyAction;
    if (!action) return NextResponse.json({ error: "Invalid booking action." }, { status: 400 });
    const { data: result, error: transitionError } = await supabase.rpc("transition_booking", {
      p_booking_id: id,
      p_actor_id: user.id,
      p_actor_role: actorRole,
      p_action: action,
      p_reason: parsed.data.reason ?? null,
      p_expected_updated_at: parsed.data.expectedUpdatedAt ?? null,
    });
    if (transitionError) {
      console.info("[booking-status] transition rejected", { code: transitionError.code, action });
      return NextResponse.json({ error: transitionError.code === "23P01" ? "The requested event date is unavailable or already booked." : transitionError.code === "42501" ? "You do not have access to this booking." : "That booking action is no longer available. Refresh the booking and try again." }, { status: transitionError.code === "42501" ? 403 : transitionError.code === "P0002" ? 404 : 409 });
    }
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[booking-status] trusted database access failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ? "Secure booking access is not configured on the server." : "Booking status could not be updated." }, { status: 503 });
  }
}
