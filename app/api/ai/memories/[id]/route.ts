import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

const schema = z.object({ content: z.string().trim().min(1).max(2000).optional(), is_enabled: z.boolean().optional() }).refine((value) => value.content !== undefined || value.is_enabled !== undefined);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to update saved memories." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access to manage saved preferences." }, { status: 403 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the memory update and try again." }, { status: 400 });
  const { data, error } = await supabase.from("ai_memories").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Saved memory could not be updated." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Saved memory not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to delete saved memories." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access to manage saved preferences." }, { status: 403 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("ai_memories").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Saved memory could not be deleted." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Saved memory not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
