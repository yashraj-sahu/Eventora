"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Store,
  LayoutDashboard,
  ArrowLeft,
  Star,
  Globe,
  LogOut,
} from "lucide-react";

export default function VendorPortalLayout({ children }: { children: React.ReactNode }) {
  const { signOut, profile, vendorProfile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#07080b] text-slate-100">
      <div className="flex-1 flex">
        {/* Vendor Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0a0c13] border-r border-white/10 shrink-0">
          {/* Brand — links back to public site */}
          <div className="p-6 border-b border-white/5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center font-serif font-black text-slate-950 text-base shadow group-hover:scale-105 transition-transform">
                E
              </div>
              <div className="flex flex-col">
                <span className="font-serif tracking-widest text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  EVNTORA
                </span>
                <span className="text-[9px] uppercase tracking-widest text-amber-400 font-semibold">
                  Artisan Partner
                </span>
              </div>
            </Link>
          </div>

          {/* Partner Info */}
          <div className="p-4 border-b border-white/5">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Verified Partner</span>
              <span className="text-xs font-bold text-white block">The Oberoi Udaivilas</span>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] text-amber-400">Venues · Udaipur, Rajasthan</span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/vendor-portal"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Partner Dashboard</span>
            </Link>
            <Link
              href="/vendors/v-01"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Globe className="w-4 h-4" />
              <span>Live Public Profile</span>
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
            <span className="text-xs text-slate-400 font-semibold">Vendor Portal</span>
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
