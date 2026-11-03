"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/utils";
import type { Database } from "@/types/database";
import type { AIEventBlueprint } from "@/types";
import {
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Coins,
  Utensils,
  Palette,
  Clock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export default function WorkspacePage() {
  type EventRow = Database["public"]["Tables"]["events"]["Row"];
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const eventId = new URLSearchParams(window.location.search).get("eventId");
    void (async () => {
      let query = supabase.from("events").select("*").order("created_at", { ascending: false }).limit(1);
      if (eventId) query = supabase.from("events").select("*").eq("id", eventId).limit(1);
      const { data, error: loadError } = await query;
      if (!active) return;
      if (loadError) setError("Your saved event workspace could not be loaded. If this is a new deployment, apply the AI planning migration first.");
      else setActiveEvent(data?.[0] ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);
  const bp = activeEvent?.blueprint as AIEventBlueprint | null | undefined;

  if (loading) return <div role="status" className="p-16 text-center glass-card rounded-3xl text-[#D4C3B7]">Loading your saved event workspace…</div>;
  if (error) return <div role="alert" className="p-8 text-center glass-card rounded-3xl text-rose-300">{error}</div>;

  if (!bp) {
    return (
      <div className="p-16 text-center glass-card rounded-3xl space-y-4">
        <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Blueprint Attached</h2>
        <p className="text-xs text-[#D4C3B7]">
          {activeEvent ? "This saved event does not have a generated AI blueprint yet." : "No saved event plans are available in this account yet."}
        </p>
        <Link href="/planner" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-[#1A1211] text-xs font-semibold">Open AI Planner</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="p-8 rounded-3xl glass-panel border border-amber-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-amber-400">{bp.blueprintId}</span>
          <span className="text-xs text-[#9E897F]">• Complete Event Master Blueprint</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">{bp.title}</h1>
        <p className="text-sm text-[#D4C3B7] leading-relaxed bg-[#1A1211]/60 p-4 rounded-xl border border-[#4D3331]">
          {bp.executiveSummary}
        </p>
      </div>

      {/* Grid: Recommended Budget & Venues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget */}
        <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Recommended Budget Matrix ({formatINR(bp.recommendedBudget.total)})</span>
          </h2>
          <p className="text-[11px] text-[#D4C3B7]">Planning formats and rough estimates only; these are not vendor listings, quotes, or availability confirmations.</p>
          <div className="space-y-2.5">
            {bp.recommendedBudget.breakdown.map((item, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[#1A1211]/70 border border-[#4D3331] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">{item.category}</span>
                  <span className="text-[10px] text-[#D4C3B7]">{item.description}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-serif font-bold text-amber-400 block">{formatINR(item.amount)}</span>
                  <span className="text-[10px] text-[#9E897F]">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Venues */}
        <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Venue Recommendations</span>
          </h2>
          <div className="space-y-3">
            {bp.venueRecommendations.map((v, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#1A1211]/70 border border-[#4D3331] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">{v.name}</h3>
                  <span className="text-amber-400 font-semibold">{v.estimatedCost}</span>
                </div>
                <p className="text-[#D4C3B7] text-[11px]">{v.type} • Capacity: {v.capacity}</p>
                <p className="text-[#D4C3B7]">{v.highlight}</p>
                <div className="pt-2 flex items-center justify-between border-t border-[#4D3331]">
                  <span className="text-[10px] text-[#D4C3B7]">Planning idea, not a real listing or quote</span>
                  <Link href={`/vendors?city=${encodeURIComponent(activeEvent?.city ?? "")}`} className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1A1211] font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all">Find Vendors</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Culinary & Decor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Utensils className="w-4 h-4 text-amber-400" />
            <span>Culinary Strategy</span>
          </h2>
          <div className="space-y-2 text-xs">
            {bp.culinaryStrategy.recommendedCounters.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#1A1211]/70 border border-[#4D3331] flex items-center gap-2 text-[#D4C3B7]">
                <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Aesthetic & Lighting</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-[#1A1211]/70 border border-[#4D3331] space-y-1">
              <span className="text-amber-400 font-bold block">Mandap & Stage</span>
              <p className="text-[#D4C3B7]">{bp.decorAndFloral.mandapOrStage}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1A1211]/70 border border-[#4D3331] space-y-1">
              <span className="text-amber-400 font-bold block">Lighting Scheme</span>
              <p className="text-[#D4C3B7]">{bp.decorAndFloral.lightingConcept}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

