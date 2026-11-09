import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-access";
import type { Json } from "@/types/database";

const categoryInput = z.object({ name: z.string().trim().min(2).max(80), active: z.boolean().optional() }).strict();
const settingInput = z.object({ key: z.string().trim().min(1).max(100), value: z.unknown() }).strict();
async function owner(request: Request) {
  const access = await requireAdminPermission("admin_message", request);
  if (!access.ok) return { response: NextResponse.json({ error: access.error }, { status: access.status }) };
  const { data, error } = await access.supabase.rpc("is_evntora_owner");
  if (error) return { response: NextResponse.json({ error: "Owner access could not be verified." }, { status: 503 }) };
  if (!data) return { response: NextResponse.json({ error: "Platform Owner access required." }, { status: 403 }) };
  try { return { access, service: createServiceRoleSupabaseClient() }; }
  catch { return { response: NextResponse.json({ error: "Platform settings are not configured on the server." }, { status: 503 }) }; }
}
export async function GET(request: Request) {
  const result = await owner(request); if ("response" in result) return result.response;
  const [settings,categories,roles,permissions,grants,audit] = await Promise.all([
    result.service.from("platform_settings").select("key,value,updated_by,updated_at").order("key"),
    result.service.from("marketplace_categories").select("id,name,slug,is_active,sort_order,created_at,updated_at").order("sort_order").order("name"),
    result.service.from("admin_role_assignments").select("user_id,admin_role,is_active,granted_by,created_at,updated_at"),
    result.service.from("admin_permissions").select("permission,label,description").order("permission"),
    result.service.from("admin_role_permissions").select("admin_role,permission"),
    result.service.from("admin_audit_log").select("id,actor_id,action,target_type,target_id,reason,before_data,after_data,created_at").order("created_at",{ascending:false}).limit(100),
  ]);
  if ([settings,categories,roles,permissions,grants,audit].some((item) => item.error)) return NextResponse.json({ error: "Platform configuration could not be loaded." }, { status: 503 });
  return NextResponse.json({ settings: settings.data ?? [], categories: categories.data ?? [], administrators: roles.data ?? [], permissions: permissions.data ?? [], rolePermissions: grants.data ?? [], audit: audit.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const result = await owner(request); if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = categoryInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid marketplace category." }, { status: 400 });
  const slug = parsed.data.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
  if (!slug) return NextResponse.json({ error: "Category name must contain letters or numbers." }, { status: 400 });
  const { data, error } = await result.service.from("marketplace_categories").insert({ name: parsed.data.name, slug, created_by: result.access.user.id, is_active: parsed.data.active ?? true }).select("id,name,slug,is_active,sort_order").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That category already exists." : "Category could not be saved." }, { status: error.code === "23505" ? 409 : 503 });
  await result.service.from("admin_audit_log").insert({ actor_id: result.access.user.id, action: "marketplace_category_created", target_type: "marketplace_category", target_id: data.id, after_data: data });
  return NextResponse.json({ category: data }, { status: 201 });
}
export async function PATCH(request: Request) {
  const result = await owner(request); if ("response" in result) return result.response;
  const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid category update." }, { status: 400 });
  const { data, error } = await result.service.from("marketplace_categories").update({ is_active: parsed.data.active, updated_at: new Date().toISOString() }).eq("id", parsed.data.id).select("id,name,is_active").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Category could not be updated." }, { status: 503 });
  await result.service.from("admin_audit_log").insert({ actor_id: result.access.user.id, action: "marketplace_category_updated", target_type: "marketplace_category", target_id: data.id, after_data: data });
  return NextResponse.json({ category: data });
}
export async function PUT(request: Request) {
  const result = await owner(request); if ("response" in result) return result.response;
  const parsed = settingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid platform setting." }, { status: 400 });
  const { data: before } = await result.service.from("platform_settings").select("value").eq("key", parsed.data.key).maybeSingle();
  const { data, error } = await result.service.from("platform_settings").upsert({ key: parsed.data.key, value: parsed.data.value as Json, updated_by: result.access.user.id, updated_at: new Date().toISOString() }).select("key,value,updated_at").single();
  if (error) return NextResponse.json({ error: "Platform setting could not be saved." }, { status: 503 });
  const { error: auditError } = await result.service.from("admin_audit_log").insert({ actor_id: result.access.user.id, action: "platform_setting_updated", target_type: "platform_setting", target_id: data.key, before_data: before?.value ?? null, after_data: data.value });
  if (auditError) console.error("[admin-settings] audit write failed", { key: data.key, code: auditError.code });
  return NextResponse.json({ setting: data });
}
