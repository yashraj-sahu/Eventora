import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

const schema = z.object({ eventId: z.string().uuid().optional(), title: z.string().trim().min(2).max(180), category: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100), date: z.string().date(), guestCount: z.number().int().min(1).max(10000), totalBudget: z.number().int().min(0).max(1_000_000_000), venuePreference: z.string().max(300).nullable(), styleTheme: z.string().max(300).nullable(), requirements: z.string().max(4000), blueprint: z.record(z.string(), z.unknown()) });

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to save this event plan." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((item) => item.role === "customer")) return NextResponse.json({ error: "Enable Customer access to save event plans." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Some event details are invalid. Review the form and try again." }, { status: 400 });
  const { eventId, ...payload } = parsed.data;
  const fields = { title: payload.title, category: payload.category, city: payload.city, date: payload.date, guest_count: payload.guestCount, total_budget: payload.totalBudget, venue_preference: payload.venuePreference || null, style_theme: payload.styleTheme || null, planning_requirements: payload.requirements, blueprint: payload.blueprint };
  const result = eventId
    ? await supabase.from("events").update(fields).eq("id", eventId).eq("user_id", user.id).select("id").maybeSingle()
    : await supabase.from("events").insert({ ...fields, user_id: user.id }).select("id").single();
  if (result.error || !result.data) return NextResponse.json({ error: "We could not save the plan. Check that the AI planning migration has been applied, then try again." }, { status: result.error?.code === "PGRST204" || result.error?.code === "42703" ? 503 : 500 });
  return NextResponse.json({ eventId: result.data.id });
}
