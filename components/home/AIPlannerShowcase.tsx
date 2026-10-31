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
    <section className="py-24 bg-[#FAF8F3] dark:bg-[#151B18] border-y border-[#E8E2D7] dark:border-[#344139] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>AI Event Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            See An AI Event Blueprint in Action.
          </h2>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm sm:text-base leading-relaxed">
            Every Evntora blueprint translates raw inputs—city, guest count, cultural rituals, and budget—into an actionable, hour-by-hour celebration masterplan.
          </p>
        </div>

        {/* Blueprint Simulator Card */}
        <div className="max-w-5xl mx-auto bg-white dark:bg-[#232F28] rounded-3xl border border-[#E8E2D7] dark:border-[#344139] shadow-xl p-6 sm:p-10 space-y-8">
          {/* Header of the Blueprint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D7] dark:border-[#344139] pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#173F35] dark:text-[#A9C7B2] font-semibold">
                  {sampleBlueprint.blueprintId}
                </span>
                <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">• Sample Blueprint</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                {sampleBlueprint.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#77746D] dark:text-[#B5B5AA] block">Total Budget</span>
                <span className="text-xl font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
                  {formatINR(sampleBlueprint.recommendedBudget.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8E2D7] dark:border-[#344139]">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "summary"
                  ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#A9C7B2] dark:text-[#151B18] shadow-xs"
                  : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/60 dark:hover:bg-[#1C2520]"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Executive & Budget</span>
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#A9C7B2] dark:text-[#151B18] shadow-xs"
                  : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/60 dark:hover:bg-[#1C2520]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Run of Show Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab("culinary")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "culinary"
                  ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#A9C7B2] dark:text-[#151B18] shadow-xs"
                  : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/60 dark:hover:bg-[#1C2520]"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Culinary & Live Counters</span>
            </button>
            <button
              onClick={() => setActiveTab("decor")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "decor"
                  ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#A9C7B2] dark:text-[#151B18] shadow-xs"
                  : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/60 dark:hover:bg-[#1C2520]"
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
                <p className="text-sm text-[#252522] dark:text-[#F4F0E7] leading-relaxed bg-[#FAF8F3] dark:bg-[#1C2520] p-5 rounded-2xl border border-[#E8E2D7] dark:border-[#344139]">
                  {sampleBlueprint.executiveSummary}
                </p>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#173F35] dark:text-[#A9C7B2]">
                    Recommended Budget Distribution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sampleBlueprint.recommendedBudget.breakdown.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#77746D] dark:text-[#B5B5AA]">{item.category}</span>
                          <span className="text-xs font-bold text-[#173F35] dark:text-[#A9C7B2]">{item.percentage}%</span>
                        </div>
                        <div className="text-base font-serif font-bold text-[#252522] dark:text-[#F4F0E7]">
                          {formatINR(item.amount)}
                        </div>
                        <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] leading-snug">
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
                <div className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                  Minute-by-minute synchronization across culinary, decor, AV, and hospitality leads:
                </div>
                <div className="space-y-3">
                  {sampleBlueprint.runOfShowTimeline.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#173F35] dark:hover:border-[#A9C7B2] transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] border border-[#173F35]/20 text-xs font-mono font-bold whitespace-nowrap">
                          {item.time}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-[#252522] dark:text-[#F4F0E7]">{item.activity}</h4>
                          <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">{item.location}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-semibold">
                          Lead: {item.responsiblePerson}
                        </span>
                        <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] mt-1 max-w-xs">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "culinary" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold">
                    Catering Philosophy
                  </span>
                  <p className="text-sm text-[#252522] dark:text-[#F4F0E7] font-medium">
                    {sampleBlueprint.culinaryStrategy.cuisineStyle}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-3">
                    <h4 className="text-xs font-bold text-[#173F35] dark:text-[#A9C7B2] uppercase tracking-wider">
                      Interactive Live Counters
                    </h4>
                    <ul className="space-y-2 text-xs text-[#252522] dark:text-[#F4F0E7]">
                      {sampleBlueprint.culinaryStrategy.recommendedCounters.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2] shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-3">
                    <h4 className="text-xs font-bold text-[#173F35] dark:text-[#A9C7B2] uppercase tracking-wider">
                      Signature Beverage Concepts
                    </h4>
                    <ul className="space-y-2 text-xs text-[#252522] dark:text-[#F4F0E7]">
                      {sampleBlueprint.culinaryStrategy.beverageHighlights.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A66B] shrink-0 mt-0.5" />
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
                  <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
                    <span className="text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold block">
                      Mandap & Stage
                    </span>
                    <p className="text-xs text-[#252522] dark:text-[#F4F0E7] leading-relaxed">
                      {sampleBlueprint.decorAndFloral.mandapOrStage}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
                    <span className="text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold block">
                      Lighting Concept
                    </span>
                    <p className="text-xs text-[#252522] dark:text-[#F4F0E7] leading-relaxed">
                      {sampleBlueprint.decorAndFloral.lightingConcept}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
                    <span className="text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold block">
                      Color Palette
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      {sampleBlueprint.themeAndAtmosphere.colorPalette.map((col, i) => (
                        <div key={i} className="text-center">
                          <div
                            className="w-7 h-7 rounded-full border border-[#E8E2D7] dark:border-[#344139] mx-auto shadow-xs"
                            style={{ backgroundColor: col.hex }}
                          ></div>
                          <span className="text-[9px] text-[#77746D] dark:text-[#B5B5AA] block mt-1">{col.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="pt-6 border-t border-[#E8E2D7] dark:border-[#344139] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#77746D] dark:text-[#B5B5AA]">
              <ShieldCheck className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
              <span>Intelligent Event AI Architecture • Exportable to Workspace</span>
            </div>

            <Link
              href="/planner"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
