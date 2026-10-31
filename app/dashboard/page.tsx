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
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { state, activeEvent, activeExpenses, activeGuests, activeChecklist } =
    useEvntoraStore();

  const totalBudget = activeEvent?.totalBudget || 4500000;
  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetSpentPct = Math.round((totalSpent / totalBudget) * 100);

  const confirmedGuests = activeGuests.filter(
    (g) => g.rsvpStatus === "confirmed"
  ).length;
  const pendingGuests = activeGuests.filter(
    (g) => g.rsvpStatus === "pending"
  ).length;

  const completedTasks = activeChecklist.filter((c) => c.completed).length;
  const checklistPct = activeChecklist.length
    ? Math.round((completedTasks / activeChecklist.length) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner with Active Celebration */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#173F35] to-[#0F2B24] text-[#FAF8F3] border border-[#C6A66B]/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF8F3]/10 text-[#C6A66B] text-xs font-semibold border border-[#C6A66B]/30 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Celebration Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#FAF8F3] tracking-tight">
            {activeEvent?.title || "Royal Indian Celebration"}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#E7EFEA]/80">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C6A66B]" />
              {activeEvent?.city || "Rajasthan"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C6A66B]" />
              {activeEvent?.date || "November 2026"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#C6A66B]" />
              {activeEvent?.guestCount || 350} Expected Guests
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <Link
            href="/dashboard/workspace"
            className="px-5 py-2.5 rounded-xl bg-[#C6A66B] hover:bg-[#D4B77D] text-[#173F35] font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Full Blueprint</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[#77746D] dark:text-[#B5B5AA] text-xs">
            <span className="font-semibold uppercase tracking-wider">Committed Budget</span>
            <Coins className="w-4 h-4 text-[#C6A66B] dark:text-[#D4B77D]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            {formatINR(totalSpent)}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
              <span>{budgetSpentPct}% of {formatINR(totalBudget)}</span>
              <span className="text-[#173F35] dark:text-[#A9C7B2] font-semibold">
                {formatINR(remainingBudget)} left
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#F0EDE5] dark:bg-[#1C2520] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#173F35] dark:bg-[#A9C7B2] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(budgetSpentPct, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Guest RSVP Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[#77746D] dark:text-[#B5B5AA] text-xs">
            <span className="font-semibold uppercase tracking-wider">RSVP Progress</span>
            <Users className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            {confirmedGuests}{" "}
            <span className="text-sm font-sans text-[#77746D] dark:text-[#B5B5AA] font-normal">
              Confirmed
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
              <span>{pendingGuests} Pending</span>
              <span>{activeGuests.length} Total</span>
            </div>
            <div className="w-full h-1.5 bg-[#F0EDE5] dark:bg-[#1C2520] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C6A66B] dark:bg-[#D4B77D] rounded-full transition-all duration-300"
                style={{
                  width: `${
                    activeGuests.length
                      ? Math.round((confirmedGuests / activeGuests.length) * 100)
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Checklist Completion */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[#77746D] dark:text-[#B5B5AA] text-xs">
            <span className="font-semibold uppercase tracking-wider">Checklist Tasks</span>
            <CheckSquare className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            {completedTasks} / {activeChecklist.length}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
              <span>{checklistPct}% Completed</span>
              <span>{activeChecklist.length - completedTasks} Pending</span>
            </div>
            <div className="w-full h-1.5 bg-[#F0EDE5] dark:bg-[#1C2520] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#173F35] dark:bg-[#A9C7B2] rounded-full transition-all duration-300"
                style={{ width: `${checklistPct}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Active Enquiries */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[#77746D] dark:text-[#B5B5AA] text-xs">
            <span className="font-semibold uppercase tracking-wider">Vendor Enquiries</span>
            <Sparkles className="w-4 h-4 text-[#C6A66B] dark:text-[#D4B77D]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            {state.enquiries.length}{" "}
            <span className="text-sm font-sans text-[#77746D] dark:text-[#B5B5AA] font-normal">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#77746D] dark:text-[#B5B5AA] pt-1">
            <span>Direct artisan quotes</span>
            <Link
              href="/dashboard/enquiries"
              className="text-[#173F35] dark:text-[#A9C7B2] font-semibold hover:underline"
            >
              View Status →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Expenses & Key Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Recent Expenses */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                Recent Committed Expenses
              </h2>
              <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                Tracked payments against celebration milestones
              </p>
            </div>
            <Link
              href="/dashboard/budget"
              className="text-xs text-[#173F35] dark:text-[#A9C7B2] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage Budget</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activeExpenses.slice(0, 4).map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-[#252522] dark:text-[#F4F0E7]">
                    {exp.title}
                  </h4>
                  <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
                    {exp.category} • {exp.vendorName || "General Vendor"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] block text-sm">
                    {formatINR(exp.amount)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                      exp.status === "paid"
                        ? "bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2]"
                        : "bg-[#F4EBD9] dark:bg-[#C6A66B]/20 text-[#C6A66B] dark:text-[#D4B77D]"
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
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                Milestone Checklist
              </h2>
              <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                Tasks approaching planning deadline
              </p>
            </div>
            <Link
              href="/dashboard/checklist"
              className="text-xs text-[#173F35] dark:text-[#A9C7B2] font-semibold hover:underline flex items-center gap-1"
            >
              <span>All Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activeChecklist.slice(0, 4).map((chk) => (
              <div
                key={chk.id}
                className="p-3.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-start gap-3 text-xs"
              >
                <div
                  className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 ${
                    chk.completed
                      ? "bg-[#173F35] border-[#173F35] text-[#FAF8F3]"
                      : "border-[#E8E2D7] dark:border-[#344139]"
                  }`}
                >
                  {chk.completed && "✓"}
                </div>
                <div className="space-y-0.5">
                  <h4
                    className={`text-xs ${
                      chk.completed
                        ? "line-through text-[#77746D] dark:text-[#B5B5AA]"
                        : "text-[#252522] dark:text-[#F4F0E7] font-medium"
                    }`}
                  >
                    {chk.task}
                  </h4>
                  <span className="text-[10px] text-[#C6A66B] dark:text-[#D4B77D] font-mono block">
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
