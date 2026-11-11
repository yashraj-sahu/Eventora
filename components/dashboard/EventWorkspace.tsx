"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatINR } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, CalendarDays, Check, CheckSquare, ChevronDown, ChevronRight, ChevronUp, Clock3, Coins, MapPin, Pencil, Plus, Search, Sparkles, Trash2, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AIEventBlueprint } from "@/types";

type Allocation = { id: string; category: string; amount: number; notes: string };
type Expense = { id: string; title: string; category: string; amount: number; status: "planned" | "paid" | "due"; dueDate: string | null; notes: string; expenseDate?: string | null; description?: string; vendorBookingId?: string | null };
type Guest = { id: string; name: string; email?: string; phone?: string; group: string; rsvpStatus: "pending" | "invited" | "confirmed" | "declined"; dietaryPreference?: string; plusOnes: number; tableNumber?: string; notes?: string };
type Task = { id: string; title: string; category: string; stage: string; dueDate: string | null; completed: boolean; notes?: string };
type TimelineItem = { id: string; time: string; activity: string; location: string; notes: string; date?: string; startTime?: string; endTime?: string; description?: string; vendorBookingId?: string | null };
type Inspiration = { id: string; title: string; category: string; notes: string; color: string; description?: string };
type WorkspaceData = { allocations: Allocation[]; expenses: Expense[]; guests: Guest[]; tasks: Task[]; timeline: TimelineItem[]; inspiration: Inspiration[] };
type EventRecord = { id: string; user_id: string; title: string; category: string; city: string; date: string; guest_count: number; total_budget: number; venue_preference: string | null; style_theme: string | null; status: string; blueprint: Record<string, unknown> | null; planning_requirements: string | null; updated_at: string };
type Booking = { id: string; booking_reference: string; vendor_name: string; vendor_category: string; status: string; event_date: string; total_amount: number; paid_amount: number; currency: string };
type Kind = "allocations" | "expenses" | "guests" | "tasks" | "timeline" | "inspiration";
type Editor = { kind: Kind; id?: string; values: Record<string, string | number | boolean> };

