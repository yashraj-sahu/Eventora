"use client";

import Link from "next/link";
import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { Calendar, MapPin, Users, Coins, Plus, CheckCircle2, ArrowRight } from "lucide-react";

export default function MyEventsPage() {
  const { state, activeEvent, setActiveEventId } = useEvntoraStore();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <Calendar className="w-3.5 h-3.5" />
            <span>Event Portfolio</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            My Celebrations
          </h1>
          <p className="text-xs text-slate-400">
            Switch between active celebrations, check statuses, and launch new AI event blueprints
          </p>
        </div>

        <Link
          href="/planner"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Plan Another Celebration</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {state.events.map((evt) => {
          const isActive = evt.id === activeEvent?.id;
          return (
            <div
              key={evt.id}
              className={`p-8 rounded-3xl glass-card transition-all space-y-6 flex flex-col justify-between ${
                isActive
                  ? "border-2 border-amber-500/60 shadow-xl shadow-amber-500/10"
                  : "border border-white/10 hover:border-white/20"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 text-amber-400">
                    {evt.category}
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Workspace
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-serif font-bold text-white">{evt.title}</h3>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{evt.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{evt.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>{evt.guestCount} Guests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-white">{formatINR(evt.totalBudget)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                {!isActive ? (
                  <button
                    onClick={() => setActiveEventId(evt.id)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white transition-all"
                  >
                    Set as Active Workspace
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Currently Editing</span>
                )}

                <Link
                  href="/dashboard/workspace"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

