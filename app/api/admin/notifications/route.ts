import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-access";

const input = z.object({ action: z.enum(["read", "read-all"]), id: z.number().int().positive().optional() }).strict();
const notificationPermissions = ["vendor_read", "vendor_verification", "listing_moderation", "user_read", "booking_support", "support_read", "finance_read", "refund_issue", "analytics_finance", "admin_message"] as const;
async function notificationAccess(request: Request) {
  for (const permission of notificationPermissions) {
    const access = await requireAdminPermission(permission, request);
    if (access.ok || access.status === 401 || access.status === 503) return access;
  }
  return requireAdminPermission("admin_message", request);
}
export async function GET(request: Request) {
  const access = await notificationAccess(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { searchParams } = new URL(request.url);
  if (searchParams.get("unread") === "1") {
    const { count, error } = await access.supabase.from("admin_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    if (error) return NextResponse.json({ error: "Notifications are unavailable." }, { status: 503 });
    return NextResponse.json({ unreadCount: count ?? 0 });
  }
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 25));
  let query = access.supabase.from("admin_notifications").select("id,permission,event_type,title,body,entity_type,entity_id,dedupe_key,read_at,created_at", { count: "exact" }).order("created_at", { ascending: false });
  const readState = searchParams.get("read");
  const eventType = searchParams.get("type")?.trim().slice(0, 80);
  if (readState === "unread") query = query.is("read_at", null);
  else if (readState === "read") query = query.not("read_at", "is", null);
  if (eventType) query = query.eq("event_type", eventType);
  query = query.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Notifications are unavailable." }, { status: 503 });
  return NextResponse.json({ notifications: data ?? [], total: count ?? 0, page, pageSize });
}

export async function PATCH(request: Request) {
  const access = await notificationAccess(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification update." }, { status: 400 });
  let query = access.supabase.from("admin_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (parsed.data.action === "read") {
    if (!parsed.data.id) return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
    query = query.eq("id", parsed.data.id);
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Notification read state could not be saved." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
