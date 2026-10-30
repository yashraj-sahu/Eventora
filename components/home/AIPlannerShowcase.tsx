"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Clock,
  Utensils,
  Palette,
  Camera,
  Coins,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { generateAIBlueprint } from "@/data/sampleBlueprints";
import { formatINR } from "@/lib/utils";

export function AIPlannerShowcase() {
  const [activeTab, setActiveTab] = useState<"summary" | "timeline" | "culinary" | "decor">("summary");

  const sampleBlueprint = generateAIBlueprint({
    category: "Weddings",
    city: "Udaipur",
    date: "2026-11-20",
    guestCount: 350,
    totalBudget: 4500000,
    venuePreference: "The Oberoi Udaivilas",
    styleTheme: "Royal Mewari Heritage",
  });

  return (
    <section className="py-24 bg-[#06070a] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Event Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            See An AI Event Blueprint in Action.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every Evntora blueprint translates raw inputs—city, guest count, cultural rituals, and budget—into an actionable, hour-by-hour celebration masterplan.
          </p>
        </div>

        {/* Blueprint Simulator Card */}
        <div className="max-w-5xl mx-auto glass-panel rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-10 space-y-8">
          {/* Header of the Blueprint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400 font-semibold">
                  {sampleBlueprint.blueprintId}
                </span>
                <span className="text-xs text-slate-400">• Sample Blueprint</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-white">
                {sampleBlueprint.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-500 block">Total Budget</span>
                <span className="text-lg font-bold text-amber-400">
                  {formatINR(sampleBlueprint.recommendedBudget.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "summary"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Executive & Budget</span>
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "timeline"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Run of Show Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab("culinary")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "culinary"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Culinary & Live Counters</span>
            </button>
            <button
              onClick={() => setActiveTab("decor")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "decor"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Haute Decor & Lighting</span>
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="space-y-6 min-h-[300px]">
            {activeTab === "summary" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                  {sampleBlueprint.executiveSummary}
                </p>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Recommended Budget Distribution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sampleBlueprint.recommendedBudget.breakdown.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-300">{item.category}</span>
                          <span className="text-xs font-bold text-amber-400">{item.percentage}%</span>
                        </div>
                        <div className="text-base font-bold text-white">
                          {formatINR(item.amount)}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="text-xs text-slate-400">
                  Minute-by-minute synchronization across culinary, decor, AV, and hospitality leads:
                </div>
                <div className="space-y-3">
                  {sampleBlueprint.runOfShowTimeline.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono font-bold whitespace-nowrap">
                          {item.time}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{item.activity}</h4>
                          <span className="text-xs text-slate-400">{item.location}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                          Lead: {item.responsiblePerson}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "culinary" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                    Catering Philosophy
                  </span>
                  <p className="text-sm text-slate-200 font-medium">
                    {sampleBlueprint.culinaryStrategy.cuisineStyle}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Interactive Live Counters
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {sampleBlueprint.culinaryStrategy.recommendedCounters.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Signature Beverage Concepts
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {sampleBlueprint.culinaryStrategy.beverageHighlights.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "decor" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                      Mandap & Stage
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {sampleBlueprint.decorAndFloral.mandapOrStage}
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                      Lighting Concept
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {sampleBlueprint.decorAndFloral.lightingConcept}
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                      Color Palette
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      {sampleBlueprint.themeAndAtmosphere.colorPalette.map((col, i) => (
                        <div key={i} className="text-center">
                          <div
                            className="w-7 h-7 rounded-full border border-white/20 mx-auto shadow"
                            style={{ backgroundColor: col.hex }}
                          ></div>
                          <span className="text-[9px] text-slate-400 block mt-1">{col.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Deterministic AI Demo Engine • Exportable to Dashboard</span>
            </div>

            <Link
              href="/planner"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Build My Custom Blueprint</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

