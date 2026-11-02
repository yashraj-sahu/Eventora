import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

const schema = z.object({ memoryType: z.enum(["personal", "event"]), eventId: z.string().uuid().nullable().optional(), content: z.string().trim().min(1).max(2000) }).superRefine((value, ctx) => {
  if ((value.memoryType === "personal" && value.eventId) || (value.memoryType === "event" && !value.eventId)) ctx.addIssue({ code: "custom", message: "Memory scope is invalid." });
});

export async function GET() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to view saved memories." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access to manage saved preferences." }, { status: 403 });
  const { data, error } = await supabase.from("ai_memories").select("id,memory_type,event_id,content,is_enabled,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Saved memories are unavailable. Apply the AI planning migration and retry." }, { status: 503 });
  return NextResponse.json({ memories: data ?? [] });
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to save a preference." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access to manage saved preferences." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the memory details and try again." }, { status: 400 });
  const { data, error } = await supabase.from("ai_memories").insert({ user_id: user.id, memory_type: parsed.data.memoryType, event_id: parsed.data.eventId ?? null, content: parsed.data.content }).select("id,memory_type,event_id,content,is_enabled,created_at,updated_at").single();
  if (error || !data) return NextResponse.json({ error: "Preference could not be saved. Ensure the AI planning migration is applied." }, { status: 503 });
  return NextResponse.json({ memory: data });
}
