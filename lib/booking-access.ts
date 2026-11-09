import "server-only";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";

const bookingFields = "id,booking_reference,customer_id,event_id,vendor_id,vendor_profile_id,vendor_package_id,vendor_name,vendor_category,package_name,service_details,event_date,event_city,guest_count,requirements,total_amount,advance_amount,paid_amount,currency,status,cancellation_terms,allow_partial_payments,requested_advance_percentage,rejection_reason,cancellation_reason,accepted_at,confirmed_at,started_at,completed_at,completion_acknowledged_at,cancellation_requested_at,cancelled_at,created_at,updated_at";

export async function getBookingAccess(request: Request, bookingId: string, options: { participantsOnly?: boolean } = {}) {
  const { user, supabase: sessionClient, error } = await getAuthenticatedUser(request);
  if (!user || error) return { response: NextResponse.json({ error: "Sign in to access this booking." }, { status: 401 }) } as const;
  const { data: memberships, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return { response: NextResponse.json({ error: "Account access could not be verified." }, { status: 503 }) } as const;
  try {
    const db = createAdminSupabaseClient();
    const { data: booking, error: bookingError } = await db.from("bookings").select(bookingFields).eq("id", bookingId).maybeSingle();
    if (bookingError) return { response: NextResponse.json({ error: "Booking could not be loaded." }, { status: 503 }) } as const;
    if (!booking) return { response: NextResponse.json({ error: "Booking not found." }, { status: 404 }) } as const;
    const roles = new Set((memberships ?? []).map((item) => item.role));
    if (!options.participantsOnly && (roles.has("admin") || roles.has("platform_owner"))) {
      const { data: canSupportBookings, error: permissionError } = await sessionClient.rpc("has_admin_permission", { p_permission: "booking_support" });
      if (permissionError) return { response: NextResponse.json({ error: "Booking support permission could not be checked." }, { status: 503 }) } as const;
      if (canSupportBookings) return { user, db, booking, role: "admin" as const };
    }
    if (roles.has("customer") && booking.customer_id === user.id) return { user, db, booking, role: "customer" as const };
    if (roles.has("vendor") && booking.vendor_profile_id) {
      const { data: vendor, error: vendorError } = await db.from("vendor_profiles").select("id").eq("id", booking.vendor_profile_id).eq("user_id", user.id).maybeSingle();
      if (vendorError) return { response: NextResponse.json({ error: "Vendor booking access could not be verified." }, { status: 503 }) } as const;
      if (vendor) return { user, db, booking, role: "vendor" as const };
    }
    return { response: NextResponse.json({ error: "You do not have access to this booking." }, { status: 403 }) } as const;
  } catch (cause) {
    const missingKey = cause instanceof Error && cause.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return { response: NextResponse.json({ error: missingKey ? "Secure booking access is not configured on the server." : "Booking access is temporarily unavailable." }, { status: 503 }) } as const;
  }
}
