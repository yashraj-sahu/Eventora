"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Shield, RotateCcw, ExternalLink, UserCheck, Store, Lock } from "lucide-react";
import { useEvntoraStore } from "@/lib/store";
import { getSupabaseStatus } from "@/lib/supabase";

export function DemoBanner() {
  const { state, switchRole, resetToDefault } = useEvntoraStore();
  const [collapsed, setCollapsed] = useState(false);
  const supabaseStatus = getSupabaseStatus();

  return (
    <aside aria-label="Demo Mode Controls" className="w-full bg-[#1A1211]/95 border-b border-amber-500/20 text-xs text-[#D4C3B7] py-1.5 px-4 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-semibold text-amber-300">DEMO PLATFORM</span>
          <span className="hidden sm:inline text-[#D4C3B7]">|</span>
          <span className="hidden md:inline text-[#D4C3B7]">
            Interactive Prototype with realistic Indian celebrations dataset
          </span>
          <span className="px-2 py-0.5 rounded bg-[#2E1F1E] border border-[#4D3331] text-[10px] text-[#D4C3B7] font-mono">
            Storage: {supabaseStatus.mode}
          </span>
        </div>

        {/* Quick Demo Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#2E1F1E] border border-[#4D3331] rounded-lg p-0.5 text-[11px]">
            <span className="px-2 text-[#9E897F] hidden sm:inline">Role:</span>
            <button
              onClick={() => switchRole("customer")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                state.currentUser.role === "customer"
                  ? "bg-amber-500/20 text-amber-300 font-medium"
                  : "text-[#D4C3B7] hover:text-white"
              }`}
            >
              <UserCheck className="w-3 h-3" />
              Customer
            </button>
            <button
              onClick={() => switchRole("vendor")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                state.currentUser.role === "vendor"
                  ? "bg-amber-500/20 text-amber-300 font-medium"
                  : "text-[#D4C3B7] hover:text-white"
              }`}
            >
              <Store className="w-3 h-3" />
              Vendor
            </button>
            <button
              onClick={() => switchRole("admin")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                state.currentUser.role === "admin"
                  ? "bg-amber-500/20 text-amber-300 font-medium"
                  : "text-[#D4C3B7] hover:text-white"
              }`}
            >
              <Lock className="w-3 h-3" />
              Admin
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={
                state.currentUser.role === "vendor"
                  ? "/vendor-portal"
                  : state.currentUser.role === "admin"
                  ? "/admin"
                  : "/dashboard"
              }
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-[#1A1211] font-medium text-[11px] transition-colors flex items-center gap-1"
            >
              <span>Go to {state.currentUser.role.toUpperCase()} Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={() => {
                if (confirm("Reset demo data to default Indian royal celebration?")) {
                  resetToDefault();
                  window.location.reload();
                }
              }}
              title="Reset sample data"
              className="p-1 rounded bg-[#2E1F1E] hover:bg-[#4D3331] text-[#D4C3B7] hover:text-white transition-colors border border-[#4D3331]"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