const blankWorkspace: WorkspaceData = { allocations: [], expenses: [], guests: [], tasks: [], timeline: [], inspiration: [] };
const defaultCategories = ["Venue", "Catering", "Decoration", "Photography and Videography", "Entertainment", "Clothing and Makeup", "Transportation", "Accommodation", "Invitations", "Miscellaneous"];
const sections = [
  { id: "overview", label: "Overview", icon: Sparkles }, { id: "budget", label: "Budget", icon: Coins }, { id: "guests", label: "Guests", icon: Users },
  { id: "checklist", label: "Checklist", icon: CheckSquare }, { id: "timeline", label: "Run of Show", icon: Clock3 }, { id: "communication", label: "Vendors", icon: CalendarDays }, { id: "inspiration", label: "Inspiration", icon: Sparkles },
];
const fieldDefinitions: Record<Kind, Array<{ key: string; label: string; type?: string; options?: string[] }>> = {
  allocations: [{ key: "category", label: "Category" }, { key: "amount", label: "Allocated amount (₹)", type: "number" }, { key: "notes", label: "Notes", type: "textarea" }],
  expenses: [{ key: "title", label: "Expense" }, { key: "description", label: "Description", type: "textarea" }, { key: "category", label: "Category" }, { key: "amount", label: "Recorded amount (₹)", type: "number" }, { key: "expenseDate", label: "Expense date", type: "date" }, { key: "status", label: "Status", type: "select", options: ["planned", "due", "paid"] }, { key: "dueDate", label: "Due date", type: "date" }, { key: "vendorBookingId", label: "Associated event booking", type: "booking" }, { key: "notes", label: "Notes", type: "textarea" }],
  guests: [{ key: "name", label: "Name" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone" }, { key: "group", label: "Group" }, { key: "rsvpStatus", label: "RSVP", type: "select", options: ["pending", "invited", "confirmed", "declined"] }, { key: "dietaryPreference", label: "Dietary preference" }, { key: "plusOnes", label: "Accompanying guests", type: "number" }, { key: "tableNumber", label: "Table" }, { key: "notes", label: "Notes", type: "textarea" }],
  tasks: [{ key: "title", label: "Task" }, { key: "category", label: "Category" }, { key: "stage", label: "Planning stage", type: "select", options: ["Initial Planning", "Booking", "Preparation", "Final Preparation", "Other"] }, { key: "dueDate", label: "Due date", type: "date" }, { key: "notes", label: "Notes", type: "textarea" }],
  timeline: [{ key: "date", label: "Date", type: "date" }, { key: "startTime", label: "Start time", type: "time" }, { key: "endTime", label: "End time", type: "time" }, { key: "activity", label: "Activity" }, { key: "description", label: "Description", type: "textarea" }, { key: "location", label: "Location" }, { key: "vendorBookingId", label: "Associated event booking", type: "booking" }, { key: "notes", label: "Notes", type: "textarea" }],
  inspiration: [{ key: "title", label: "Idea" }, { key: "category", label: "Category", type: "select", options: ["Decoration", "Venue", "Outfits", "Food", "Photography", "Entertainment", "Other"] }, { key: "description", label: "Description", type: "textarea" }, { key: "color", label: "Color or palette" }, { key: "notes", label: "Notes or reference", type: "textarea" }],
};

function safeWorkspace(value: unknown): WorkspaceData {
  if (!value || typeof value !== "object") return blankWorkspace;
  const source = value as Partial<WorkspaceData>;
  return { allocations: Array.isArray(source.allocations) ? source.allocations : [], expenses: Array.isArray(source.expenses) ? source.expenses : [], guests: Array.isArray(source.guests) ? source.guests : [], tasks: Array.isArray(source.tasks) ? source.tasks : [], timeline: Array.isArray(source.timeline) ? source.timeline.map((item) => ({ ...item, date: item.date || undefined, startTime: item.startTime || item.time })) : [], inspiration: Array.isArray(source.inspiration) ? source.inspiration : [] };
}
function shiftClock(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const shifted = hours * 60 + mins + minutes;
  return shifted < 0 || shifted >= 1440 ? null : `${String(Math.floor(shifted / 60)).padStart(2, "0")}:${String(shifted % 60).padStart(2, "0")}`;
}

export function EventWorkspace({ eventId }: { eventId: string }) {
  const params = useSearchParams();
  const section = sections.some((item) => item.id === params.get("section")) ? params.get("section")! : "overview";
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData>(blankWorkspace);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [eventResponse, bookingResponse] = await Promise.all([
        fetch(`/api/ai/events?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" }),
        supabase.from("bookings").select("id,booking_reference,vendor_name,vendor_category,status,event_date,total_amount,paid_amount,currency").eq("event_id", eventId).eq("customer_id", user?.id ?? "").order("created_at", { ascending: false }),
      ]);
      const eventData = await eventResponse.json();
      if (!eventResponse.ok) throw new Error(eventData.error || "Event could not be loaded.");
      if (bookingResponse.error) throw new Error("Booking information is temporarily unavailable.");
      const record = eventData.event as EventRecord;
      if (record.user_id !== user?.id) throw new Error("This event is not available to this account.");
      setEvent(record);
      setWorkspace(safeWorkspace(record.blueprint?.workspaceData));
      setBookings((bookingResponse.data ?? []) as Booking[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Event workspace is unavailable."); }
    finally { setLoading(false); }
  }, [eventId, user?.id]);

  useEffect(() => { if (user) void load(); }, [load, user]);

  const updateWorkspace = async (next: WorkspaceData) => {
    if (!event || saving) return false;
    setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/ai/events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, expectedUpdatedAt: event.updated_at, workspace: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Workspace changes could not be saved.");
      setWorkspace(next); setEvent((current) => current ? { ...current, updated_at: result.updatedAt } : current); setNotice("Changes saved to this event."); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Workspace changes could not be saved."); }
    finally { setSaving(false); }
    return false;
  };

  const openEditor = (kind: Kind, item?: object) => {
    const record = item as Record<string, unknown> | undefined;
    const values: Record<string, string | number | boolean> = {};
    for (const field of fieldDefinitions[kind]) {
      const raw = record?.[field.key];
      if (kind === "timeline" && field.key === "date" && !raw) values[field.key] = event?.date ?? "";
      else if (kind === "timeline" && field.key === "startTime" && !raw) values[field.key] = record?.time as string ?? "";
      else if (kind === "guests" && field.key === "group" && !raw) values[field.key] = "Other";
      else if (kind === "guests" && field.key === "rsvpStatus" && !raw) values[field.key] = "pending";
      else if (kind === "expenses" && field.key === "status" && !raw) values[field.key] = "planned";
      else if (kind === "tasks" && field.key === "stage" && !raw) values[field.key] = "Initial Planning";
      else
      values[field.key] = typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? raw : (field.type === "number" ? 0 : "");
    }
    setEditor({ kind, id: typeof record?.id === "string" ? record.id : undefined, values });
  };

  const saveEditor = async (form: FormData) => {
    if (!editor) return;
    const item: Record<string, unknown> = { id: editor.id ?? crypto.randomUUID() };
    for (const field of fieldDefinitions[editor.kind]) {
      const raw = form.get(field.key);
      item[field.key] = field.type === "number" ? Number(raw || 0) : String(raw ?? "").trim();
    }
    if (editor.kind === "allocations") item.amount = Number(form.get("amount") || 0);
    if (editor.kind === "expenses") {
      item.amount = Number(form.get("amount") || 0); item.dueDate = item.dueDate || null; item.expenseDate = item.expenseDate || null; item.notes = item.notes || ""; item.vendorBookingId = item.vendorBookingId || null;
      if (!item.description) delete item.description;
    }
    if (editor.kind === "expenses" && !item.dueDate) item.dueDate = null;
    if (editor.kind === "tasks" && !item.dueDate) item.dueDate = null;
    if (editor.kind === "timeline") item.notes = item.notes || "";
    if (editor.kind === "expenses") item.notes = item.notes || "";
    if (editor.kind === "guests") {
      if (!item.email) delete item.email;
      if (!item.phone) delete item.phone;
      if (!item.dietaryPreference) delete item.dietaryPreference;
      if (!item.tableNumber) delete item.tableNumber;
      if (!item.notes) delete item.notes;
    }
    if (editor.kind === "tasks") item.completed = editor.id ? workspace.tasks.find((task) => task.id === editor.id)?.completed ?? false : false;
    if (editor.kind === "tasks") { item.dueDate = item.dueDate || null; if (!item.notes) delete item.notes; }
    if (editor.kind === "timeline") {
      item.time = item.startTime || "00:00"; item.location = item.location || ""; item.notes = item.notes || ""; item.vendorBookingId = item.vendorBookingId || null;
      if (!item.endTime) delete item.endTime;
      if (!item.description) delete item.description;
    }
    if (editor.kind === "inspiration") { if (!item.color) item.color = "#EAD2B0"; if (!item.description) delete item.description; }
    const current = workspace[editor.kind] as Array<{ id: string }>;
    const items = editor.id ? current.map((entry) => entry.id === editor.id ? item as never : entry) : [...current, item as never];
    const next = { ...workspace, [editor.kind]: items } as WorkspaceData;
    if (await updateWorkspace(next)) setEditor(null);
  };

  const deleteItem = async (kind: Kind, id: string) => {
    const next = { ...workspace, [kind]: (workspace[kind] as Array<{ id: string }>).filter((item) => item.id !== id) } as WorkspaceData;
    await updateWorkspace(next);
  };

  const toggleTask = async (id: string) => updateWorkspace({ ...workspace, tasks: workspace.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) });
  const shiftTimelineActivity = async (item: TimelineItem, minutes: number) => {
    const start = item.startTime || item.time;
    const nextStart = shiftClock(start, minutes);
    const nextEnd = item.endTime ? shiftClock(item.endTime, minutes) : null;
    if (!nextStart || (item.endTime && !nextEnd) || (nextEnd && nextEnd <= nextStart)) return;
    await updateWorkspace({ ...workspace, timeline: workspace.timeline.map((entry) => entry.id === item.id ? { ...entry, time: nextStart, startTime: nextStart, ...(nextEnd ? { endTime: nextEnd } : {}) } : entry) });
  };
  const totalPlanned = workspace.expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalAllocated = workspace.allocations.reduce((sum, item) => sum + item.amount, 0);
  const paidBookingPaise = bookings.reduce((sum, booking) => sum + booking.paid_amount, 0);
  const pendingTaskCount = workspace.tasks.filter((task) => !task.completed).length;
  const confirmedGuests = workspace.guests.filter((guest) => guest.rsvpStatus === "confirmed");
  const expectedAttendance = workspace.guests.filter((guest) => guest.rsvpStatus !== "declined").reduce((sum, guest) => sum + 1 + guest.plusOnes, 0);
  const overdueTasks = workspace.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10));
  const categories = [...new Set([...defaultCategories, ...workspace.allocations.map((item) => item.category), ...workspace.expenses.map((item) => item.category)])];
  const [guestSearch, setGuestSearch] = useState("");
  const [guestStatus, setGuestStatus] = useState("all");
  const [guestGroup, setGuestGroup] = useState("all");
  const uniqueGroups = [...new Set(workspace.guests.map((guest) => guest.group))];
  const filteredGuests = workspace.guests.filter((guest) => {
    const query = guestSearch.trim().toLowerCase();
    const matchesQuery = !query || [guest.name, guest.email, guest.phone, guest.group].some((value) => value?.toLowerCase().includes(query));
    return matchesQuery && (guestStatus === "all" || guest.rsvpStatus === guestStatus) && (guestGroup === "all" || guest.group === guestGroup);
  });
  const timelineItems = [...workspace.timeline].sort((a, b) => `${a.date || event?.date || ""}T${a.startTime || a.time}`.localeCompare(`${b.date || event?.date || ""}T${b.startTime || b.time}`));
  const taskSuggestions = [
    ["Decide event date", "Event", "Initial Planning"], ["Finalize approximate budget", "Budget", "Initial Planning"], ["Select event location", "Venue", "Initial Planning"],
    ["Shortlist venues", "Venue", "Booking"], ["Contact vendors", "Vendors", "Booking"], ["Finalize major bookings", "Vendors", "Booking"],
    ["Finalize guest list", "Guests", "Preparation"], ["Confirm catering", "Catering", "Preparation"], ["Finalize decoration", "Decoration", "Preparation"], ["Arrange invitations", "Invitations", "Preparation"],
    ["Confirm vendor schedules", "Vendors", "Final Preparation"], ["Verify event arrangements", "Event", "Final Preparation"], ["Complete final preparations", "Event", "Final Preparation"],
  ] as const;
  const overlaps = new Set<string>();
  for (let first = 0; first < timelineItems.length; first++) for (let second = first + 1; second < timelineItems.length; second++) {
    const a = timelineItems[first], b = timelineItems[second];
    if ((a.date || event?.date) !== (b.date || event?.date)) continue;
    const aStart = a.startTime || a.time, bStart = b.startTime || b.time;
    const aEnd = a.endTime || aStart, bEnd = b.endTime || bStart;
    if (aStart < bEnd && bStart < aEnd) { overlaps.add(a.id); overlaps.add(b.id); }
  }
  const blueprint = event?.blueprint as AIEventBlueprint | null;
  const tabHref = (id: string) => `/dashboard/events/${eventId}${id === "overview" ? "" : `?section=${id}`}`;

  if (loading) return <div role="status" className="rounded-3xl p-12 bg-white/70 dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-center">Loading this event workspace…</div>;
  if (error && !event) return <div role="alert" className="rounded-3xl p-10 bg-white/70 dark:bg-[#241918] border border-rose-300 text-center"><p className="text-rose-700 dark:text-rose-300">{error}</p><button onClick={() => void load()} className="mt-4 px-4 py-2 rounded-xl bg-[#681B1D] text-white">Try again</button></div>;
  if (!event) return null;

  return <div className="space-y-7">
    <div className="flex items-start justify-between gap-4"><div><Link href="/dashboard/events" className="inline-flex items-center gap-2 text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] mb-4"><ArrowLeft className="w-3.5 h-3.5"/>All events</Link><div className="flex flex-wrap items-center gap-2"><span className="px-2.5 py-1 rounded-full bg-[#EAD2B0]/50 text-[#681B1D] dark:text-[#EAD2B0] text-[10px] font-bold uppercase tracking-wider">{event.category}</span><span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold capitalize">{event.status}</span></div><h1 className="mt-3 text-3xl sm:text-4xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">{event.title}</h1><p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]"><span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#B77A36]"/>{event.city}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#B77A36]"/>{new Date(`${event.date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "long" })}</span><span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-[#B77A36]"/>{event.guest_count} guests</span></p></div><div className="flex gap-2"><Link href={`/dashboard/vendors?eventId=${encodeURIComponent(eventId)}&returnTo=${encodeURIComponent(`/dashboard/events/${eventId}`)}`} className="inline-flex items-center px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-white text-xs font-bold shadow-md">Discover vendors <ChevronRight className="w-4 h-4 ml-1"/></Link><Link href={`/dashboard/saved-vendors?eventId=${encodeURIComponent(eventId)}`} className="inline-flex items-center px-3 sm:px-4 py-2.5 rounded-xl border border-[#B77A36] text-[#681B1D] dark:text-[#EAD2B0] text-xs font-bold">Saved vendors</Link></div></div>

    <div className="p-2 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] flex gap-1 overflow-x-auto">{sections.map(({ id, label, icon: Icon }) => <Link key={id} href={tabHref(id)} aria-current={section === id ? "page" : undefined} className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${section === id ? "bg-[#681B1D] text-[#FFF3E3] shadow-sm" : "text-[#7D6B63] dark:text-[#D4C3B7] hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]"}`}><Icon className="w-3.5 h-3.5"/>{label}</Link>)}</div>
    {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</p>}{notice && !error && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{saving ? "Saving…" : notice}</p>}

    {section === "overview" && <div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Metric icon={Coins} label="Planned budget" value={formatINR(event.total_budget)}/><Metric icon={CalendarDays} label="Vendor bookings" value={String(bookings.length)}/><Metric icon={CheckSquare} label="Tasks to complete" value={String(pendingTaskCount)}/></div>{blueprint ? <><section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#681B1D] to-[#3f1116] text-[#FFF3E3] border border-[#B77A36]/40 shadow-lg"><div className="flex items-center gap-2 text-[#EAD2B0] text-xs font-semibold"><Sparkles className="w-4 h-4"/>Saved event blueprint</div><h2 className="mt-3 text-2xl font-serif font-bold">{blueprint.title}</h2><p className="mt-2 max-w-3xl text-sm text-[#FFF3E3]/80 leading-relaxed">{blueprint.executiveSummary}</p></section><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><section className="p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><h3 className="font-serif font-bold text-lg">Planning recommendations</h3><p className="mt-3 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{blueprint.themeAndAtmosphere?.designNotes || "Your saved plan is ready to build on."}</p>{blueprint.venueRecommendations?.slice(0, 3).map((venue, index) => <div key={index} className="mt-3 p-3 rounded-xl bg-[#FFF3E3] dark:bg-[#2E1F1E]"><p className="font-semibold text-sm">{venue.type} · {venue.city}</p><p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">Planning estimate: {venue.estimatedCost}</p></div>)}</section><section className="p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><h3 className="font-serif font-bold text-lg">Bookings linked to this event</h3>{bookings.length ? bookings.slice(0, 4).map((booking) => <BookingLine key={booking.id} booking={booking}/>) : <p className="mt-3 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">No vendor bookings are linked yet.</p>}<Link href="/dashboard/payments" className="inline-block mt-4 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">View all bookings and payments →</Link></section></div></> : <section className="p-10 text-center rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><Sparkles className="w-8 h-8 mx-auto text-[#B77A36]"/><h2 className="mt-3 text-xl font-serif font-bold">No blueprint saved yet</h2><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">You can add a blueprint from the AI planner when you are ready.</p><Link href={`/dashboard/planner?eventId=${encodeURIComponent(eventId)}&returnTo=${encodeURIComponent(`/dashboard/events/${eventId}`)}&type=${encodeURIComponent(event.category)}&city=${encodeURIComponent(event.city)}&guests=${event.guest_count}&budget=${event.total_budget}`} className="inline-flex mt-4 px-5 py-2.5 rounded-xl bg-[#681B1D] text-white text-xs font-semibold">Open AI Planner</Link></section>}</div>}

    {section === "budget" && <section className="space-y-6">
      <SectionHeader title="Budget allocation & expenses" detail="Planned allocations, recorded expenses, bookings and payments are tracked separately." onAdd={() => openEditor("expenses")} saving={saving}/>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><Metric icon={Coins} label="Planned event budget" value={formatINR(event.total_budget)}/><Metric icon={Coins} label="Allocated budget" value={formatINR(totalAllocated)}/><Metric icon={Coins} label="Expense entries" value={formatINR(totalPlanned)}/><Metric icon={Coins} label={totalPlanned > event.total_budget ? "Amount over budget" : "Remaining budget"} value={formatINR(Math.abs(event.total_budget - totalPlanned))}/></div>
      <div className="flex flex-wrap gap-2"><button disabled={saving} onClick={() => openEditor("allocations")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#B77A36] text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold"><Plus className="w-4 h-4"/>Allocate budget</button><button disabled={saving} onClick={() => openEditor("expenses")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#681B1D] text-white text-xs font-semibold"><Plus className="w-4 h-4"/>Add expense</button></div>
      <section className="p-5 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><h3 className="font-serif font-bold text-lg">Category allocations</h3>{workspace.allocations.length ? <div className="mt-3 space-y-2">{workspace.allocations.map((allocation) => { const spent = workspace.expenses.filter((expense) => expense.category === allocation.category).reduce((sum, expense) => sum + expense.amount, 0); const percent = allocation.amount ? spent / allocation.amount * 100 : 0; return <div key={allocation.id} className="p-3 rounded-xl bg-[#FFF3E3] dark:bg-[#2E1F1E]"><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{allocation.category}</span><span>{formatINR(spent)} / {formatINR(allocation.amount)} · {Math.round(percent)}%</span></div><div className="mt-2 h-2 rounded-full bg-[#EAD2B0]/70 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#681B1D] to-[#B77A36]" style={{ width: `${Math.min(percent, 100)}%` }}/></div><div className="mt-2 flex gap-3 justify-end"><SmallAction label="Edit" onClick={() => openEditor("allocations", allocation)}/><SmallAction label="Delete" danger onClick={() => void deleteItem("allocations", allocation.id)}/></div></div>; })}</div> : <EmptyInline title="Allocate your event budget" body="Add category allocations to track expenses against each part of the event."/>}</section>
      <section className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]"><div className="px-4 py-3 bg-[#EAD2B0]/30 dark:bg-[#2E1F1E] font-serif font-bold">Recorded expenses</div>{workspace.expenses.length ? workspace.expenses.map((expense) => <Row key={expense.id} title={expense.title} detail={`${expense.category} · ${expense.status}${expense.expenseDate ? ` · ${expense.expenseDate}` : ""}${expense.description ? ` · ${expense.description}` : ""}${expense.vendorBookingId ? ` · ${bookings.find((booking) => booking.id === expense.vendorBookingId)?.vendor_name || "Linked booking"}` : ""}`} amount={formatINR(expense.amount)} onEdit={() => openEditor("expenses", expense)} onDelete={() => void deleteItem("expenses", expense.id)}/>) : <EmptyInline title="No expense records" body="Add planned or recorded event expenses. This does not change payment records."/>}</section>
      <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">Confirmed bookings: {formatINR(bookings.reduce((sum, booking) => sum + booking.total_amount, 0) / 100)} · Actual payments on linked bookings: {formatINR(paidBookingPaise / 100)}. Expense status is manually tracked here and does not update the payment ledger.</p>
    </section>}

    {section === "guests" && <section className="space-y-5"><SectionHeader title="Guest management" detail="Guest records and RSVP responses are saved to this event." onAdd={() => openEditor("guests")} saving={saving}/>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3"><Metric icon={Users} label="Guest records" value={String(workspace.guests.length)}/><Metric icon={Check} label="Confirmed" value={String(confirmedGuests.length)}/><Metric icon={Clock3} label="Awaiting response" value={String(workspace.guests.filter((guest) => ["pending", "invited"].includes(guest.rsvpStatus)).length)}/><Metric icon={X} label="Declined" value={String(workspace.guests.filter((guest) => guest.rsvpStatus === "declined").length)}/><Metric icon={Users} label="Expected attendance" value={String(expectedAttendance)}/></div>
      <div className="flex flex-col sm:flex-row gap-2"><label className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6B63]"/><input value={guestSearch} onChange={(event) => setGuestSearch(event.target.value)} placeholder="Search guests" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-sm"/></label><select value={guestStatus} onChange={(event) => setGuestStatus(event.target.value)} className="rounded-xl px-3 py-2.5 bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-sm"><option value="all">All RSVP statuses</option>{["pending", "invited", "confirmed", "declined"].map((status) => <option key={status}>{status}</option>)}</select><select value={guestGroup} onChange={(event) => setGuestGroup(event.target.value)} className="rounded-xl px-3 py-2.5 bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-sm"><option value="all">All guest groups</option>{uniqueGroups.map((group) => <option key={group}>{group}</option>)}</select></div>
      <div className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">{filteredGuests.length ? filteredGuests.map((guest) => <Row key={guest.id} title={guest.name} detail={`${guest.group} · ${guest.rsvpStatus} · ${guest.plusOnes} accompanying${guest.dietaryPreference ? ` · ${guest.dietaryPreference}` : ""}${guest.tableNumber ? ` · Table ${guest.tableNumber}` : ""}${guest.notes ? ` · ${guest.notes}` : ""}`} amount={guest.email || guest.phone || ""} onEdit={() => openEditor("guests", guest)} onDelete={() => void deleteItem("guests", guest.id)}/>) : <EmptyInline title={workspace.guests.length ? "No matching guests" : "Start your guest list"} body={workspace.guests.length ? "Try a different search or filter." : "Add guests and track their responses for this event."}/>}</div>
    </section>}

    {section === "checklist" && <section className="space-y-5"><SectionHeader title="Milestone checklist" detail="Suggestions are optional. Add only the tasks that fit this event." onAdd={() => openEditor("tasks")} saving={saving}/><div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Metric icon={CheckSquare} label="Total tasks" value={String(workspace.tasks.length)}/><Metric icon={Check} label="Completed" value={String(workspace.tasks.length - pendingTaskCount)}/><Metric icon={Clock3} label="Pending" value={String(pendingTaskCount)}/><Metric icon={Clock3} label="Overdue" value={String(overdueTasks.length)}/></div><div className="p-4 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><div className="flex justify-between text-xs font-semibold"><span>Completion</span><span>{workspace.tasks.length ? Math.round((workspace.tasks.length - pendingTaskCount) / workspace.tasks.length * 100) : 0}%</span></div><div className="mt-2 h-2 rounded-full bg-[#EAD2B0]/50 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#681B1D] to-[#B77A36]" style={{ width: `${workspace.tasks.length ? (workspace.tasks.length - pendingTaskCount) / workspace.tasks.length * 100 : 0}%` }}/></div></div><div className="flex flex-wrap gap-2"><span className="text-xs self-center text-[#7D6B63]">Optional suggestions:</span>{taskSuggestions.filter(([title]) => !workspace.tasks.some((task) => task.title === title)).map(([title, category, stage]) => <button key={title} disabled={saving} onClick={() => void updateWorkspace({ ...workspace, tasks: [...workspace.tasks, { id: crypto.randomUUID(), title, category, stage, dueDate: null, completed: false }] })} className="px-3 py-2 rounded-full border border-[#EAD2B0] dark:border-[#4D3331] text-xs">+ {title}</button>)}</div><div className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">{workspace.tasks.length ? workspace.tasks.map((task) => <Row key={task.id} title={task.title} detail={`${task.category} · ${task.stage}${task.dueDate ? ` · Due ${task.dueDate}` : ""}${task.notes ? ` · ${task.notes}` : ""}`} iconAction={<button disabled={saving} onClick={() => void toggleTask(task.id)} aria-label={task.completed ? "Mark incomplete" : "Mark complete"} className={`w-8 h-8 rounded-full border flex items-center justify-center ${task.completed ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-[#B77A36] text-[#681B1D]"}`}>{task.completed ? <Check className="w-4 h-4"/> : null}</button>} onEdit={() => openEditor("tasks", task)} onDelete={() => void deleteItem("tasks", task.id)}/>) : <EmptyInline title="Plan your milestones" body="Add a task or select an optional suggestion."/>}</div>
    </section>}

    {section === "timeline" && <section className="space-y-5"><SectionHeader title="Run of show" detail="Activities are associated with dates so multi-day events can be scheduled." onAdd={() => openEditor("timeline")} saving={saving}/>{timelineItems.length ? <div className="relative ml-3 border-l-2 border-[#B77A36]/40 pl-6 space-y-3">{timelineItems.map((item) => <div key={item.id} className="relative"><span className="absolute -left-[32px] top-4 w-3 h-3 rounded-full bg-[#681B1D] border-2 border-[#EAD2B0]"/><Row title={`${item.date || event.date} · ${item.startTime || item.time}${item.endTime ? `–${item.endTime}` : ""} · ${item.activity}`} detail={`${item.location}${item.description ? ` · ${item.description}` : ""}${item.notes ? ` · ${item.notes}` : ""}${item.vendorBookingId ? ` · ${bookings.find((booking) => booking.id === item.vendorBookingId)?.vendor_name || "Linked booking"}` : ""}${overlaps.has(item.id) ? " · WARNING: overlaps another activity" : ""}`} iconAction={<div className="flex items-center"><button type="button" disabled={saving} aria-label="Move 15 minutes earlier" title="Move 15 minutes earlier" onClick={() => void shiftTimelineActivity(item, -15)} className="p-2 rounded-lg hover:bg-[#EAD2B0]/40 disabled:opacity-40"><ChevronUp className="w-4 h-4"/></button><button type="button" disabled={saving} aria-label="Move 15 minutes later" title="Move 15 minutes later" onClick={() => void shiftTimelineActivity(item, 15)} className="p-2 rounded-lg hover:bg-[#EAD2B0]/40 disabled:opacity-40"><ChevronDown className="w-4 h-4"/></button></div>} onEdit={() => openEditor("timeline", item)} onDelete={() => void deleteItem("timeline", item.id)}/></div>)}</div> : <EmptyInline title="No schedule entries yet" body="Add dated activities and times to create this event's run of show."/>}</section>}

    {section === "communication" && <section className="space-y-5"><div><h2 className="text-2xl font-serif font-bold">Vendor bookings & communication</h2><p className="mt-1 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Only real booking records linked to this event are shown. Enquiry history and messages are not implemented in the current data model.</p></div><div className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">{bookings.length ? bookings.map((booking) => <BookingLine key={booking.id} booking={booking}/>) : <EmptyInline title="No bookings for this event" body="Explore vendors and request a booking. No enquiry delivery is implied." action={<Link href={`/dashboard/vendors?eventId=${eventId}&returnTo=${encodeURIComponent(`/dashboard/events/${eventId}`)}`} className="inline-flex px-4 py-2 rounded-xl bg-[#681B1D] text-white text-xs font-semibold">Discover vendors</Link>}/>}</div></section>}

    {section === "inspiration" && <section className="space-y-5"><SectionHeader title="Event inspiration" detail="Save notes and ideas to this event. No image is implied to be saved." onAdd={() => openEditor("inspiration")} saving={saving}/>{workspace.inspiration.length ? <div className="grid sm:grid-cols-2 gap-4">{workspace.inspiration.map((idea) => <div key={idea.id} className="p-5 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><div className="flex justify-between gap-3"><div><span className="text-[10px] uppercase tracking-wider text-[#B77A36] font-bold">{idea.category}</span><h3 className="mt-1 font-serif text-lg font-bold">{idea.title}</h3></div><span className="w-8 h-8 rounded-full border border-black/10" style={{ backgroundColor: idea.color || "#EAD2B0" }}/></div>{idea.description && <p className="mt-3 text-sm">{idea.description}</p>}<p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{idea.notes}</p><div className="mt-4 flex justify-end gap-2"><SmallAction label="Edit" onClick={() => openEditor("inspiration", idea)}/><SmallAction label="Delete" danger onClick={() => void deleteItem("inspiration", idea.id)}/></div></div>)}</div> : <EmptyInline title="Create this event's moodboard" body="Add your own inspiration notes and color ideas. They are saved only after the event update succeeds."/>}</section>}
    {editor && <WorkspaceEditor editor={editor} bookings={bookings} categories={categories} eventDate={event.date} saving={saving} onClose={() => setEditor(null)} onSave={saveEditor}/>}
    {saving && <span className="sr-only" role="status">Saving event workspace…</span>}
  </div>;
}

function WorkspaceEditor({ editor, bookings, categories, eventDate, saving, onClose, onSave }: { editor: Editor; bookings: Booking[]; categories: string[]; eventDate: string; saving: boolean; onClose: () => void; onSave: (form: FormData) => Promise<void> }) {
  const optionalFields = new Set(["description", "email", "phone", "dietaryPreference", "tableNumber", "notes", "dueDate", "expenseDate", "endTime", "location", "color", "vendorBookingId"]);
  return <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm p-4 grid place-items-center"><div role="dialog" aria-modal="true" aria-labelledby="workspace-editor-title" className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl"><div className="flex items-center justify-between mb-5"><div><p className="text-[10px] uppercase tracking-wider font-bold text-[#B77A36]">{editor.id ? "Edit" : "Add"} event {editor.kind === "allocations" ? "budget allocation" : editor.kind === "expenses" ? "expense" : editor.kind === "guests" ? "guest" : editor.kind === "tasks" ? "task" : editor.kind === "timeline" ? "schedule activity" : "inspiration"}</p><h2 id="workspace-editor-title" className="mt-1 text-xl font-serif font-bold">{editor.id ? "Update details" : "New details"}</h2></div><button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-[#EAD2B0]/40"><X className="w-4 h-4"/></button></div><form onSubmit={(event) => { event.preventDefault(); void onSave(new FormData(event.currentTarget)); }} className="space-y-4">{fieldDefinitions[editor.kind].map((field) => <label key={field.key} className="block text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">{field.label}{field.type === "select" ? <select name={field.key} defaultValue={String(editor.values[field.key] || field.options?.[0] || "")} className="mt-1 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]">{typeof editor.values[field.key] === "string" && editor.values[field.key] && !field.options?.includes(String(editor.values[field.key])) && <option value={String(editor.values[field.key])}>{String(editor.values[field.key])}</option>}{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === "booking" ? <select name={field.key} defaultValue={String(editor.values[field.key] || "")} className="mt-1 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]"><option value="">No booking linked</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.vendor_name} · {booking.booking_reference} · {booking.status.replaceAll("_", " ")}</option>)}</select> : field.type === "textarea" ? <textarea required={!optionalFields.has(field.key)} name={field.key} defaultValue={String(editor.values[field.key] ?? "")} rows={3} className="mt-1 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]"/> : <input required={!optionalFields.has(field.key)} name={field.key} type={field.type || "text"} min={field.type === "number" ? (field.key === "plusOnes" ? 0 : 0.01) : undefined} max={field.key === "plusOnes" ? 20 : undefined} step={field.key === "amount" ? "0.01" : undefined} maxLength={field.key === "email" ? 254 : field.type === "number" || field.type === "date" || field.type === "time" ? undefined : 1000} defaultValue={String(editor.values[field.key] ?? (editor.kind === "timeline" && field.key === "date" ? eventDate : ""))} list={field.key === "category" && ["allocations", "expenses"].includes(editor.kind) ? "event-budget-categories" : undefined} className="mt-1 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]"/>}{field.key === "category" && ["allocations", "expenses"].includes(editor.kind) && <datalist id="event-budget-categories">{categories.map((category) => <option key={category} value={category}/>)}</datalist>}</label>)}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#EAD2B0] text-xs">Cancel</button><button disabled={saving} className="px-5 py-2 rounded-xl bg-[#681B1D] text-white text-xs font-bold disabled:opacity-50">{saving ? "Saving…" : "Save to event"}</button></div></form></div></div>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="p-5 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><Icon className="w-4 h-4 text-[#B77A36]"/><p className="mt-3 text-[11px] uppercase tracking-wider text-[#7D6B63] dark:text-[#D4C3B7]">{label}</p><p className="mt-1 text-2xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">{value}</p></div>; }
function SectionHeader({ title, detail, onAdd, saving }: { title: string; detail: string; onAdd: () => void; saving: boolean }) { return <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-2xl font-serif font-bold">{title}</h2><p className="mt-1 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{detail}</p></div><button disabled={saving} onClick={onAdd} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-white text-xs font-bold disabled:opacity-50"><Plus className="w-4 h-4"/>Add</button></div>; }
function SmallAction({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) { return <button onClick={onClick} className={`inline-flex items-center gap-1 text-xs ${danger ? "text-rose-600" : "text-[#681B1D] dark:text-[#EAD2B0]"}`}>{danger ? <Trash2 className="w-3.5 h-3.5"/> : <Pencil className="w-3.5 h-3.5"/>}{label}</button>; }
function Row({ title, detail, amount, onEdit, onDelete, iconAction }: { title: string; detail: string; amount?: string; onEdit?: () => void; onDelete?: () => void; iconAction?: React.ReactNode }) { return <div className="flex items-center gap-3 p-4 bg-[#FFFCF6] dark:bg-[#241918] border-b last:border-0 border-[#EAD2B0]/70 dark:border-[#4D3331]"><div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{title}</p><p className="mt-1 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{detail}</p></div>{amount && <span className="text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">{amount}</span>}{iconAction}{onEdit && <button aria-label="Edit" onClick={onEdit} className="p-2 rounded-lg hover:bg-[#EAD2B0]/50"><Pencil className="w-3.5 h-3.5"/></button>}{onDelete && <button aria-label="Delete" onClick={() => { if (confirm("Remove this item from the event?")) onDelete(); }} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5"/></button>}</div>; }
function EmptyInline({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) { return <div className="p-9 text-center bg-[#FFFCF6] dark:bg-[#241918] rounded-2xl"><p className="font-serif font-bold text-lg">{title}</p><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{body}</p>{action && <div className="mt-4">{action}</div>}</div>; }
function BookingLine({ booking }: { booking: Booking }) {
  const outstanding = Math.max(0, booking.total_amount - booking.paid_amount);
  const statusLabel = booking.status === "quotation_sent" ? "Quotation received" : booking.status.replaceAll("_", " ");
  const paymentLabel = booking.total_amount <= 0 ? "No agreed price yet" : booking.paid_amount <= 0 ? "Not paid" : outstanding <= 0 ? "Paid" : "Part paid";
  const workLabel = booking.status === "completed" ? "Work completed" : booking.status === "in_progress" ? "Work in progress" : "Work not marked complete";
  return <div className="grid grid-cols-2 gap-3 p-4 border-b last:border-0 border-[#EAD2B0]/70 dark:border-[#4D3331] md:grid-cols-[minmax(12rem,1.4fr)_repeat(4,minmax(6rem,.7fr))_auto] md:items-center">
    <div className="col-span-2 min-w-0 md:col-span-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#7D6B63]">Vendor</p><p className="mt-1 font-semibold text-sm">{booking.vendor_name}</p><p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{booking.booking_reference} · {booking.vendor_category} · {booking.event_date}</p></div>
    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#7D6B63]">Work</p><p className="mt-1 text-xs font-medium">{workLabel}</p></div>
    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#7D6B63]">Payment</p><p className="mt-1 text-xs font-medium">{paymentLabel}</p><p className="text-xs text-[#7D6B63]">Total {booking.total_amount > 0 ? formatINR(booking.total_amount / 100) : "Not set"}</p></div>
    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#7D6B63]">Paid</p><p className="mt-1 text-xs font-medium">{formatINR(booking.paid_amount / 100)}</p></div>
    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#7D6B63]">Remaining</p><p className="mt-1 text-xs font-medium">{booking.total_amount > 0 ? formatINR(outstanding / 100) : "Not set"}</p></div>
    <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end"><span className="px-2.5 py-1 rounded-full bg-[#EAD2B0]/50 dark:bg-[#681B1D]/40 capitalize text-[10px] font-bold">{statusLabel}</span><Link href={`/dashboard/payments?tab=bookings&bookingId=${encodeURIComponent(booking.id)}`} className="rounded-lg border border-[#681B1D] px-3 py-1.5 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">Manage</Link>{booking.total_amount > booking.paid_amount && ["awaiting_payment", "confirmed"].includes(booking.status) && <Link href={`/checkout?bookingId=${encodeURIComponent(booking.id)}`} className="rounded-lg bg-[#681B1D] px-3 py-1.5 text-xs font-semibold text-white">Pay</Link>}</div>
  </div>;
}
