"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEvntoraStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseStatus } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { RequireRole } from "@/components/auth/RequireRole";
import {
  ShieldCheck,
  LayoutDashboard,
  CreditCard,
  ArrowLeft,
  RotateCcw,
  Database,
  LogOut,
} from "lucide-react";

/** Internal admin-only dev tools panel */
function AdminDevPanel() {
  const { state, resetToDefault } = useEvntoraStore();
  const supabaseStatus = getSupabaseStatus();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-full bg-[#FFF3E3] dark:bg-[#1A1211] border-b border-[#EAD2B0] dark:border-[#4D3331] px-4 py-1.5 flex items-center justify-between text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#681B1D] dark:bg-[#EAD2B0] inline-block" />
          <span>Admin Dev Tools</span>
        </span>
        <button
          onClick={() => setCollapsed(false)}
          className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline px-2 py-0.5 rounded cursor-pointer font-semibold"
        >
          Show
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFFCF6] dark:bg-[#241918] border-b border-[#EAD2B0] dark:border-[#4D3331] text-xs text-[#30221D] dark:text-[#F4F0E7] py-2 px-4 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#EAD2B0]" />
          <span className="font-bold text-[#681B1D] dark:text-[#EAD2B0] text-[11px] tracking-wider uppercase">
            Admin System Desk
          </span>
          <span className="hidden sm:inline text-[#7D6B63] dark:text-[#D4C3B7]">|</span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-[10px] text-[#7D6B63] dark:text-[#D4C3B7] font-mono">
            <Database className="w-3 h-3 text-[#B77A36]" />
            {supabaseStatus.mode}
          </span>
          <span className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7]">
            {state.events.length} celebrations · Vendor records are managed from Supabase
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (
                confirm(
                  "Reset all sample data to default Indian royal celebration dataset?"
                )
              ) {
                resetToDefault();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF3E3] dark:bg-[#2E1F1E] hover:bg-[#EAD2B0] text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] transition-all text-[11px] font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[#B77A36]" />
            <span>Reset Sample Data</span>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] px-2 py-1 rounded text-[10px] cursor-pointer"
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  if (pathname === "/admin/signin") return <>{children}</>;

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };

  return (
    <RequireRole role="admin"><div data-evntora-theme="portal" className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] selection:bg-[#681B1D] dark:selection:bg-[#EAD2B0] selection:text-white dark:selection:text-[#1A1211] font-sans transition-colors duration-200">
      {/* Admin-only dev panel */}
      <AdminDevPanel />

      <div className="flex-1 flex">
        {/* Admin Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#FFFCF6] dark:bg-[#241918] border-r border-[#EAD2B0] dark:border-[#4D3331] shrink-0 select-none">
          {/* Brand — links back to public site */}
          <div className="p-5 border-b border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#681B1D] flex items-center justify-center font-serif font-bold text-[#B77A36] text-lg shadow-xs group-hover:bg-[#4B1117] transition-colors">
                E
              </div>
              <div className="flex flex-col">
                <span className="font-serif tracking-widest text-lg font-bold text-[#681B1D] dark:text-[#EAD2B0] leading-none">
                  EVNTORA
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#B77A36] dark:text-[#D4B77D] font-semibold mt-0.5">
                  Platform Admin
                </span>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          {/* Admin Identity */}
          <div className="p-3.5 border-b border-[#EAD2B0] dark:border-[#4D3331]">
            <div className="p-3 rounded-xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
              <span className="text-[9px] uppercase font-bold text-[#7D6B63] dark:text-[#D4C3B7] block">
                Platform Governance
              </span>
              <span className="text-xs font-bold text-[#681B1D] dark:text-[#F4F0E7] block">
                Superadmin Console
              </span>
              <span className="text-[10px] text-[#681B1D] dark:text-[#EAD2B0] font-semibold">
                All-India Verification Desk
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#681B1D] text-[#FFF3E3] dark:bg-[#2E1F1E] dark:text-[#EAD2B0] shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4 text-[#B77A36] dark:text-[#D4B77D]" />
              <span>Executive Overview</span>
            </Link>
            <Link
              href="/admin/payments"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#F4F0E7] hover:bg-[#EAD2B0]/60 dark:hover:bg-[#2E1F1E] transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Payments & Escrow Desk</span>
            </Link>
            <Link
              href="/admin/administrators"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#F4F0E7] hover:bg-[#EAD2B0]/60 dark:hover:bg-[#2E1F1E] transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Administrator Access</span>
            </Link>
          </nav>

          {/* Footer — Back to website & Sign Out */}
          <div className="p-3.5 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] hover:bg-[#EAD2B0]/50 dark:hover:bg-[#2E1F1E] transition-all w-full"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Evntora</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all w-full text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Top Bar */}
        <div className="lg:hidden flex-1 flex flex-col min-w-0">
          <header className="bg-[#FFFCF6] dark:bg-[#241918] border-b border-[#EAD2B0] dark:border-[#4D3331] px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-serif text-base font-bold text-[#681B1D] dark:text-[#EAD2B0]"
            >
              <div className="w-7 h-7 rounded-lg bg-[#681B1D] text-[#B77A36] flex items-center justify-center text-xs font-bold">
                E
              </div>
              <span>EVNTORA</span>
            </Link>
            <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] font-semibold">
              Admin Desk
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/"
                className="text-xs text-[#681B1D] dark:text-[#EAD2B0] font-semibold flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Site</span>
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>

        {/* Desktop Main Content */}
        <main className="hidden lg:block flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div></RequireRole>
  );
}
