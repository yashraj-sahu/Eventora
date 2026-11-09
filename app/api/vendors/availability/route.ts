import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";

const dateSchema = z.string().date();
const availabilityInput = z.object({ date: dateSchema, status: z.enum(["available", "unavailable", "blocked"]), note: z.string().trim().max(500).optional() }).strict();

function dateRange(start: string, end: string): string[] | null {
  const from = new Date(`${start}T00:00:00.000Z`);
  const to = new Date(`${end}T00:00:00.000Z`);
  const days = Math.floor((to.getTime() - from.getTime()) / 86400000);
  if (days < 0 || days > 90) return null;
  return Array.from({ length: days + 1 }, (_, index) => new Date(from.getTime() + index * 86400000).toISOString().slice(0, 10));
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const vendorProfileId = z.string().uuid().safeParse(query.get("vendorProfileId"));
  const from = dateSchema.safeParse(query.get("from"));
  const to = dateSchema.safeParse(query.get("to"));
  if (!vendorProfileId.success || !from.success || !to.success) return NextResponse.json({ error: "Provide a vendor and date range." }, { status: 400 });
  const days = dateRange(from.data, to.data);
  if (!days) return NextResponse.json({ error: "Availability can be viewed for ranges of up to 90 days." }, { status: 400 });
  try {
    const db = createAdminSupabaseClient();
    const { data: vendor, error: vendorError } = await db.from("vendor_profiles").select("id").eq("id", vendorProfileId.data).eq("approval_status", "approved").eq("is_published", true).maybeSingle();
    if (vendorError) return NextResponse.json({ error: "Vendor availability could not be checked." }, { status: 503 });
    if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
    const [{ data: records, error: availabilityError }, { data: bookings, error: bookingError }] = await Promise.all([
      db.from("vendor_availability").select("available_date,status,note").eq("vendor_profile_id", vendor.id).gte("available_date", from.data).lte("available_date", to.data),
      db.from("bookings").select("event_date,status").eq("vendor_profile_id", vendor.id).in("status", ["awaiting_payment", "confirmed", "in_progress", "cancellation_requested"]).gte("event_date", from.data).lte("event_date", to.data),
    ]);
    if (availabilityError || bookingError) return NextResponse.json({ error: "Vendor availability could not be checked." }, { status: 503 });
    const explicit = new Map((records ?? []).map((item) => [item.available_date, item]));
    const reservations = new Map((bookings ?? []).map((item) => [item.event_date, item.status]));
    return NextResponse.json({ dates: days.map((date) => ({ date, status: reservations.get(date) === "awaiting_payment" ? "pending" : reservations.has(date) ? "booked" : explicit.get(date)?.status ?? "unknown", note: reservations.get(date) === "cancellation_requested" ? "Cancellation requested; date remains reserved" : explicit.get(date)?.note ?? null })) }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    const missingServiceKey = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure availability lookup is not configured on the server." : "Vendor availability could not be checked." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in as the vendor to update availability." }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "vendor")) return NextResponse.json({ error: "Vendor access is required." }, { status: 403 });
  const { data: ownedVendor, error: ownerError } = await sessionClient.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (ownerError) return NextResponse.json({ error: "Vendor ownership could not be verified." }, { status: 503 });
  if (!ownedVendor) return NextResponse.json({ error: "Vendor profile not found." }, { status: 404 });
  const parsed = availabilityInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Availability details are invalid." }, { status: 400 });
  try {
    const { data, error } = await sessionClient.rpc("set_vendor_availability", { p_vendor_id: user.id, p_date: parsed.data.date, p_status: parsed.data.status, p_note: parsed.data.note ?? null });
    if (error) return NextResponse.json({ error: error.code === "23P01" ? "A confirmed booking already uses that date." : error.code === "42501" ? "Only an approved vendor can manage availability." : "Availability could not be updated." }, { status: error.code === "42501" ? 403 : error.code === "22023" ? 400 : 409 });
    return NextResponse.json({ success: true, availability: data });
  } catch (error) {
    return NextResponse.json({ error: "Availability could not be updated." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in as the vendor to update availability." }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "vendor")) return NextResponse.json({ error: "Vendor access is required." }, { status: 403 });
  const { data: ownedVendor, error: ownerError } = await sessionClient.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (ownerError) return NextResponse.json({ error: "Vendor ownership could not be verified." }, { status: 503 });
  if (!ownedVendor) return NextResponse.json({ error: "Vendor profile not found." }, { status: 404 });
  const parsed = z.object({ date: dateSchema }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  try {
    const db = createAdminSupabaseClient();
    const { data, error } = await db.rpc("clear_vendor_availability", { p_vendor_id: user.id, p_date: parsed.data.date });
    if (error) return NextResponse.json({ error: error.code === "42501" ? "Only an approved vendor can manage availability." : "Availability could not be cleared." }, { status: error.code === "42501" ? 403 : 503 });
    return NextResponse.json({ success: true, cleared: data });
  } catch (error) {
    const missingServiceKey = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure availability storage is not configured on the server." : "Availability could not be cleared." }, { status: 503 });
  }
}
