import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";

const bookingFields = "id,booking_reference,customer_id,vendor_id,vendor_profile_id,vendor_name,vendor_category,package_name,service_details,event_date,event_city,guest_count,requirements,total_amount,advance_amount,paid_amount,currency,status,cancellation_terms,created_at,updated_at";
const paymentFields = "id,booking_id,razorpay_order_id,razorpay_payment_id,amount,currency,status,purpose,payment_method,verified_at,created_at";

async function activeRoles(sessionClient: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"], userId: string) {
  return sessionClient.from("user_roles").select("role").eq("user_id", userId).eq("is_active", true);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: roles, error: rolesError } = await activeRoles(sessionClient, user.id);
  if (rolesError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const { data: booking, error } = await supabase.from("bookings").select(bookingFields).eq("id", id).maybeSingle();
    if (error || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const isAdmin = Boolean(roles?.some((item) => item.role === "admin" || item.role === "platform_owner"));
    const isCustomer = Boolean(roles?.some((item) => item.role === "customer")) && booking.customer_id === user.id;
    let isVendor = false;
    if (booking.vendor_profile_id && roles?.some((item) => item.role === "vendor")) {
      const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles").select("id")
        .eq("id", booking.vendor_profile_id).eq("user_id", user.id).maybeSingle();
      if (vendorError) return NextResponse.json({ error: "Booking access could not be verified." }, { status: 503 });
      isVendor = Boolean(vendor);
    }
    if (!isAdmin && !isCustomer && !isVendor) return NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 });

    const [{ data: customerProfile }, { data: payments, error: paymentsError }] = await Promise.all([
      supabase.from("profiles").select("full_name,email,phone").eq("id", booking.customer_id).maybeSingle(),
      supabase.from("payments").select(paymentFields).eq("booking_id", booking.id).order("created_at", { ascending: false }),
    ]);
    if (paymentsError) return NextResponse.json({ error: "Payment history is temporarily unavailable." }, { status: 503 });
    return NextResponse.json({ booking, customer: customerProfile, payments: payments ?? [] });
  } catch (error) {
    console.error("[booking-detail] read failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ? "Secure booking access is not configured on the server." : "Booking details are temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ status: z.enum(["awaiting_payment", "confirmed", "cancelled", "completed"]) }).strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking action." }, { status: 400 });

  const { data: roles, error: rolesError } = await activeRoles(sessionClient, user.id);
  if (rolesError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  const isAdmin = Boolean(roles?.some((item) => item.role === "admin" || item.role === "platform_owner"));
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

    const nextStatus = parsed.data.status;
    const unpaid = booking.paid_amount === 0;
    let allowed = false;
    if (isAdmin) {
      allowed = (nextStatus === "cancelled" && unpaid && ["pending_vendor_confirmation", "awaiting_payment"].includes(booking.status))
        || (nextStatus === "completed" && booking.status === "confirmed");
    } else if (isCustomer) {
      allowed = nextStatus === "cancelled" && unpaid && ["pending_vendor_confirmation", "awaiting_payment"].includes(booking.status);
    } else if (isVendor) {
      allowed = (booking.status === "pending_vendor_confirmation" && ["awaiting_payment", "cancelled"].includes(nextStatus))
        || (booking.status === "awaiting_payment" && nextStatus === "cancelled" && unpaid)
        || (booking.status === "confirmed" && nextStatus === "completed");
    }
    if (!allowed) return NextResponse.json({ error: "That booking status transition is not permitted." }, { status: 409 });

    // Compare-and-set guards against concurrent cancel/accept/payment transitions.
    const { data: updated, error: updateError } = await supabase.from("bookings").update({ status: nextStatus })
      .eq("id", id).eq("status", booking.status).eq("paid_amount", booking.paid_amount)
      .select(bookingFields).maybeSingle();
    if (updateError) {
      console.error("[booking-status] update failed", { code: updateError.code });
      return NextResponse.json({ error: "Booking status could not be updated." }, { status: 503 });
    }
    if (!updated) return NextResponse.json({ error: "The booking changed while this action was being processed. Refresh and try again." }, { status: 409 });
    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error("[booking-status] trusted database access failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ? "Secure booking access is not configured on the server." : "Booking status could not be updated." }, { status: 503 });
  }
}
