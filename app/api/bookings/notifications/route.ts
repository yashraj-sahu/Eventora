import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createAdminSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { user, supabase: sessionClient, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in to view booking notifications." }, { status: 401 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.length) return NextResponse.json({ error: "Account access is not enabled." }, { status: 403 });
  const query = new URL(request.url).searchParams;
  const bookingId = query.get("bookingId");
  if (bookingId && !z.string().uuid().safeParse(bookingId).success) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });
  try {
    const db = createAdminSupabaseClient();
    let select = db.from("booking_notifications").select("id,recipient_id,booking_id,event_type,title,message,dedupe_key,created_at,read_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (bookingId) select = select.eq("booking_id", bookingId);
    const { data, error: readError } = await select;
    if (readError) return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 503 });
    return NextResponse.json({ notifications: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const missingServiceKey = cause instanceof Error && cause.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure notification access is not configured on the server." : "Notifications could not be loaded." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const { user, supabase: sessionClient, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });
  const parsed = z.object({ notificationId: z.string().uuid() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
  const { data: roles, error: roleError } = await sessionClient.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.length) return NextResponse.json({ error: "Account access is not enabled." }, { status: 403 });
  try {
    const db = createAdminSupabaseClient();
    const { data, error: updateError } = await db.from("booking_notifications").update({ read_at: new Date().toISOString() }).eq("id", parsed.data.notificationId).eq("recipient_id", user.id).select("id,read_at").maybeSingle();
    if (updateError) return NextResponse.json({ error: "Notification could not be updated." }, { status: 503 });
    if (!data) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    return NextResponse.json({ success: true, notification: data });
  } catch (cause) {
    const missingServiceKey = cause instanceof Error && cause.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: missingServiceKey ? "Secure notification storage is not configured on the server." : "Notification could not be updated." }, { status: 503 });
  }
}
