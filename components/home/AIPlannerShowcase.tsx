"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Clock,
  Utensils,
  Palette,
  Coins,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { generateAIBlueprint } from "@/data/sampleBlueprints";
import { formatINR } from "@/lib/utils";
import { TiltCard } from "@/components/motion/TiltCard";

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
    <section className="py-24 bg-[#FFF3E3] dark:bg-[#1A1211] border-y border-[#EAD2B0] dark:border-[#4D3331] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAD2B0]/40 dark:bg-[#681B1D]/40 border border-[#EAD2B0] dark:border-[#4D3331] text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#B77A36]" />
            <span>AI Event Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            See An AI Event Blueprint in Action.
          </h2>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
            Every Evntora blueprint translates raw inputs—city, guest count, cultural rituals, and budget—into an actionable, hour-by-hour celebration masterplan.
          </p>
        </div>

        {/* Blueprint Simulator Card */}
        <TiltCard className="max-w-5xl mx-auto bg-[#FFFCF6] dark:bg-[#2E1F1E] rounded-3xl border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl p-6 sm:p-10 space-y-8">
          {/* Header of the Blueprint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#681B1D] dark:text-[#EAD2B0] font-semibold">
                  {sampleBlueprint.blueprintId}
                </span>
                <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">• Sample Blueprint</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
                {sampleBlueprint.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] block">
                  Total Budget
                </span>
                <span className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                  {formatINR(sampleBlueprint.recommendedBudget.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EAD2B0] dark:border-[#4D3331]">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "summary"
                  ? "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/40"
                  : "text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624]"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Executive & Budget</span>
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/40"
                  : "text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Run of Show Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab("culinary")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "culinary"
                  ? "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/40"
                  : "text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624]"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Culinary & Live Counters</span>
            </button>
            <button
              onClick={() => setActiveTab("decor")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "decor"
                  ? "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/40"
                  : "text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624]"
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
                <p className="text-sm text-[#30221D] dark:text-[#FFF3E3] leading-relaxed bg-[#FAF3E8] dark:bg-[#1A1211] p-5 rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331]">
                  {sampleBlueprint.executiveSummary}
                </p>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0]">
                    Recommended Budget Distribution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sampleBlueprint.recommendedBudget.breakdown.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7]">{item.category}</span>
                          <span className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0]">{item.percentage}%</span>
                        </div>
                        <div className="text-base font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
                          {formatINR(item.amount)}
                        </div>
                        <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-snug">
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
                <div className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
                  Minute-by-minute synchronization across culinary, decor, AV, and hospitality leads:
                </div>

                <div className="space-y-3">
                  {sampleBlueprint.runOfShowTimeline.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#B77A36] transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#EAD2B0]/40 dark:bg-[#681B1D]/40 text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-mono font-bold whitespace-nowrap">
                          {item.time}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-[#30221D] dark:text-[#FFF3E3]">{item.activity}</h4>
                          <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{item.location}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-semibold">
                          Lead: {item.responsiblePerson}
                        </span>
                        <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] mt-1 max-w-xs">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "culinary" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold">
                    Catering Philosophy
                  </span>
                  <p className="text-sm text-[#30221D] dark:text-[#FFF3E3] font-medium">
                    {sampleBlueprint.culinaryStrategy.cuisineStyle}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
                    <h4 className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0] uppercase tracking-wider">
                      Interactive Live Counters
                    </h4>
                    <ul className="space-y-2 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                      {sampleBlueprint.culinaryStrategy.recommendedCounters.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#B77A36] shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
                    <h4 className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0] uppercase tracking-wider">
                      Signature Beverage Concepts
                    </h4>
                    <ul className="space-y-2 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                      {sampleBlueprint.culinaryStrategy.beverageHighlights.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#B77A36] shrink-0 mt-0.5" />
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
                  <div className="p-5 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
                    <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold block">
                      Mandap & Stage
                    </span>
                    <p className="text-xs text-[#30221D] dark:text-[#FFF3E3] leading-relaxed">
                      {sampleBlueprint.decorAndFloral.mandapOrStage}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
                    <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold block">
                      Lighting Concept
                    </span>
                    <p className="text-xs text-[#30221D] dark:text-[#FFF3E3] leading-relaxed">
                      {sampleBlueprint.decorAndFloral.lightingConcept}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
                    <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold block">
                      Color Palette
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      {sampleBlueprint.themeAndAtmosphere.colorPalette.map((col, i) => (
                        <div key={i} className="text-center">
                          <div
                            className="w-7 h-7 rounded-full border border-[#EAD2B0] dark:border-[#4D3331] mx-auto shadow-xs"
                            style={{ backgroundColor: col.hex }}
                          ></div>
                          <span className="text-[9px] text-[#7D6B63] dark:text-[#D4C3B7] block mt-1">{col.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="pt-6 border-t border-[#EAD2B0] dark:border-[#4D3331] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              <ShieldCheck className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
              <span>Intelligent Event AI Architecture • Exportable to Workspace</span>
            </div>

            <Link
              href="/planner"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-md border border-[#B77A36]/40 cursor-pointer"
            >
              <span>Build My Custom Blueprint</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#EAD2B0]" />
            </Link>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}
