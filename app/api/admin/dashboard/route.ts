import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-access";

export async function GET(request: Request) {
  const eligiblePermissions = ["vendor_read", "user_read", "booking_support", "finance_read", "analytics_finance"] as const;
  let access: Awaited<ReturnType<typeof requireAdminPermission>> | null = null;
  for (const permission of eligiblePermissions) {
    const candidate = await requireAdminPermission(permission, request);
    if (candidate.ok) { access = candidate; break; }
    if (candidate.status === 401 || candidate.status === 503) return NextResponse.json({ error: candidate.error }, { status: candidate.status });
    access = candidate;
  }
  if (!access?.ok) return NextResponse.json({ error: access?.error ?? "Administrator access required." }, { status: 403 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const { data: metrics, error } = await access.supabase.rpc("admin_platform_metrics", { p_from: from || null, p_to: to || null });
  if (error) return NextResponse.json({ error: "Dashboard metrics could not be loaded." }, { status: error.code === "42501" ? 403 : 503 });
  const [{ data: permissionData, error: permissionError }, { data: isOwner, error: ownerError }] = await Promise.all([
    access.supabase.rpc("current_admin_permissions"),
    access.supabase.rpc("is_evntora_owner"),
  ]);
  if (permissionError || ownerError) return NextResponse.json({ error: "Dashboard permissions could not be loaded." }, { status: 503 });
  const { data: recent, error: recentError } = await access.supabase.from("admin_notifications").select("id,event_type,title,body,entity_type,entity_id,created_at,read_at").order("created_at", { ascending: false }).limit(8);
  if (recentError) return NextResponse.json({ error: "Recent activity could not be loaded." }, { status: 503 });
  return NextResponse.json({ metrics, recentActivity: recent ?? [], permissions: permissionData ?? [], isOwner: Boolean(isOwner) }, { headers: { "Cache-Control": "private, no-store" } });
}
