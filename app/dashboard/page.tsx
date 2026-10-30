"use client";

import Link from "next/link";
import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import {
  Calendar,
  Coins,
  Users,
  CheckSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { state, activeEvent, activeExpenses, activeGuests, activeChecklist } = useEvntoraStore();

  const totalBudget = activeEvent?.totalBudget || 4500000;
  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetSpentPct = Math.round((totalSpent / totalBudget) * 100);

  const confirmedGuests = activeGuests.filter((g) => g.rsvpStatus === "confirmed").length;
  const pendingGuests = activeGuests.filter((g) => g.rsvpStatus === "pending").length;

  const completedTasks = activeChecklist.filter((c) => c.completed).length;
  const checklistPct = activeChecklist.length
    ? Math.round((completedTasks / activeChecklist.length) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner with Active Celebration */}
      <div className="p-8 rounded-3xl glass-panel border border-amber-500/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Celebration Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            {activeEvent?.title || "Royal Indian Celebration"}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {activeEvent?.city}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {activeEvent?.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              {activeEvent?.guestCount} Expected Guests
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <Link
            href="/dashboard/workspace"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-1.5"
          >
            <span>View Full Blueprint</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget Card */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Committed Budget</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-serif font-bold text-white">
            {formatINR(totalSpent)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{budgetSpentPct}% of {formatINR(totalBudget)}</span>
              <span className="text-emerald-400">{formatINR(remainingBudget)} left</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(budgetSpentPct, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Guest RSVP Card */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">RSVP Progress</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-serif font-bold text-white">
            {confirmedGuests} <span className="text-sm font-sans text-slate-400 font-normal">Confirmed</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{pendingGuests} Pending Responses</span>
              <span>{activeGuests.length} Total</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{
                  width: `${activeGuests.length ? Math.round((confirmedGuests / activeGuests.length) * 100) : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Checklist Completion */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Checklist Tasks</span>
            <CheckSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-serif font-bold text-white">
            {completedTasks} / {activeChecklist.length}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{checklistPct}% Completed</span>
              <span>{activeChecklist.length - completedTasks} Pending</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${checklistPct}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Active Enquiries */}
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Vendor Enquiries</span>
            <Sparkles className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-serif font-bold text-white">
            {state.enquiries.length} <span className="text-sm font-sans text-slate-400 font-normal">Active</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Direct artisan quotes</span>
            <Link href="/dashboard/enquiries" className="text-amber-400 hover:underline">
              View Status →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Expenses & Key Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Recent Expenses */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-bold text-white">Recent Committed Expenses</h2>
              <p className="text-xs text-slate-400">Tracked payments against event milestones</p>
            </div>
            <Link
              href="/dashboard/budget"
              className="text-xs text-amber-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage Budget</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activeExpenses.slice(0, 4).map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-semibold text-white">{exp.title}</h4>
                  <span className="text-[11px] text-slate-400">
                    {exp.category} • {exp.vendorName || "General Vendor"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif font-bold text-white block">
                    {formatINR(exp.amount)}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      exp.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {exp.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Urgent Planning Tasks */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-bold text-white">Urgent Checklist</h2>
              <p className="text-xs text-slate-400">Tasks approaching due date</p>
            </div>
            <Link
              href="/dashboard/checklist"
              className="text-xs text-amber-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>All Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activeChecklist.slice(0, 4).map((chk) => (
              <div
                key={chk.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 text-xs"
              >
                <div
                  className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 ${
                    chk.completed ? "bg-emerald-500 border-emerald-500 text-slate-950" : "border-slate-700"
                  }`}
                >
                  {chk.completed && "✓"}
                </div>
                <div className="space-y-0.5">
                  <h4 className={`text-xs ${chk.completed ? "line-through text-slate-500" : "text-white font-medium"}`}>
                    {chk.task}
                  </h4>
                  <span className="text-[10px] text-amber-400/90 font-mono block">
                    {chk.timelineStage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

