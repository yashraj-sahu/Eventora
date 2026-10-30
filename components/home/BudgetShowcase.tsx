"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, ArrowRight, Coins, ShieldCheck, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function BudgetShowcase() {
  const [totalBudget, setTotalBudget] = useState(5000000); // 50 Lakhs default

  const allocations = [
    { name: "Venue & Accommodations", pct: 35, color: "bg-amber-400" },
    { name: "Culinary & Live Counters", pct: 28, color: "bg-emerald-400" },
    { name: "Haute Decor & Production", pct: 16, color: "bg-indigo-400" },
    { name: "Cinematography & Photography", pct: 9, color: "bg-rose-400" },
    { name: "Entertainment & DJs", pct: 7, color: "bg-purple-400" },
    { name: "Licenses & Contingency", pct: 5, color: "bg-slate-400" },
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
            Budget Intelligence
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Interactive Budget Allocation Calculator.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Drag the budget slider to watch Evntora automatically optimize spending across the 6 core pillars of Indian celebration production.
          </p>
        </div>

        <Link
          href="/dashboard/budget"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors group shrink-0"
        >
          <span>Open Full Budget Tracker</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl glass-panel border border-amber-500/30 shadow-2xl space-y-8 max-w-5xl mx-auto">
        {/* Slider Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Select Total Planned Budget (INR)
            </span>
            <span className="text-3xl font-serif font-bold text-amber-400">
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
            className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-slate-800"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>₹10 Lakhs (Intimate)</span>
            <span>₹50 Lakhs (Classic)</span>
            <span>₹1 Crore (Grand)</span>
            <span>₹2 Crores (Royal)</span>
          </div>
        </div>

        {/* Visual Budget Progress Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-900 border border-slate-800">
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
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="text-xs font-medium text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400">{item.pct}%</span>
                </div>
                <div className="text-lg font-serif font-bold text-white">
                  {formatINR(amount)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Prevents common 20-30% wedding cost blowouts</span>
          </div>

          <Link
            href={`/planner?budget=${totalBudget}`}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors flex items-center gap-1.5"
          >
            <span>Plan with this Budget</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

