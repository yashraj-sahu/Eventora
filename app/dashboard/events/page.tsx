"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, CalendarDays, MapPin, Users, Coins, ArrowRight, Plus, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/utils";

type EventItem = { id: string; title: string; category: string; city: string; date: string; guest_count: number; total_budget: number; status: string; blueprint: Record<string, unknown> | null; created_at: string };

export default function MyEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/ai/events", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your events could not be loaded.");
      if (active) setEvents(data.events ?? []);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Your events could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const statusOptions = useMemo(() => ["all", ...Array.from(new Set(events.map((event) => event.status || "planning")))], [events]);
  const filtered = events.filter((event) => `${event.title} ${event.category} ${event.city}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || event.status === status));

  return <div className="space-y-8">
    <section className="relative overflow-hidden p-7 sm:p-9 rounded-[28px] bg-gradient-to-br from-[#681B1D] via-[#56151A] to-[#321016] text-[#FFF3E3] border border-[#B77A36]/40 shadow-xl">
      <div className="absolute -right-8 -top-10 w-56 h-56 rounded-full border border-[#EAD2B0]/10"/><div className="absolute right-12 -bottom-24 w-56 h-56 rounded-full border border-[#EAD2B0]/10"/>
      <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6"><div><span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#EAD2B0] border border-[#EAD2B0]/25 text-[10px] font-bold uppercase tracking-[.18em]"><Sparkles className="w-3.5 h-3.5"/>Your celebrations</span><h1 className="mt-4 text-3xl sm:text-4xl font-serif font-bold">My Events</h1><p className="mt-2 text-sm text-[#FFF3E3]/75">Every celebration has its own plan, budget and workspace.</p></div><Link href="/planner" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#EAD2B0] text-[#4B1117] text-xs font-bold shadow-md hover:bg-white transition-colors"><Plus className="w-4 h-4"/>Plan an Event</Link></div>
    </section>

    {events.length > 0 && <div className="grid sm:grid-cols-[1fr_auto] gap-3"><label className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D6B63]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, category or location" className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-sm"/></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter events by status" className="px-4 py-3 rounded-xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-sm">{statusOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All statuses" : option.replaceAll("_", " ")}</option>)}</select></div>}

    {loading ? <div role="status" className="p-12 rounded-3xl text-center bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]">Loading your events…</div> : error ? <div role="alert" className="p-10 rounded-3xl text-center bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200">{error}<button onClick={() => window.location.reload()} className="block mx-auto mt-3 underline">Try again</button></div> : events.length === 0 ? <div className="p-12 sm:p-16 rounded-3xl text-center bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><CalendarDays className="w-10 h-10 mx-auto text-[#B77A36]"/><h2 className="mt-4 text-2xl font-serif font-bold">Your next celebration starts here</h2><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Create an event plan to open a dedicated workspace for it.</p><Link href="/planner" className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-[#681B1D] text-white text-xs font-bold">Plan an Event</Link></div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-[#7D6B63]">No events match those filters.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{filtered.map((event) => <article key={event.id} className="group overflow-hidden rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"><div className="h-1.5 bg-gradient-to-r from-[#681B1D] via-[#B77A36] to-[#EAD2B0]"/><div className="p-6 space-y-5"><div className="flex items-center justify-between gap-2"><span className="px-2.5 py-1 rounded-full bg-[#EAD2B0]/50 text-[#681B1D] dark:text-[#EAD2B0] text-[10px] font-bold uppercase tracking-wider">{event.category}</span><span className="px-2.5 py-1 rounded-full bg-[#F3EEE6] dark:bg-[#2E1F1E] text-[#7D6B63] dark:text-[#D4C3B7] text-[10px] font-semibold capitalize">{event.status.replaceAll("_", " ")}</span></div><div><h2 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] group-hover:text-[#681B1D] dark:group-hover:text-[#EAD2B0] transition-colors">{event.title}</h2><div className="mt-4 grid grid-cols-2 gap-y-3 text-xs text-[#7D6B63] dark:text-[#D4C3B7]"><span className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-[#B77A36]"/>{new Date(`${event.date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span><span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#B77A36]"/>{event.city}</span><span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-[#B77A36]"/>{event.guest_count} guests</span><span className="flex items-center gap-2"><Coins className="w-3.5 h-3.5 text-[#B77A36]"/>{formatINR(event.total_budget)}</span></div></div><Link href={`/dashboard/events/${event.id}`} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold transition-colors">Open Event Workspace<ArrowRight className="w-4 h-4"/></Link></div></article>)}</div>}
  </div>;
}
