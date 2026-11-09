import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-access";
import type { AdminRole } from "@/types/database";

const roles: AdminRole[] = ["super_admin", "vendor_moderator", "support_admin", "finance_admin"];
async function owner(request: Request) {
  const access = await requireAdminPermission("admin_message", request);
  if (!access.ok) return { response: NextResponse.json({ error: access.error }, { status: access.status }) };
  const { data, error } = await access.supabase.rpc("is_evntora_owner");
  if (error) return { response: NextResponse.json({ error: "Owner access could not be verified." }, { status: 503 }) };
  if (!data) return { response: NextResponse.json({ error: "Platform Owner access required." }, { status: 403 }) };
  try { return { access, service: createServiceRoleSupabaseClient() }; } catch { return { response: NextResponse.json({ error: "Permission storage is not configured." }, { status: 503 }) }; }
}
export async function GET(request: Request) {
  const result = await owner(request); if ("response" in result) return result.response;
  const [{ data: available, error }, { data: assigned, error: assignedError }] = await Promise.all([
    result.service.from("admin_permissions").select("permission,label,description").order("label"),
    result.service.from("admin_role_permissions").select("admin_role,permission").order("admin_role"),
  ]);
  if (error || assignedError) return NextResponse.json({ error: "Permission matrix is unavailable." }, { status: 503 });
  return NextResponse.json({ roles, permissions: available ?? [], assignments: assigned ?? [] });
}
export async function PATCH(request: Request) {
  const result = await owner(request); if ("response" in result) return result.response;
  const parsed = z.object({ adminRole: z.enum(roles), permission: z.string().min(1).max(80), enabled: z.boolean() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid role permission update." }, { status: 400 });
  const { data: permission, error: permissionError } = await result.service.from("admin_permissions").select("permission").eq("permission", parsed.data.permission).maybeSingle();
  if (permissionError || !permission) return NextResponse.json({ error: "Unknown permission." }, { status: 400 });
  const operation = parsed.data.enabled
    ? await result.service.from("admin_role_permissions").upsert({ admin_role: parsed.data.adminRole, permission: parsed.data.permission })
    : await result.service.from("admin_role_permissions").delete().eq("admin_role", parsed.data.adminRole).eq("permission", parsed.data.permission);
  if (operation.error) return NextResponse.json({ error: "Permission assignment could not be saved." }, { status: 503 });
  const { error: auditError } = await result.service.from("admin_audit_log").insert({ actor_id: result.access.user.id, action: "admin_role_permission_updated", target_type: "admin_role", target_id: parsed.data.adminRole, after_data: { permission: parsed.data.permission, enabled: parsed.data.enabled } });
  if (auditError) console.error("[admin-permissions] audit write failed", { role: parsed.data.adminRole, code: auditError.code });
  return NextResponse.json({ ok: true });
}
