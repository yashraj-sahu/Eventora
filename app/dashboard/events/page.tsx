"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/utils";
import type { Database } from "@/types/database";
import { Calendar, MapPin, Users, Coins, Plus, CheckCircle2, ArrowRight } from "lucide-react";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export default function MyEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.from("events").select("*").order("created_at", { ascending: false }).then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError("Your events could not be loaded. Please refresh or try again shortly.");
      else { const rows = data ?? []; setEvents(rows); setSelectedId(rows[0]?.id ?? ""); }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <div className="space-y-8 animate-in fade-in duration-200">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
      <div className="space-y-1"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20"><Calendar className="w-3.5 h-3.5"/><span>Event Portfolio</span></div><h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">My Celebrations</h1><p className="text-xs text-slate-400">Your saved Supabase event plans and workspace access</p></div>
      <Link href="/planner" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 shrink-0"><Plus className="w-4 h-4"/><span>Plan Another Celebration</span></Link>
    </div>
    {loading && <p role="status" className="p-10 text-center text-slate-300">Loading your events…</p>}
    {error && <p role="alert" className="p-10 text-center text-rose-300">{error}</p>}
    {!loading && !error && !events.length && <div className="p-12 rounded-3xl glass-card border border-white/10 text-center space-y-3"><h2 className="text-xl font-serif font-bold text-white">No saved events yet</h2><p className="text-sm text-slate-400">Create a personalized plan and save it to your account to see it here.</p><Link href="/planner" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-semibold">Open AI Planner <ArrowRight className="w-4 h-4"/></Link></div>}
    {!loading && !error && !!events.length && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{events.map((event) => {
      const isActive = selectedId === event.id;
      return <div key={event.id} className={`p-8 rounded-3xl glass-card transition-all space-y-6 flex flex-col justify-between ${isActive ? "border-2 border-amber-500/60 shadow-xl shadow-amber-500/10" : "border border-white/10 hover:border-white/20"}`}>
        <div className="space-y-3"><div className="flex items-center justify-between"><span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 text-amber-400">{event.category}</span>{isActive && <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5"/>Selected Workspace</span>}</div><h2 className="text-2xl font-serif font-bold text-white">{event.title}</h2><div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-300"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-400"/><span>{event.city}</span></div><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-400"/><span>{event.date}</span></div><div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-amber-400"/><span>{event.guest_count} Guests</span></div><div className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-400"/><span className="font-semibold text-white">{formatINR(event.total_budget)}</span></div></div></div>
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">{!isActive ? <button onClick={() => setSelectedId(event.id)} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white transition-all">Select Workspace</button> : <span className="text-xs text-slate-400">Selected event</span>}<Link href={`/dashboard/workspace?eventId=${encodeURIComponent(event.id)}`} className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"><span>Open Workspace</span><ArrowRight className="w-3.5 h-3.5"/></Link></div>
      </div>;
    })}</div>}
  </div>;
}
