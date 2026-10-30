"use client";

import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
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
  const { activeEvent } = useEvntoraStore();
  const bp = activeEvent?.blueprint;

  if (!bp) {
    return (
      <div className="p-16 text-center glass-card rounded-3xl space-y-4">
        <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Blueprint Attached</h2>
        <p className="text-xs text-slate-400">
          This celebration does not have a generated AI blueprint yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="p-8 rounded-3xl glass-panel border border-amber-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-amber-400">{bp.blueprintId}</span>
          <span className="text-xs text-slate-500">• Complete Event Master Blueprint</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">{bp.title}</h1>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
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
          <div className="space-y-2.5">
            {bp.recommendedBudget.breakdown.map((item, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">{item.category}</span>
                  <span className="text-[10px] text-slate-400">{item.description}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-serif font-bold text-amber-400 block">{formatINR(item.amount)}</span>
                  <span className="text-[10px] text-slate-500">{item.percentage}%</span>
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
              <div key={i} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">{v.name}</h3>
                  <span className="text-amber-400 font-semibold">{v.estimatedCost}</span>
                </div>
                <p className="text-slate-400 text-[11px]">{v.type} • Capacity: {v.capacity}</p>
                <p className="text-slate-300">{v.highlight}</p>
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
              <div key={i} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-amber-400 font-bold block">Mandap & Stage</span>
              <p className="text-slate-300">{bp.decorAndFloral.mandapOrStage}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-amber-400 font-bold block">Lighting Scheme</span>
              <p className="text-slate-300">{bp.decorAndFloral.lightingConcept}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

