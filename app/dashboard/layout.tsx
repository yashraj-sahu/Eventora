"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireRole } from "@/components/auth/RequireRole";
import { PortalAccessNotice } from "@/components/auth/PortalAccessNotice";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, CalendarDays, Store, CreditCard, Bookmark, Menu, X, ChevronDown, LogOut, Settings, Building2, ShieldCheck, UserRound } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "My Events", icon: CalendarDays },
  { href: "/vendors", label: "Discover Vendors", icon: Store },
  { href: "/dashboard/payments", label: "Bookings & Payments", icon: CreditCard },
  { href: "/dashboard/saved-vendors", label: "Saved Vendors", icon: Bookmark },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, roles, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };

  const active = (href: string) => href === "/vendors" ? pathname.startsWith("/vendors") : href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const nav = (mobile = false) => navItems.map((item) => {
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} onClick={() => mobile && setSidebarOpen(false)} aria-current={active(item.href) ? "page" : undefined}
      className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${active(item.href) ? "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/30" : "text-[#7D6B63] dark:text-[#D4C3B7] hover:bg-[#EAD2B0]/50 dark:hover:bg-[#2E1F1E] hover:text-[#681B1D] dark:hover:text-[#FFF3E3]"}`}>
      <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${active(item.href) ? "text-[#EAD2B0]" : ""}`} /><span>{item.label}</span>{active(item.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EAD2B0]" />}
    </Link>;
  });

  const accountCard = (mobile = false) => <div className="relative">
    <button type="button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}
      className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] transition-colors text-left">
      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#681B1D] to-[#4B1117] text-[#EAD2B0] border border-[#B77A36]/50 flex items-center justify-center font-serif font-bold">{profile?.full_name?.charAt(0)?.toUpperCase() || "E"}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{profile?.full_name || "Your account"}</span><span className="block text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] truncate">{user?.email}</span></span>
      <ChevronDown className={`w-4 h-4 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
    </button>
    {accountOpen && <div className={`${mobile ? "relative mt-2" : "absolute bottom-full left-0 right-0 mb-2"} z-40 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl p-2`}>
      <Link href="/dashboard/settings" onClick={() => { setAccountOpen(false); if (mobile) setSidebarOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]"><UserRound className="w-4 h-4 text-[#B77A36]" />My Profile & Settings</Link>
      {roles.includes("vendor") && <Link href="/vendor-portal" onClick={() => { setAccountOpen(false); if (mobile) setSidebarOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]"><Building2 className="w-4 h-4 text-[#B77A36]" />Switch to Vendor Hub</Link>}
      {(roles.includes("admin") || roles.includes("platform_owner")) && <Link href="/admin" onClick={() => { setAccountOpen(false); if (mobile) setSidebarOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]"><ShieldCheck className="w-4 h-4 text-[#B77A36]" />Switch to Admin Desk</Link>}
      <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20"><LogOut className="w-4 h-4" />Sign Out</button>
    </div>}
  </div>;

  return <RequireRole role="customer"><div data-evntora-theme="portal" className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] font-sans transition-colors duration-200"><PortalAccessNotice />
    <div className="flex-1 flex min-h-0">
      <aside className="hidden lg:flex sticky top-0 h-screen flex-col w-72 bg-[#FFFCF6] dark:bg-[#241918] border-r border-[#EAD2B0] dark:border-[#4D3331] shrink-0 px-4 py-5">
        <div className="px-2 pb-5 border-b border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-between"><Link href="/" className="flex items-center gap-3"><span className="w-10 h-10 rounded-2xl bg-[#681B1D] text-[#B77A36] flex items-center justify-center font-serif font-bold text-xl shadow-md">E</span><span><span className="block font-serif tracking-[0.18em] text-lg font-bold text-[#681B1D] dark:text-[#EAD2B0]">EVNTORA</span><span className="block text-[9px] uppercase tracking-[0.2em] text-[#B77A36]">Customer workspace</span></span></Link><ThemeToggle /></div>
        <nav aria-label="Customer navigation" className="flex-1 py-6 space-y-1.5">{nav()}</nav>
        <div className="pt-4 border-t border-[#EAD2B0] dark:border-[#4D3331]">{accountCard()}</div>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-50 flex"><button aria-label="Close navigation" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} /><aside className="relative z-10 w-80 max-w-[86vw] h-full bg-[#FFFCF6] dark:bg-[#241918] border-r border-[#EAD2B0] dark:border-[#4D3331] p-4 flex flex-col"><div className="flex items-center justify-between px-2 pb-4 border-b border-[#EAD2B0] dark:border-[#4D3331]"><Link href="/" className="font-serif tracking-[0.18em] text-lg font-bold text-[#681B1D] dark:text-[#EAD2B0]">EVNTORA</Link><div className="flex items-center gap-2"><ThemeToggle /><button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-[#EAD2B0]/50"><X className="w-5 h-5" /></button></div></div><nav aria-label="Customer navigation" className="flex-1 py-5 space-y-1.5">{nav(true)}</nav><div className="pt-4 border-t border-[#EAD2B0] dark:border-[#4D3331]">{accountCard(true)}</div></aside></div>}

      <div className="flex-1 flex flex-col min-w-0"><header className="lg:hidden sticky top-0 z-20 bg-[#FFFCF6]/95 dark:bg-[#241918]/95 backdrop-blur-md border-b border-[#EAD2B0] dark:border-[#4D3331] px-4 py-3 flex items-center justify-between"><button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl border border-[#EAD2B0] dark:border-[#4D3331]"><Menu className="w-5 h-5" /></button><span className="font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">EVNTORA</span><ThemeToggle /></header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  </div></RequireRole>;
}
