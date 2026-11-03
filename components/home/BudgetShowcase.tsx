"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function BudgetShowcase() {
  const [totalBudget, setTotalBudget] = useState(5000000); // 50 Lakhs default

  const allocations = [
    { name: "Venue & Accommodations", pct: 35, color: "bg-[#681B1D]" },
    { name: "Culinary & Live Counters", pct: 28, color: "bg-[#B77A36]" },
    { name: "Haute Decor & Production", pct: 16, color: "bg-[#4B1117]" },
    { name: "Cinematography & Photography", pct: 9, color: "bg-[#A84F2D]" },
    { name: "Entertainment & DJs", pct: 7, color: "bg-[#EAD2B0]" },
    { name: "Licenses & Contingency", pct: 5, color: "bg-[#59453E]" },
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
            <span className="w-6 h-[1px] bg-[#B77A36]" />
            <span>Budget Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Interactive Budget Allocation Calculator.
          </h2>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
            Drag the budget slider to watch Evntora automatically optimize spending across the 6 core pillars of Indian royal celebration production.
          </p>
        </div>

        <Link
          href="/dashboard/budget"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:text-[#4B1117] dark:hover:text-[#FFF3E3] transition-colors group shrink-0"
        >
          <span>Open Full Budget Tracker</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl space-y-8 max-w-5xl mx-auto">
        {/* Slider Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0]">
              Select Total Planned Budget (INR)
            </span>
            <span className="text-3xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
              {formatINR(totalBudget)}
            </span>
          </div>

          <input
            type="range"
            min="1000000"
            max="20000000"
            step="500000"
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value))}
            className="w-full h-2.5 bg-[#FAF3E8] dark:bg-[#1A1211] rounded-lg appearance-none cursor-pointer accent-[#681B1D] dark:accent-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331]"
          />

          <div className="flex items-center justify-between text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] font-mono">
            <span>₹10 Lakhs (Intimate)</span>
            <span>₹50 Lakhs (Classic)</span>
            <span>₹1 Crore (Grand)</span>
            <span>₹2 Crores (Royal)</span>
          </div>
        </div>

        {/* Visual Budget Progress Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331]">
          {allocations.map((item, i) => (
            <div
              key={i}
              style={{ width: `${item.pct}%` }}
              className={`${item.color} h-full transition-all duration-300`}
              title={`${item.name}: ${item.pct}%`}
            ></div>
          ))}
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allocations.map((item, i) => {
            const amount = Math.round((totalBudget * item.pct) / 100);
            return (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/90 dark:bg-[#1A1211]/90 border border-[#EAD2B0] dark:border-[#4D3331] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="text-xs font-semibold text-[#30221D] dark:text-[#FFF3E3]">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0]">{item.pct}%</span>
                </div>
                <div className="text-base font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
                  {formatINR(amount)}
                </div>
                <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-snug">
                  Calibrated for top 1% verified artisans and premium production standards.
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer Disclaimer */}
        <div className="pt-4 border-t border-[#EAD2B0] dark:border-[#4D3331] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
            <span>Actual vendor quotes reflect dynamic seasonal availability and tax rates.</span>
          </div>

          <Link
            href="/planner"
            className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0] hover:underline flex items-center gap-1"
          >
            <span>Generate Personalized Budget</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
