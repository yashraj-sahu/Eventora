import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

const schema = z.object({ eventId: z.string().uuid().optional(), title: z.string().trim().min(2).max(180), category: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100), date: z.string().date(), guestCount: z.number().int().min(1).max(10000), totalBudget: z.number().int().min(0).max(1_000_000_000), venuePreference: z.string().max(300).nullable(), styleTheme: z.string().max(300).nullable(), requirements: z.string().max(4000), blueprint: z.record(z.string(), z.unknown()) });

const workspaceSchema = z.object({
  expenses: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80), amount: z.number().finite().min(0).max(1_000_000_000), status: z.enum(["planned", "paid", "due"]), dueDate: z.string().date().nullable(), notes: z.string().max(1000) }).strict()).max(500),
  guests: z.array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(160), email: z.string().email().max(254).or(z.literal("")).optional(), phone: z.string().max(40).optional(), group: z.string().trim().min(1).max(80), rsvpStatus: z.enum(["pending", "confirmed", "declined"]), dietaryPreference: z.string().max(80).optional(), plusOnes: z.number().int().min(0).max(20), tableNumber: z.string().max(40).optional() }).strict()).max(10000),
  tasks: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(240), category: z.string().trim().min(1).max(80), stage: z.string().trim().min(1).max(80), dueDate: z.string().date().nullable(), completed: z.boolean() }).strict()).max(1000),
  timeline: z.array(z.object({ id: z.string().uuid(), time: z.string().trim().min(1).max(40), activity: z.string().trim().min(1).max(200), location: z.string().max(180), notes: z.string().max(1000) }).strict()).max(500),
  inspiration: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80), notes: z.string().max(1000), color: z.string().max(40) }).strict()).max(300),
}).strict();

async function customerSession(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return { user: null, supabase: null, response: NextResponse.json({ error: "Sign in to access your events." }, { status: 401 }) };
  const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (error) return { user: null, supabase: null, response: NextResponse.json({ error: "Account access could not be verified." }, { status: 503 }) };
  if (!roles?.some((item) => item.role === "customer")) return { user: null, supabase: null, response: NextResponse.json({ error: "Enable Customer access to manage event plans." }, { status: 403 }) };
  return { user, supabase, response: null };
}

export async function GET(request: Request) {
  const { user, supabase, response } = await customerSession(request);
  if (response || !user || !supabase) return response;
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (eventId && !z.string().uuid().safeParse(eventId).success) return NextResponse.json({ error: "Invalid event ID." }, { status: 400 });
  if (eventId) {
    const { data, error } = await supabase.from("events").select("id,user_id,title,category,city,date,guest_count,total_budget,venue_preference,style_theme,status,blueprint,planning_requirements,created_at,updated_at").eq("id", eventId).eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Event details are temporarily unavailable." }, { status: 503 });
    if (!data) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ event: data }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const { data, error } = await supabase.from("events").select("id,title,category,city,date,guest_count,total_budget,status,blueprint,created_at,updated_at").eq("user_id", user.id).order("date", { ascending: true });
  if (error) return NextResponse.json({ error: "Your events could not be loaded." }, { status: 503 });
  return NextResponse.json({ events: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const { user, supabase, response } = await customerSession(request);
  if (response || !user || !supabase) return response;
  const parsed = z.object({ eventId: z.string().uuid(), workspace: workspaceSchema }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the event workspace changes and try again." }, { status: 400 });
  const { data: event, error: readError } = await supabase.from("events").select("id,blueprint").eq("id", parsed.data.eventId).eq("user_id", user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Event workspace could not be loaded." }, { status: 503 });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const blueprint = { ...(event.blueprint ?? {}), workspaceData: parsed.data.workspace };
  const { error: saveError } = await supabase.from("events").update({ blueprint }).eq("id", event.id).eq("user_id", user.id);
  if (saveError) return NextResponse.json({ error: "Workspace changes could not be saved." }, { status: 503 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to save this event plan." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((item) => item.role === "customer")) return NextResponse.json({ error: "Enable Customer access to save event plans." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Some event details are invalid. Review the form and try again." }, { status: 400 });
  const { eventId, ...payload } = parsed.data;
  let preservedWorkspace: unknown;
  if (eventId) {
    const { data: existing, error: existingError } = await supabase.from("events").select("id,blueprint").eq("id", eventId).eq("user_id", user.id).maybeSingle();
    if (existingError) return NextResponse.json({ error: "The saved event could not be checked." }, { status: 503 });
    if (!existing) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    preservedWorkspace = existing.blueprint?.workspaceData;
  }
  const blueprint = { ...payload.blueprint };
  delete blueprint.workspaceData;
  if (preservedWorkspace) blueprint.workspaceData = preservedWorkspace;
  const fields = { title: payload.title, category: payload.category, city: payload.city, date: payload.date, guest_count: payload.guestCount, total_budget: payload.totalBudget, venue_preference: payload.venuePreference || null, style_theme: payload.styleTheme || null, planning_requirements: payload.requirements, blueprint };
  const result = eventId
    ? await supabase.from("events").update(fields).eq("id", eventId).eq("user_id", user.id).select("id").maybeSingle()
    : await supabase.from("events").insert({ ...fields, user_id: user.id }).select("id").single();
  if (result.error || !result.data) return NextResponse.json({ error: "We could not save the plan. Check that the AI planning migration has been applied, then try again." }, { status: result.error?.code === "PGRST204" || result.error?.code === "42703" ? 503 : 500 });
  return NextResponse.json({ eventId: result.data.id });
}
