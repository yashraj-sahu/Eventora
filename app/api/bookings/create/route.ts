import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";

const bookingInput = z.object({
  vendorProfileId: z.string().uuid(),
  eventId: z.string().uuid().nullable().optional(),
  packageId: z.string().uuid().nullable(),
  serviceId: z.string().uuid().nullable().optional(),
  eventDate: z.string().date(),
  eventCity: z.string().trim().min(2).max(120),
  guestCount: z.number().int().min(1).max(10000),
  advancePercentage: z.union([z.literal(25), z.literal(50), z.literal(100)]),
  requirements: z.string().trim().max(3000).default(""),
  idempotencyKey: z.string().uuid(),
}).strict();

export async function POST(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in to request a booking." }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access before requesting a booking." }, { status: 403 });
  const parsed = bookingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the event and package details, then try again." }, { status: 400 });
  try {
    const db = createAdminSupabaseClient();
    const { data, error } = await db.rpc("create_booking_request", {
      p_customer_id: user.id,
      p_vendor_profile_id: parsed.data.vendorProfileId,
      p_event_id: parsed.data.eventId ?? null,
      p_package_id: parsed.data.packageId,
      p_service_id: parsed.data.serviceId ?? null,
      p_event_date: parsed.data.eventDate,
      p_event_city: parsed.data.eventCity,
      p_guest_count: parsed.data.guestCount,
      p_advance_percentage: parsed.data.advancePercentage,
      p_requirements: parsed.data.requirements,
      p_idempotency_key: parsed.data.idempotencyKey,
    });
    if (error || !data || typeof data !== "object") {
      console.error("[booking-create] atomic request failed", { code: error?.code ?? "invalid_result" });
      const status = error?.code === "23P01" ? 409 : error?.code === "42501" ? 403 : error?.code === "22023" ? 400 : 503;
      return NextResponse.json({ error: error?.code === "23P01" ? "The vendor is unavailable on that date. Choose another date or contact the vendor." : error?.code === "22023" ? "Booking details or the selected package are no longer valid." : error?.code === "42501" ? "The selected event is not available in your workspace." : "The booking request could not be saved. Please try again." }, { status });
    }
    const result = data as { id?: string; reference?: string; status?: string; duplicate?: boolean };
    if (!result.id || !result.reference || !result.status) return NextResponse.json({ error: "The booking request could not be confirmed." }, { status: 503 });
    return NextResponse.json({ success: true, bookingId: result.id, bookingReference: result.reference, status: result.status, duplicate: Boolean(result.duplicate) }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    console.error("[booking-create] trusted storage unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    const missingServiceKey = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure booking storage is not configured on the server." : "The booking request could not be saved. Please try again." }, { status: 503 });
  }
}
