"use client";

import { useState } from "react";
import Link from "next/link";
import { useEvntoraStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseStatus } from "@/lib/supabase";
import { SAMPLE_VENDORS } from "@/data/vendors";
import {
  ShieldCheck,
  LayoutDashboard,
  ArrowLeft,
  RotateCcw,
  Database,
  LogOut,
} from "lucide-react";

/** Internal admin-only dev tools panel — never shown on public pages */
function AdminDevPanel() {
  const { state, resetToDefault } = useEvntoraStore();
  const supabaseStatus = getSupabaseStatus();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-full bg-slate-950 border-b border-rose-500/20 px-4 py-1 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
          Admin Dev Tools
        </span>
        <button onClick={() => setCollapsed(false)} className="text-slate-500 hover:text-white px-2 py-0.5 rounded">
          Show
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/95 border-b border-rose-500/20 text-xs text-slate-300 py-2 px-4 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-semibold text-rose-300 text-[11px]">ADMIN DEV TOOLS</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
            <Database className="w-3 h-3" />
            {supabaseStatus.mode}
          </span>
          <span className="text-[10px] text-slate-500">
            {state.events.length} events · {SAMPLE_VENDORS.length} vendors
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm("Reset all sample data to default Indian royal celebration dataset?")) {
                resetToDefault();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 transition-all text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Sample Data</span>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-600 hover:text-slate-400 px-2 py-1 rounded text-[10px]"
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#07080b] text-slate-100">
      {/* Admin-only dev panel — not visible on any public page */}
      <AdminDevPanel />

      <div className="flex-1 flex">
        {/* Admin Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0a0c13] border-r border-white/10 shrink-0">
          {/* Brand — links back to public site */}
          <div className="p-6 border-b border-white/5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-600 flex items-center justify-center font-serif font-black text-slate-950 text-base shadow group-hover:scale-105 transition-transform">
                E
              </div>
              <div className="flex flex-col">
                <span className="font-serif tracking-widest text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                  EVNTORA
                </span>
                <span className="text-[9px] uppercase tracking-widest text-rose-400 font-semibold">
                  Admin Engine
                </span>
              </div>
            </Link>
          </div>

          {/* Admin Identity */}
          <div className="p-4 border-b border-white/5">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Platform Governance</span>
              <span className="text-xs font-bold text-white block">Superadmin Console</span>
              <span className="text-[10px] text-emerald-400">All India Permissions Active</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Executive Overview</span>
            </Link>
          </nav>

          {/* Footer — Back to website & Sign Out */}
          <div className="p-4 border-t border-white/5 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Evntora Website</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Top Bar */}
        <div className="lg:hidden flex-1 flex flex-col">
          <header className="bg-[#0a0c13] border-b border-white/10 p-4 flex items-center justify-between">
            <Link href="/" className="font-serif text-base font-bold text-white hover:text-amber-300 transition-colors">
              EVNTORA
            </Link>
            <span className="text-xs text-rose-400 font-semibold">Admin</span>
            <Link href="/" className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              <span>Website</span>
            </Link>
          </header>
          <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>

        {/* Desktop Main Content */}
        <main className="hidden lg:block flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
