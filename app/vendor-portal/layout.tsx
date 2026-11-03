"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RequireRole } from "@/components/auth/RequireRole";
import { PortalAccessNotice } from "@/components/auth/PortalAccessNotice";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  Store,
  LayoutDashboard,
  ArrowLeft,
  Star,
  Globe,
  LogOut,
  Building2,
} from "lucide-react";

export default function VendorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut, profile, vendorProfile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };

  const businessName =
    vendorProfile?.business_name || profile?.full_name || "Vendor account";
  const city = vendorProfile?.city || "";
  const category = vendorProfile?.business_category || "Vendor";

  return (
    <RequireRole role="vendor"><div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] selection:bg-[#681B1D] dark:selection:bg-[#EAD2B0] selection:text-white dark:selection:text-[#1A1211] font-sans transition-colors duration-200"><PortalAccessNotice />
      <div className="flex-1 flex">
        {/* Vendor Sidebar */}
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
                  Artisan Partner Hub
                </span>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          {/* Partner Info */}
          <div className="p-3.5 border-b border-[#EAD2B0] dark:border-[#4D3331]">
            <div className="p-3 rounded-xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
              <span className="text-[9px] uppercase font-bold text-[#7D6B63] dark:text-[#D4C3B7] block">
                Verified Artisan Partner
              </span>
              <span className="text-xs font-bold text-[#681B1D] dark:text-[#F4F0E7] block truncate">
                {businessName}
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[#B77A36] fill-[#B77A36]" />
                <span className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7] truncate">
                  {category} • {city}
                </span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            <Link
              href="/vendor-portal"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#681B1D] text-[#FFF3E3] dark:bg-[#2E1F1E] dark:text-[#EAD2B0] shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4 text-[#B77A36] dark:text-[#D4B77D]" />
              <span>Partner Operations</span>
            </Link>
            <Link
              href="/vendors/v-01"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#F4F0E7] hover:bg-[#EAD2B0]/60 dark:hover:bg-[#2E1F1E] transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>Live Public Profile</span>
            </Link>
          </nav>

          {/* Footer — Back to website & Sign Out */}
          <div className="p-3.5 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] hover:bg-[#EAD2B0]/50 dark:hover:bg-[#2E1F1E] transition-all w-full"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Evntora Website</span>
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

        {/* Mobile View */}
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
              Vendor Hub
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

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>

        {/* Desktop Main Content */}
        <div className="hidden lg:flex flex-1 flex-col min-w-0">
          <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div></RequireRole>
  );
}
