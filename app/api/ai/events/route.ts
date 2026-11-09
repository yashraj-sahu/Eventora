import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

const schema = z.object({ eventId: z.string().uuid().optional(), title: z.string().trim().min(2).max(180), category: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100), date: z.string().date(), guestCount: z.number().int().min(1).max(10000), totalBudget: z.number().int().min(0).max(1_000_000_000), venuePreference: z.string().max(300).nullable(), styleTheme: z.string().max(300).nullable(), requirements: z.string().max(4000), blueprint: z.record(z.string(), z.unknown()) });

const workspaceSchema = z.object({
  allocations: z.array(z.object({ id: z.string().uuid(), category: z.string().trim().min(1).max(80), amount: z.number().finite().min(0.01).max(1_000_000_000), notes: z.string().max(1000) }).strict()).max(100).default([]),
  expenses: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80), amount: z.number().finite().min(0.01).max(1_000_000_000), status: z.enum(["planned", "paid", "due"]), dueDate: z.string().date().nullable(), expenseDate: z.string().date().nullable().optional(), description: z.string().max(1000).optional(), vendorBookingId: z.string().uuid().nullable().optional(), notes: z.string().max(1000) }).strict()).max(500),
  guests: z.array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(254).or(z.literal("")).optional(), phone: z.string().trim().max(40).regex(/^[+\d().\s-]*$/).optional(), group: z.string().trim().min(1).max(80), rsvpStatus: z.enum(["pending", "invited", "confirmed", "declined"]), dietaryPreference: z.string().trim().max(80).optional(), plusOnes: z.number().int().min(0).max(20), tableNumber: z.string().trim().max(40).optional(), notes: z.string().trim().max(1000).optional() }).strict()).max(10000),
  tasks: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(240), category: z.string().trim().min(1).max(80), stage: z.string().trim().min(1).max(80), dueDate: z.string().date().nullable(), completed: z.boolean(), notes: z.string().max(1000).optional() }).strict()).max(1000),
  timeline: z.array(z.object({ id: z.string().uuid(), time: z.string().trim().min(1).max(40), activity: z.string().trim().min(1).max(200), location: z.string().max(180), notes: z.string().max(1000), date: z.string().date().optional(), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), description: z.string().max(1000).optional(), vendorBookingId: z.string().uuid().nullable().optional() }).strict()).max(500),
  inspiration: z.array(z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80), notes: z.string().max(1000), color: z.string().max(40), description: z.string().max(1000).optional() }).strict()).max(300),
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
  const { data, error } = await supabase.from("events").select("id,title,category,city,date,guest_count,total_budget,status,created_at,updated_at").eq("user_id", user.id).order("date", { ascending: true });
  if (error) return NextResponse.json({ error: "Your events could not be loaded." }, { status: 503 });
  return NextResponse.json({ events: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const { user, supabase, response } = await customerSession(request);
  if (response || !user || !supabase) return response;
  const parsed = z.object({ eventId: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }), workspace: workspaceSchema }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the event workspace changes and try again." }, { status: 400 });
  const { data: event, error: readError } = await supabase.from("events").select("id,blueprint,updated_at").eq("id", parsed.data.eventId).eq("user_id", user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Event workspace could not be loaded." }, { status: 503 });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.updated_at !== parsed.data.expectedUpdatedAt) return NextResponse.json({ error: "This event changed in another session. Reload the latest version before saving." }, { status: 409 });
  const bookingIds = new Set([...parsed.data.workspace.expenses, ...parsed.data.workspace.timeline].map((item) => item.vendorBookingId).filter((id): id is string => Boolean(id)));
  if (bookingIds.size) {
    const { data: linkedBookings, error: bookingError } = await supabase.from("bookings").select("id").eq("customer_id", user.id).eq("event_id", event.id).in("id", [...bookingIds]);
    if (bookingError) return NextResponse.json({ error: "Linked bookings could not be verified." }, { status: 503 });
    if ((linkedBookings ?? []).length !== bookingIds.size) return NextResponse.json({ error: "Choose a booking linked to this event." }, { status: 400 });
  }
  const emailKeys = parsed.data.workspace.guests.map((guest) => guest.email?.trim().toLowerCase()).filter((value): value is string => Boolean(value));
  const phoneKeys = parsed.data.workspace.guests.map((guest) => guest.phone?.replace(/\D/g, "")).filter((value): value is string => Boolean(value));
  if (new Set(emailKeys).size !== emailKeys.length || new Set(phoneKeys).size !== phoneKeys.length) return NextResponse.json({ error: "A guest with that email address or phone number is already on this event list." }, { status: 409 });
  const allocationCategories = parsed.data.workspace.allocations.map((allocation) => allocation.category.trim().toLowerCase());
  if (new Set(allocationCategories).size !== allocationCategories.length) return NextResponse.json({ error: "Each event budget category can have one allocation. Edit its existing amount instead." }, { status: 409 });
  for (const item of parsed.data.workspace.timeline) {
    if (item.startTime && item.endTime && item.endTime <= item.startTime) return NextResponse.json({ error: "Timeline activities must end after they start on the same date." }, { status: 400 });
  }
  for (const [name, rows] of Object.entries(parsed.data.workspace)) {
    if (new Set(rows.map((row) => row.id)).size !== rows.length) return NextResponse.json({ error: `Duplicate ${name} records were submitted.` }, { status: 400 });
  }
  const blueprint = { ...(event.blueprint ?? {}), workspaceData: parsed.data.workspace };
  const { data: saved, error: saveError } = await supabase.from("events").update({ blueprint }).eq("id", event.id).eq("user_id", user.id).eq("updated_at", parsed.data.expectedUpdatedAt).select("updated_at").maybeSingle();
  if (saveError) return NextResponse.json({ error: "Workspace changes could not be saved." }, { status: 503 });
  if (!saved) return NextResponse.json({ error: "This event changed in another session. Reload the latest version before saving." }, { status: 409 });
  return NextResponse.json({ success: true, updatedAt: saved.updated_at });
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
  let existingUpdatedAt: string | undefined;
  if (eventId) {
    const { data: existing, error: existingError } = await supabase.from("events").select("id,blueprint,updated_at").eq("id", eventId).eq("user_id", user.id).maybeSingle();
    if (existingError) return NextResponse.json({ error: "The saved event could not be checked." }, { status: 503 });
    if (!existing) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    preservedWorkspace = existing.blueprint?.workspaceData;
    existingUpdatedAt = existing.updated_at;
  }
  const blueprint = { ...payload.blueprint };
  delete blueprint.workspaceData;
  if (preservedWorkspace) blueprint.workspaceData = preservedWorkspace;
  const fields = { title: payload.title, category: payload.category, city: payload.city, date: payload.date, guest_count: payload.guestCount, total_budget: payload.totalBudget, venue_preference: payload.venuePreference || null, style_theme: payload.styleTheme || null, planning_requirements: payload.requirements, blueprint };
  const result = eventId
    ? await supabase.from("events").update(fields).eq("id", eventId).eq("user_id", user.id).eq("updated_at", existingUpdatedAt!).select("id").maybeSingle()
    : await supabase.from("events").insert({ ...fields, user_id: user.id }).select("id").single();
  if (eventId && !result.error && !result.data) return NextResponse.json({ error: "This event changed in another session. Reload it before saving the plan." }, { status: 409 });
  if (result.error || !result.data) return NextResponse.json({ error: "We could not save the plan. Check that the AI planning migration has been applied, then try again." }, { status: result.error?.code === "PGRST204" || result.error?.code === "42703" ? 503 : 500 });
  return NextResponse.json({ eventId: result.data.id });
}
