import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-access";

export async function GET(request: Request) {
  const permissions = ["vendor_read", "user_read", "booking_support", "finance_read", "analytics_finance"] as const;
  let access: Awaited<ReturnType<typeof requireAdminPermission>> | null = null;
  for (const permission of permissions) {
    const candidate = await requireAdminPermission(permission, request);
    if (candidate.ok) { access = candidate; break; }
    if (candidate.status === 401 || candidate.status === 503) return NextResponse.json({ error: candidate.error }, { status: candidate.status });
    access = candidate;
  }
  if (!access?.ok) return NextResponse.json({ error: access?.error ?? "Administrator access required." }, { status: 403 });
  const [{ data: trends, error: trendsError }, { data: breakdowns, error: breakdownError }] = await Promise.all([
    access.supabase.rpc("admin_platform_trends", { p_days: 30 }),
    access.supabase.rpc("admin_platform_breakdowns"),
  ]);
  const error = trendsError ?? breakdownError;
  if (error) return NextResponse.json({ error: "Analytics could not be loaded." }, { status: error.code === "42501" ? 403 : 503 });
  return NextResponse.json({ trends: trends ?? [], breakdowns }, { headers: { "Cache-Control": "private, no-store" } });
}
