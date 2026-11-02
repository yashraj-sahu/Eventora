"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEvntoraStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { RequireRole } from "@/components/auth/RequireRole";
import { PortalAccessNotice } from "@/components/auth/PortalAccessNotice";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Calculator,
  CreditCard,
  Users,
  CheckSquare,
  Clock,
  Bookmark,
  MessageSquare,
  Bot,
  Palette,
  Settings,
  Menu,
  X,
  ChevronDown,
  ArrowLeft,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { state, activeEvent, setActiveEventId } = useEvntoraStore();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };

  const displayName = profile?.full_name ?? state.currentUser.name;
  const displayEmail = profile?.email ?? state.currentUser.email;

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/events", label: "My Celebrations", icon: Calendar },
    { href: "/dashboard/workspace", label: "Event Blueprint", icon: Sparkles },
    { href: "/dashboard/budget", label: "Budget Allocation", icon: Calculator },
    { href: "/dashboard/payments", label: "Payments & Invoices", icon: CreditCard },
    { href: "/dashboard/guests", label: "Guest Management", icon: Users },
    { href: "/dashboard/checklist", label: "Milestone Checklist", icon: CheckSquare },
    { href: "/dashboard/timeline", label: "Run of Show Timeline", icon: Clock },
    { href: "/dashboard/saved-vendors", label: "Saved Artisans", icon: Bookmark },
    { href: "/dashboard/enquiries", label: "Vendor Enquiries", icon: MessageSquare },
    { href: "/dashboard/ai-assistant", label: "AI Concierge", icon: Bot },
    { href: "/dashboard/studio", label: "Design Moodboard", icon: Palette },
    { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
  ];

  return (
    <RequireRole role="customer"><div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] selection:bg-[#173F35] dark:selection:bg-[#A9C7B2] selection:text-white dark:selection:text-[#151B18] font-sans transition-colors duration-200"><PortalAccessNotice />
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
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
                  Customer Workspace
                </span>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          {/* Active Event Selector */}
          <div className="p-3.5 border-b border-[#E8E2D7] dark:border-[#344139]">
            <div className="relative">
              <button
                onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
                className="w-full p-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#173F35] dark:hover:border-[#A9C7B2] flex items-center justify-between text-left transition-colors cursor-pointer shadow-2xs"
              >
                <div className="truncate">
                  <span className="text-[9px] uppercase tracking-wider text-[#77746D] dark:text-[#B5B5AA] font-bold block">
                    Active Celebration
                  </span>
                  <span className="text-xs font-semibold text-[#252522] dark:text-[#F4F0E7] truncate block">
                    {activeEvent?.title || "Select Event"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] shrink-0 ml-1" />
              </button>

              {eventDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#232F28] rounded-xl border border-[#E8E2D7] dark:border-[#344139] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 border-b border-[#E8E2D7] dark:border-[#344139] mb-1">
                    <p className="text-[9px] uppercase font-bold text-[#77746D] dark:text-[#B5B5AA]">
                      Your Events
                    </p>
                  </div>
                  {state.events.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => {
                        setActiveEventId(evt.id);
                        setEventDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        evt.id === activeEvent?.id
                          ? "bg-[#E7EFEA] dark:bg-[#173F35]/40 text-[#173F35] dark:text-[#A9C7B2] font-semibold"
                          : "text-[#252522] dark:text-[#F4F0E7] hover:bg-[#FAF8F3] dark:hover:bg-[#1C2520]"
                      }`}
                    >
                      <span className="truncate">{evt.title}</span>
                      <span className="text-[10px] text-[#77746D] dark:text-[#B5B5AA] ml-2 shrink-0">
                        {evt.city}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-[#E8E2D7] dark:border-[#344139] pt-1 mt-1">
                    <Link
                      href="/planner"
                      onClick={() => setEventDropdownOpen(false)}
                      className="block px-3 py-1.5 text-xs text-[#173F35] dark:text-[#A9C7B2] font-semibold hover:bg-[#E7EFEA]/50 dark:hover:bg-[#1C2520] text-center"
                    >
                      + Plan New Celebration
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#232F28] dark:text-[#A9C7B2] font-semibold shadow-xs"
                      : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/60 dark:hover:bg-[#232F28]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#C6A66B] dark:text-[#D4B77D]" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer — Back to Website & User Info */}
          <div className="p-3.5 border-t border-[#E8E2D7] dark:border-[#344139] space-y-2.5">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#A9C7B2] hover:bg-[#E7EFEA]/50 dark:hover:bg-[#232F28] transition-all w-full"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Evntora Website</span>
            </Link>

            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#FAF8F3] dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#173F35] text-[#FAF8F3] flex items-center justify-center font-bold text-xs shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-[#252522] dark:text-[#F4F0E7] block truncate leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-[#77746D] dark:text-[#B5B5AA] block truncate leading-tight">
                    {displayEmail}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 text-[#77746D] dark:text-[#B5B5AA] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Modal */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#1C2520] h-full flex flex-col z-50 p-5 space-y-4 border-r border-[#E8E2D7] dark:border-[#344139]">
              <div className="flex items-center justify-between border-b border-[#E8E2D7] dark:border-[#344139] pb-3">
                <Link
                  href="/"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 font-serif text-lg font-bold text-[#173F35] dark:text-[#A9C7B2]"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#173F35] text-[#C6A66B] flex items-center justify-center text-sm font-bold">
                    E
                  </div>
                  <span>EVNTORA</span>
                </Link>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 rounded-lg text-[#77746D] dark:text-[#B5B5AA] hover:bg-[#F0EDE5] dark:hover:bg-[#232F28]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium ${
                      pathname === item.href
                        ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#232F28] dark:text-[#A9C7B2] font-semibold"
                        : "text-[#252522] dark:text-[#F4F0E7] hover:bg-[#E7EFEA] dark:hover:bg-[#232F28]"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="border-t border-[#E8E2D7] dark:border-[#344139] pt-3 space-y-2">
                <Link
                  href="/"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#A9C7B2]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Evntora Website</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 w-full text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Top Bar */}
          <header className="lg:hidden bg-white dark:bg-[#1C2520] border-b border-[#E8E2D7] dark:border-[#344139] px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-[#FAF8F3] dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-serif text-base font-bold text-[#173F35] dark:text-[#A9C7B2]">
              Customer Workspace
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
      </div>
    </div></RequireRole>
  );
}
