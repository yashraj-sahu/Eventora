import { NextResponse } from "next/server";
import { createAdminSupabaseClient, getAuthenticatedUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { user, supabase: sessionClient, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in to view booking messages." }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  const customer = roles?.some((role) => role.role === "customer") ?? false;
  const vendor = roles?.some((role) => role.role === "vendor") ?? false;
  if (!customer && !vendor) return NextResponse.json({ error: "Booking participant access is required." }, { status: 403 });

  try {
    const db = createAdminSupabaseClient();
    let vendorIds: string[] = [];
    if (vendor) {
      const { data, error } = await db.from("vendor_profiles").select("id").eq("user_id", user.id);
      if (error) return NextResponse.json({ error: "Message access could not be verified." }, { status: 503 });
      vendorIds = (data ?? []).map((item) => item.id);
    }
    const bookingRequests = [];
    if (customer) bookingRequests.push(db.from("bookings").select("id,customer_id,vendor_profile_id,booking_reference,vendor_name,event_date,status").eq("customer_id", user.id).order("updated_at", { ascending: false }).limit(100));
    if (vendorIds.length) bookingRequests.push(db.from("bookings").select("id,customer_id,vendor_profile_id,booking_reference,vendor_name,event_date,status").in("vendor_profile_id", vendorIds).order("updated_at", { ascending: false }).limit(100));
    const results = await Promise.all(bookingRequests);
    const bookingMap = new Map<string, { id: string; customer_id: string; vendor_profile_id: string | null; booking_reference: string; vendor_name: string; event_date: string; status: string }>();
    for (const result of results) {
      if (result.error) return NextResponse.json({ error: "Booking conversations could not be loaded." }, { status: 503 });
      for (const booking of result.data ?? []) bookingMap.set(booking.id, booking);
    }
    const bookingIds = [...bookingMap.keys()];
    if (!bookingIds.length) return NextResponse.json({ conversations: [], unreadCount: 0 });
    const customerIds = [...new Set([...bookingMap.values()].map((booking) => booking.customer_id))];
    const { data: customerProfiles, error: profileError } = await db.from("profiles").select("id,full_name").in("id", customerIds);
    if (profileError) return NextResponse.json({ error: "Booking conversations could not be loaded." }, { status: 503 });
    const customerNames = new Map((customerProfiles ?? []).map((profile) => [profile.id, profile.full_name]));
    const { data: messages, error: messageError } = await db.from("booking_messages")
      .select("id,booking_id,sender_id,body,created_at,customer_read_at,vendor_read_at")
      .in("booking_id", bookingIds).order("created_at", { ascending: false }).limit(500);
    if (messageError) return NextResponse.json({ error: "Booking conversations could not be loaded." }, { status: 503 });
    const latest = new Map<string, NonNullable<typeof messages>[number]>();
    let unreadCount = 0;
    for (const message of messages ?? []) {
      const booking = bookingMap.get(message.booking_id);
      if (!booking) continue;
      if (!latest.has(message.booking_id)) latest.set(message.booking_id, message);
      const isCustomer = booking.customer_id === user.id;
      if (message.sender_id !== user.id && (isCustomer ? !message.customer_read_at : !message.vendor_read_at)) unreadCount += 1;
    }
    const conversations = [...latest.values()].map((message) => {
      const booking = bookingMap.get(message.booking_id)!;
      const isCustomer = booking.customer_id === user.id;
      return { bookingId: booking.id, bookingReference: booking.booking_reference, vendorName: isCustomer ? booking.vendor_name : customerNames.get(booking.customer_id) || "Customer",
        eventDate: booking.event_date, bookingStatus: booking.status, latestMessage: message,
        unread: message.sender_id !== user.id && (isCustomer ? !message.customer_read_at : !message.vendor_read_at) };
    });
    return NextResponse.json({ conversations, unreadCount }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const missingServiceKey = cause instanceof Error && cause.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure message access is not configured on the server." : "Booking conversations could not be loaded." }, { status: 503 });
  }
}
