"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function BudgetShowcase() {
  const [totalBudget, setTotalBudget] = useState(5000000); // 50 Lakhs default

  const allocations = [
    { name: "Venue & Accommodations", pct: 35, color: "bg-[#173F35]" },
    { name: "Culinary & Live Counters", pct: 28, color: "bg-[#C6A66B]" },
    { name: "Haute Decor & Production", pct: 16, color: "bg-[#426B57]" },
    { name: "Cinematography & Photography", pct: 9, color: "bg-[#898D84]" },
    { name: "Entertainment & DJs", pct: 7, color: "bg-[#D4B77D]" },
    { name: "Licenses & Contingency", pct: 5, color: "bg-[#A9C7B2]" },
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-[#C6A66B] dark:text-[#D4B77D] font-bold">
            Budget Intelligence
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            Interactive Budget Allocation Calculator.
          </h2>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm sm:text-base leading-relaxed">
            Drag the budget slider to watch Evntora automatically optimize spending across the 6 core pillars of Indian celebration production.
          </p>
        </div>

        <Link
          href="/dashboard/budget"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#173F35] dark:text-[#A9C7B2] hover:text-[#0F2B24] dark:hover:text-[#F4F0E7] transition-colors group shrink-0"
        >
          <span>Open Full Budget Tracker</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xl space-y-8 max-w-5xl mx-auto">
        {/* Slider Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#77746D] dark:text-[#B5B5AA]">
              Select Total Planned Budget (INR)
            </span>
            <span className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
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
            className="w-full h-2.5 bg-[#F0EDE5] dark:bg-[#1C2520] rounded-lg appearance-none cursor-pointer accent-[#173F35] dark:accent-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139]"
          />

          <div className="flex items-center justify-between text-[11px] text-[#77746D] dark:text-[#B5B5AA] font-mono">
            <span>₹10 Lakhs (Intimate)</span>
            <span>₹50 Lakhs (Classic)</span>
            <span>₹1 Crore (Grand)</span>
            <span>₹2 Crores (Royal)</span>
          </div>
        </div>

        {/* Visual Budget Progress Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#F0EDE5] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139]">
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
                className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="text-xs font-semibold text-[#252522] dark:text-[#F4F0E7]">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#173F35] dark:text-[#A9C7B2]">{item.pct}%</span>
                </div>
                <div className="text-lg font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
                  {formatINR(amount)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-[#E8E2D7] dark:border-[#344139] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#77746D] dark:text-[#B5B5AA]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
            <span>Prevents common 20-30% wedding cost blowouts</span>
          </div>

          <Link
            href={`/planner?budget=${totalBudget}`}
            className="px-5 py-2.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Plan with this Budget</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
