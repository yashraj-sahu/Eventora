import { NextResponse } from "next/server";
import { createAdminSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { user, supabase: sessionClient, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in to view vendor finances." }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((item) => item.role === "vendor")) return NextResponse.json({ error: "Vendor access is required." }, { status: 403 });
  try {
    const db = createAdminSupabaseClient();
    const { data: vendor, error: vendorError } = await db.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (vendorError) return NextResponse.json({ error: "Vendor business could not be loaded." }, { status: 503 });
    if (!vendor) return NextResponse.json({ error: "No vendor business is linked to this account." }, { status: 404 });
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let bookingQuery = db.from("bookings").select("id,booking_reference,event_date,status,total_amount,paid_amount,vendor_name,package_name,created_at").eq("vendor_profile_id", vendor.id).order("created_at", { ascending: false }).limit(500);
    const { data: bookings, error: bookingError } = await bookingQuery;
    if (bookingError) return NextResponse.json({ error: "Vendor bookings could not be loaded." }, { status: 503 });
    const ids = (bookings ?? []).map((item) => item.id);
    if (!ids.length) return NextResponse.json({ bookings: [], payments: [], refunds: [] }, { headers: { "Cache-Control": "private, no-store" } });
    let paymentQuery = db.from("payments").select("id,booking_id,amount,currency,status,purpose,payment_method,verified_at,created_at").in("booking_id", ids).order("created_at", { ascending: false });
    let refundQuery = db.from("refunds").select("id,payment_id,booking_id,amount,status,reason,created_at,updated_at").in("booking_id", ids).order("created_at", { ascending: false });
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) { paymentQuery = paymentQuery.gte("created_at", `${from}T00:00:00.000Z`); refundQuery = refundQuery.gte("created_at", `${from}T00:00:00.000Z`); }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) { paymentQuery = paymentQuery.lte("created_at", `${to}T23:59:59.999Z`); refundQuery = refundQuery.lte("created_at", `${to}T23:59:59.999Z`); }
    const [{ data: payments, error: paymentError }, { data: refunds, error: refundError }] = await Promise.all([paymentQuery, refundQuery]);
    if (paymentError || refundError) return NextResponse.json({ error: "Payment records could not be loaded." }, { status: 503 });
    return NextResponse.json({ bookings: bookings ?? [], payments: payments ?? [], refunds: refunds ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const notConfigured = cause instanceof Error && cause.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: notConfigured ? "Secure vendor finance access is not configured on the server." : "Vendor finances could not be loaded." }, { status: 503 });
  }
}
