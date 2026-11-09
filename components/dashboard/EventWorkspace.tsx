"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatINR } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, CalendarDays, Check, CheckSquare, ChevronRight, Clock3, Coins, MapPin, Pencil, Plus, Sparkles, Trash2, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AIEventBlueprint } from "@/types";

type Expense = { id: string; title: string; category: string; amount: number; status: "planned" | "paid" | "due"; dueDate: string | null; notes: string };
type Guest = { id: string; name: string; email?: string; phone?: string; group: string; rsvpStatus: "pending" | "confirmed" | "declined"; dietaryPreference?: string; plusOnes: number; tableNumber?: string };
type Task = { id: string; title: string; category: string; stage: string; dueDate: string | null; completed: boolean };
type TimelineItem = { id: string; time: string; activity: string; location: string; notes: string };
type Inspiration = { id: string; title: string; category: string; notes: string; color: string };
type WorkspaceData = { expenses: Expense[]; guests: Guest[]; tasks: Task[]; timeline: TimelineItem[]; inspiration: Inspiration[] };
type EventRecord = { id: string; user_id: string; title: string; category: string; city: string; date: string; guest_count: number; total_budget: number; venue_preference: string | null; style_theme: string | null; status: string; blueprint: Record<string, unknown> | null; planning_requirements: string | null };
type Booking = { id: string; booking_reference: string; vendor_name: string; vendor_category: string; status: string; event_date: string; total_amount: number; paid_amount: number; currency: string };
type Kind = "expenses" | "guests" | "tasks" | "timeline" | "inspiration";
type Editor = { kind: Kind; id?: string; values: Record<string, string | number | boolean> };

