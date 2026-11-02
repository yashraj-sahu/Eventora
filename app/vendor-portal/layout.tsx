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
    <RequireRole role="vendor"><div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] selection:bg-[#173F35] dark:selection:bg-[#A9C7B2] selection:text-white dark:selection:text-[#151B18] font-sans transition-colors duration-200"><PortalAccessNotice />
      <div className="flex-1 flex">
        {/* Vendor Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#1C2520] border-r border-[#E8E2D7] dark:border-[#344139] shrink-0 select-none">
          {/* Brand — links back to public site */}
          <div className="p-5 border-b border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#173F35] flex items-center justify-center font-serif font-bold text-[#C6A66B] text-lg shadow-xs group-hover:bg-[#0F2B24] transition-colors">
                E
              </div>
              <div className="flex flex-col">
                <span className="font-serif tracking-widest text-lg font-bold text-[#173F35] dark:text-[#A9C7B2] leading-none">
                  EVNTORA
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#C6A66B] dark:text-[#D4B77D] font-semibold mt-0.5">
                  Artisan Partner Hub
                </span>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          {/* Partner Info */}
          <div className="p-3.5 border-b border-[#E8E2D7] dark:border-[#344139]">
            <div className="p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-1">
              <span className="text-[9px] uppercase font-bold text-[#77746D] dark:text-[#B5B5AA] block">
                Verified Artisan Partner
              </span>
              <span className="text-xs font-bold text-[#173F35] dark:text-[#F4F0E7] block truncate">
                {businessName}
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[#C6A66B] fill-[#C6A66B]" />
                <span className="text-[10px] text-[#77746D] dark:text-[#B5B5AA] truncate">
                  {category} • {city}
                </span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            <Link
              href="/vendor-portal"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#173F35] text-[#FAF8F3] dark:bg-[#232F28] dark:text-[#A9C7B2] shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4 text-[#C6A66B] dark:text-[#D4B77D]" />
              <span>Partner Operations</span>
            </Link>
            <Link
              href="/vendors/v-01"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/60 dark:hover:bg-[#232F28] transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>Live Public Profile</span>
            </Link>
          </nav>

          {/* Footer — Back to website & Sign Out */}
          <div className="p-3.5 border-t border-[#E8E2D7] dark:border-[#344139] space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#A9C7B2] hover:bg-[#E7EFEA]/50 dark:hover:bg-[#232F28] transition-all w-full"
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
          <header className="bg-white dark:bg-[#1C2520] border-b border-[#E8E2D7] dark:border-[#344139] px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-serif text-base font-bold text-[#173F35] dark:text-[#A9C7B2]"
            >
              <div className="w-7 h-7 rounded-lg bg-[#173F35] text-[#C6A66B] flex items-center justify-center text-xs font-bold">
                E
              </div>
              <span>EVNTORA</span>
            </Link>
            <span className="text-xs text-[#77746D] dark:text-[#B5B5AA] font-semibold">
              Vendor Hub
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/"
                className="text-xs text-[#173F35] dark:text-[#A9C7B2] font-semibold flex items-center gap-1"
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