const blankWorkspace: WorkspaceData = { expenses: [], guests: [], tasks: [], timeline: [], inspiration: [] };
const sections = [
  { id: "overview", label: "Overview", icon: Sparkles }, { id: "budget", label: "Budget", icon: Coins }, { id: "guests", label: "Guests", icon: Users },
  { id: "checklist", label: "Checklist", icon: CheckSquare }, { id: "timeline", label: "Run of Show", icon: Clock3 }, { id: "communication", label: "Bookings", icon: CalendarDays }, { id: "inspiration", label: "Inspiration", icon: Sparkles },
];
const fieldDefinitions: Record<Kind, Array<{ key: string; label: string; type?: string; options?: string[] }>> = {
  expenses: [{ key: "title", label: "Expense" }, { key: "category", label: "Category" }, { key: "amount", label: "Planned amount (₹)", type: "number" }, { key: "status", label: "Planning status", type: "select", options: ["planned", "paid", "due"] }, { key: "dueDate", label: "Due date", type: "date" }, { key: "notes", label: "Notes", type: "textarea" }],
  guests: [{ key: "name", label: "Name" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone" }, { key: "group", label: "Group" }, { key: "rsvpStatus", label: "RSVP", type: "select", options: ["pending", "confirmed", "declined"] }, { key: "dietaryPreference", label: "Dietary preference" }, { key: "plusOnes", label: "Plus ones", type: "number" }, { key: "tableNumber", label: "Table" }],
  tasks: [{ key: "title", label: "Task" }, { key: "category", label: "Category" }, { key: "stage", label: "Planning stage" }, { key: "dueDate", label: "Due date", type: "date" }],
  timeline: [{ key: "time", label: "Start time", type: "time" }, { key: "activity", label: "Activity" }, { key: "location", label: "Location" }, { key: "notes", label: "Notes", type: "textarea" }],
  inspiration: [{ key: "title", label: "Idea" }, { key: "category", label: "Category" }, { key: "color", label: "Color or palette" }, { key: "notes", label: "Notes or reference", type: "textarea" }],
};
const sectionKind: Partial<Record<string, Kind>> = { budget: "expenses", guests: "guests", checklist: "tasks", timeline: "timeline", inspiration: "inspiration" };

function safeWorkspace(value: unknown): WorkspaceData {
  if (!value || typeof value !== "object") return blankWorkspace;
  const source = value as Partial<WorkspaceData>;
  return { expenses: Array.isArray(source.expenses) ? source.expenses : [], guests: Array.isArray(source.guests) ? source.guests : [], tasks: Array.isArray(source.tasks) ? source.tasks : [], timeline: Array.isArray(source.timeline) ? source.timeline : [], inspiration: Array.isArray(source.inspiration) ? source.inspiration : [] };
}

export function EventWorkspace({ eventId }: { eventId: string }) {
  const router = useRouter();
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
        supabase.from("bookings").select("id,booking_reference,vendor_name,vendor_category,status,event_date,total_amount,paid_amount,currency").eq("event_id", eventId).order("created_at", { ascending: false }),
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
    setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/ai/events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, workspace: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Workspace changes could not be saved.");
      setWorkspace(next); setNotice("Saved to this event");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Workspace changes could not be saved."); }
    finally { setSaving(false); }
  };

  const openEditor = (kind: Kind, item?: object) => {
    const record = item as Record<string, unknown> | undefined;
    const values: Record<string, string | number | boolean> = {};
    for (const field of fieldDefinitions[kind]) {
      const raw = record?.[field.key];
      values[field.key] = typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? raw : (field.type === "number" ? 0 : "");
    }
    setEditor({ kind, id: typeof record?.id === "string" ? record.id : undefined, values });
  };

  const saveEditor = async (form: FormData) => {
    if (!editor) return;
    const item: Record<string, unknown> = { id: editor.id ?? crypto.randomUUID() };
    for (const field of fieldDefinitions[editor.kind]) {
      const raw = form.get(field.key);
      item[field.key] = field.type === "number" ? Number(raw || 0) : String(raw ?? "");
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
    }
    if (editor.kind === "tasks") item.completed = editor.id ? workspace.tasks.find((task) => task.id === editor.id)?.completed ?? false : false;
    const current = workspace[editor.kind] as Array<{ id: string }>;
    const items = editor.id ? current.map((entry) => entry.id === editor.id ? item as never : entry) : [...current, item as never];
    const next = { ...workspace, [editor.kind]: items } as WorkspaceData;
    setEditor(null);
    await updateWorkspace(next);
  };

  const deleteItem = async (kind: Kind, id: string) => {
    const next = { ...workspace, [kind]: (workspace[kind] as Array<{ id: string }>).filter((item) => item.id !== id) } as WorkspaceData;
    await updateWorkspace(next);
  };

  const toggleTask = async (id: string) => updateWorkspace({ ...workspace, tasks: workspace.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) });
  const totalPlanned = workspace.expenses.reduce((sum, item) => sum + item.amount, 0);
  const paidBookingPaise = bookings.reduce((sum, booking) => sum + booking.paid_amount, 0);
  const pendingTaskCount = workspace.tasks.filter((task) => !task.completed).length;
  const blueprint = event?.blueprint as AIEventBlueprint | null;
  const selectedSectionTitle = sections.find((item) => item.id === section)?.label ?? "Overview";
  const tabHref = (id: string) => `/dashboard/events/${eventId}${id === "overview" ? "" : `?section=${id}`}`;

  if (loading) return <div role="status" className="rounded-3xl p-12 bg-white/70 dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-center">Loading this event workspace…</div>;
  if (error && !event) return <div role="alert" className="rounded-3xl p-10 bg-white/70 dark:bg-[#241918] border border-rose-300 text-center"><p className="text-rose-700 dark:text-rose-300">{error}</p><button onClick={() => void load()} className="mt-4 px-4 py-2 rounded-xl bg-[#681B1D] text-white">Try again</button></div>;
  if (!event) return null;

  const kind = sectionKind[section];
  const heading = kind ? ({ expenses: "Budget allocation & expenses", guests: "Guest management", tasks: "Milestone checklist", timeline: "Run of show", inspiration: "Event inspiration" } as const)[kind] : selectedSectionTitle;
  return <div className="space-y-7">
    <div className="flex items-start justify-between gap-4"><div><Link href="/dashboard/events" className="inline-flex items-center gap-2 text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] mb-4"><ArrowLeft className="w-3.5 h-3.5"/>All events</Link><div className="flex flex-wrap items-center gap-2"><span className="px-2.5 py-1 rounded-full bg-[#EAD2B0]/50 text-[#681B1D] dark:text-[#EAD2B0] text-[10px] font-bold uppercase tracking-wider">{event.category}</span><span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold capitalize">{event.status}</span></div><h1 className="mt-3 text-3xl sm:text-4xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">{event.title}</h1><p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]"><span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#B77A36]"/>{event.city}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#B77A36]"/>{new Date(`${event.date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "long" })}</span><span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-[#B77A36]"/>{event.guest_count} guests</span></p></div><Link href={`/vendors?eventId=${encodeURIComponent(eventId)}`} className="hidden sm:inline-flex px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-white text-xs font-bold shadow-md">Find vendors <ChevronRight className="w-4 h-4 ml-1"/></Link></div>

    <div className="p-2 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] flex gap-1 overflow-x-auto">{sections.map(({ id, label, icon: Icon }) => <Link key={id} href={tabHref(id)} aria-current={section === id ? "page" : undefined} className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${section === id ? "bg-[#681B1D] text-[#FFF3E3] shadow-sm" : "text-[#7D6B63] dark:text-[#D4C3B7] hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]"}`}><Icon className="w-3.5 h-3.5"/>{label}</Link>)}</div>
    {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</p>}{notice && !error && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{saving ? "Saving…" : notice}</p>}

    {section === "overview" && <div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Metric icon={Coins} label="Planned budget" value={formatINR(event.total_budget)}/><Metric icon={CalendarDays} label="Vendor bookings" value={String(bookings.length)}/><Metric icon={CheckSquare} label="Tasks to complete" value={String(pendingTaskCount)}/></div>{blueprint ? <><section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#681B1D] to-[#3f1116] text-[#FFF3E3] border border-[#B77A36]/40 shadow-lg"><div className="flex items-center gap-2 text-[#EAD2B0] text-xs font-semibold"><Sparkles className="w-4 h-4"/>Saved event blueprint</div><h2 className="mt-3 text-2xl font-serif font-bold">{blueprint.title}</h2><p className="mt-2 max-w-3xl text-sm text-[#FFF3E3]/80 leading-relaxed">{blueprint.executiveSummary}</p></section><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><section className="p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><h3 className="font-serif font-bold text-lg">Planning recommendations</h3><p className="mt-3 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{blueprint.themeAndAtmosphere?.designNotes || "Your saved plan is ready to build on."}</p>{blueprint.venueRecommendations?.slice(0, 3).map((venue, index) => <div key={index} className="mt-3 p-3 rounded-xl bg-[#FFF3E3] dark:bg-[#2E1F1E]"><p className="font-semibold text-sm">{venue.type} · {venue.city}</p><p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">Planning estimate: {venue.estimatedCost}</p></div>)}</section><section className="p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><h3 className="font-serif font-bold text-lg">Bookings linked to this event</h3>{bookings.length ? bookings.slice(0, 4).map((booking) => <BookingLine key={booking.id} booking={booking}/>) : <p className="mt-3 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">No vendor bookings are linked yet.</p>}<Link href="/dashboard/payments" className="inline-block mt-4 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">View all bookings and payments →</Link></section></div></> : <section className="p-10 text-center rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><Sparkles className="w-8 h-8 mx-auto text-[#B77A36]"/><h2 className="mt-3 text-xl font-serif font-bold">No blueprint saved yet</h2><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">You can add a blueprint from the AI planner when you are ready.</p><Link href={`/planner?type=${encodeURIComponent(event.category)}&city=${encodeURIComponent(event.city)}&guests=${event.guest_count}&budget=${event.total_budget}`} className="inline-flex mt-4 px-5 py-2.5 rounded-xl bg-[#681B1D] text-white text-xs font-semibold">Open AI Planner</Link></section>}</div>}

    {section === "budget" && <section className="space-y-5"><SectionHeader title="Budget allocation & expenses" detail="Planned expenses are estimates you entered. Confirmed charges and payments are tracked separately below." onAdd={() => openEditor("expenses")} saving={saving}/><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Metric icon={Coins} label="Total planned budget" value={formatINR(event.total_budget)}/><Metric icon={Coins} label="Planned expenses" value={formatINR(totalPlanned)}/><Metric icon={Coins} label="Paid on linked bookings" value={formatINR(paidBookingPaise / 100)}/></div><div className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">{workspace.expenses.length ? workspace.expenses.map((expense) => <Row key={expense.id} title={expense.title} detail={`${expense.category} · ${expense.status}${expense.dueDate ? ` · Due ${expense.dueDate}` : ""}`} amount={formatINR(expense.amount)} onEdit={() => openEditor("expenses", expense)} onDelete={() => void deleteItem("expenses", expense.id)}/>) : <EmptyInline title="No planned expenses" body="Add estimates to organize your event budget. These entries are not vendor charges."/>}</div><p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">Confirmed bookings: {formatINR(bookings.reduce((sum, b) => sum + b.total_amount, 0) / 100)} · Outstanding booking balances are shown in Bookings & Payments.</p></section>}

    {section === "guests" && <section className="space-y-5"><SectionHeader title="Guest management" detail={`${workspace.guests.length} guest records for this event`} onAdd={() => openEditor("guests")} saving={saving}/><div className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">{workspace.guests.length ? workspace.guests.map((guest) => <Row key={guest.id} title={guest.name} detail={`${guest.group} · ${guest.rsvpStatus} · ${guest.plusOnes} plus ones${guest.dietaryPreference ? ` · ${guest.dietaryPreference}` : ""}${guest.tableNumber ? ` · Table ${guest.tableNumber}` : ""}`} amount={guest.email || guest.phone || ""} onEdit={() => openEditor("guests", guest)} onDelete={() => void deleteItem("guests", guest.id)}/>) : <EmptyInline title="Start your guest list" body="Guest details are saved privately with this event."/>}</div></section>}

    {section === "checklist" && <section className="space-y-5"><SectionHeader title="Milestone checklist" detail={`${workspace.tasks.filter((task) => task.completed).length} of ${workspace.tasks.length} complete`} onAdd={() => openEditor("tasks")} saving={saving}/><div className="h-2 rounded-full bg-[#EAD2B0]/50 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#681B1D] to-[#B77A36]" style={{ width: `${workspace.tasks.length ? workspace.tasks.filter((task) => task.completed).length / workspace.tasks.length * 100 : 0}%` }}/></div><div className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">{workspace.tasks.length ? workspace.tasks.map((task) => <Row key={task.id} title={task.title} detail={`${task.category} · ${task.stage}${task.dueDate ? ` · Due ${task.dueDate}` : ""}`} iconAction={<button onClick={() => void toggleTask(task.id)} aria-label={task.completed ? "Mark incomplete" : "Mark complete"} className={`w-8 h-8 rounded-full border flex items-center justify-center ${task.completed ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-[#B77A36] text-[#681B1D]"}`}>{task.completed ? <Check className="w-4 h-4"/> : null}</button>} onEdit={() => openEditor("tasks", task)} onDelete={() => void deleteItem("tasks", task.id)}/>) : <EmptyInline title="Plan your milestones" body="Add tasks and track progress for this event only."/>}</div></section>}

    {section === "timeline" && <section className="space-y-5"><SectionHeader title="Run of show" detail="Build an event-day schedule tied to this celebration." onAdd={() => openEditor("timeline")} saving={saving}/>{workspace.timeline.length ? <div className="relative ml-3 border-l-2 border-[#B77A36]/40 pl-6 space-y-3">{[...workspace.timeline].sort((a, b) => a.time.localeCompare(b.time)).map((item) => <div key={item.id} className="relative"><span className="absolute -left-[32px] top-4 w-3 h-3 rounded-full bg-[#681B1D] border-2 border-[#EAD2B0]"/><Row title={`${item.time} · ${item.activity}`} detail={`${item.location}${item.notes ? ` · ${item.notes}` : ""}`} onEdit={() => openEditor("timeline", item)} onDelete={() => void deleteItem("timeline", item.id)}/></div>)}</div> : <EmptyInline title="No schedule entries yet" body="Add event-day activities, times and locations."/>}</section>}

    {section === "communication" && <section className="space-y-5"><div><h2 className="text-2xl font-serif font-bold">Vendor bookings & communication</h2><p className="mt-1 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Only saved bookings linked to this event are shown. Vendor enquiries and message history are not available in the current data model.</p></div><div className="rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">{bookings.length ? bookings.map((booking) => <BookingLine key={booking.id} booking={booking}/>) : <EmptyInline title="No bookings for this event" body="Explore vendors and open their profile to request a booking." action={<Link href={`/vendors?eventId=${eventId}`} className="inline-flex px-4 py-2 rounded-xl bg-[#681B1D] text-white text-xs font-semibold">Discover vendors</Link>}/>}</div></section>}

    {section === "inspiration" && <section className="space-y-5"><SectionHeader title="Event inspiration" detail="Save notes and palette ideas to this event. No third-party images are represented as saved." onAdd={() => openEditor("inspiration")} saving={saving}/>{workspace.inspiration.length ? <div className="grid sm:grid-cols-2 gap-4">{workspace.inspiration.map((idea) => <div key={idea.id} className="p-5 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><div className="flex justify-between gap-3"><div><span className="text-[10px] uppercase tracking-wider text-[#B77A36] font-bold">{idea.category}</span><h3 className="mt-1 font-serif text-lg font-bold">{idea.title}</h3></div><span className="w-8 h-8 rounded-full border border-black/10" style={{ backgroundColor: idea.color || "#EAD2B0" }}/></div><p className="mt-3 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{idea.notes}</p><div className="mt-4 flex justify-end gap-2"><SmallAction label="Edit" onClick={() => openEditor("inspiration", idea)}/><SmallAction label="Remove" danger onClick={() => void deleteItem("inspiration", idea.id)}/></div></div>)}</div> : <EmptyInline title="Create this event’s moodboard" body="Add your own inspiration notes and color ideas. Nothing is prefilled or implied to be saved."/>}</section>}

    {editor && <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm p-4 grid place-items-center"><div role="dialog" aria-modal="true" aria-labelledby="workspace-editor-title" className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl"><div className="flex items-center justify-between mb-5"><h2 id="workspace-editor-title" className="text-xl font-serif font-bold">{editor.id ? "Edit" : "Add"} {editor.kind === "expenses" ? "expense" : editor.kind === "guests" ? "guest" : editor.kind === "tasks" ? "task" : editor.kind === "timeline" ? "schedule entry" : "inspiration"}</h2><button onClick={() => setEditor(null)} aria-label="Close" className="p-2 rounded-xl hover:bg-[#EAD2B0]/40"><X className="w-4 h-4"/></button></div><form action={(form) => void saveEditor(form)} className="space-y-4">{fieldDefinitions[editor.kind].map((field) => <label key={field.key} className="block text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">{field.label}{field.type === "select" ? <select name={field.key} defaultValue={String(editor.values[field.key] || field.options?.[0])} className="mt-1 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]">{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : field.type === "textarea" ? <textarea name={field.key} defaultValue={String(editor.values[field.key] ?? "")} rows={3} className="mt-1 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]"/> : <input required={!(["email", "phone", "dietaryPreference", "tableNumber", "dueDate", "color"].includes(field.key))} name={field.key} type={field.type || "text"} min={field.type === "number" ? 0 : undefined} step={field.key === "amount" ? "0.01" : undefined} defaultValue={String(editor.values[field.key] ?? "")} className="mt-1 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]"/>}</label>)}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditor(null)} className="px-4 py-2 rounded-xl border border-[#EAD2B0] text-xs">Cancel</button><button disabled={saving} className="px-5 py-2 rounded-xl bg-[#681B1D] text-white text-xs font-bold disabled:opacity-50">{saving ? "Saving…" : "Save to event"}</button></div></form></div></div>}
    {saving && <span className="sr-only" role="status">Saving event workspace…</span>}
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="p-5 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><Icon className="w-4 h-4 text-[#B77A36]"/><p className="mt-3 text-[11px] uppercase tracking-wider text-[#7D6B63] dark:text-[#D4C3B7]">{label}</p><p className="mt-1 text-2xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">{value}</p></div>; }
function SectionHeader({ title, detail, onAdd, saving }: { title: string; detail: string; onAdd: () => void; saving: boolean }) { return <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-2xl font-serif font-bold">{title}</h2><p className="mt-1 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{detail}</p></div><button disabled={saving} onClick={onAdd} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-white text-xs font-bold disabled:opacity-50"><Plus className="w-4 h-4"/>Add</button></div>; }
function SmallAction({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) { return <button onClick={onClick} className={`inline-flex items-center gap-1 text-xs ${danger ? "text-rose-600" : "text-[#681B1D] dark:text-[#EAD2B0]"}`}>{danger ? <Trash2 className="w-3.5 h-3.5"/> : <Pencil className="w-3.5 h-3.5"/>}{label}</button>; }
function Row({ title, detail, amount, onEdit, onDelete, iconAction }: { title: string; detail: string; amount?: string; onEdit?: () => void; onDelete?: () => void; iconAction?: React.ReactNode }) { return <div className="flex items-center gap-3 p-4 bg-[#FFFCF6] dark:bg-[#241918] border-b last:border-0 border-[#EAD2B0]/70 dark:border-[#4D3331]"><div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{title}</p><p className="mt-1 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{detail}</p></div>{amount && <span className="text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">{amount}</span>}{iconAction}{onEdit && <button aria-label="Edit" onClick={onEdit} className="p-2 rounded-lg hover:bg-[#EAD2B0]/50"><Pencil className="w-3.5 h-3.5"/></button>}{onDelete && <button aria-label="Delete" onClick={() => { if (confirm("Remove this item from the event?")) onDelete(); }} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5"/></button>}</div>; }
function EmptyInline({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) { return <div className="p-9 text-center bg-[#FFFCF6] dark:bg-[#241918] rounded-2xl"><p className="font-serif font-bold text-lg">{title}</p><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">{body}</p>{action && <div className="mt-4">{action}</div>}</div>; }
function BookingLine({ booking }: { booking: Booking }) { return <div className="p-4 border-b last:border-0 border-[#EAD2B0]/70 dark:border-[#4D3331] flex items-center justify-between gap-3"><div><p className="font-semibold text-sm">{booking.vendor_name}</p><p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{booking.booking_reference} · {booking.vendor_category} · {booking.event_date}</p></div><span className="px-2.5 py-1 rounded-full bg-[#EAD2B0]/50 dark:bg-[#681B1D]/40 capitalize text-[10px] font-bold">{booking.status.replaceAll("_", " ")}</span></div>; }
