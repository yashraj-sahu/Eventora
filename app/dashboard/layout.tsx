"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEvntoraStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Calculator,
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, activeEvent, setActiveEventId } = useEvntoraStore();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };

  // Use real auth name if available, fallback to store
  const displayName = profile?.full_name ?? state.currentUser.name;
  const displayEmail = profile?.email ?? state.currentUser.email;

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/events", label: "My Events", icon: Calendar },
    { href: "/dashboard/workspace", label: "Event Workspace", icon: Sparkles },
    { href: "/dashboard/budget", label: "Budget Tracker", icon: Calculator },
    { href: "/dashboard/guests", label: "Guest Management", icon: Users },
    { href: "/dashboard/checklist", label: "Planning Checklist", icon: CheckSquare },
    { href: "/dashboard/timeline", label: "Event Timeline", icon: Clock },
    { href: "/dashboard/saved-vendors", label: "Saved Vendors", icon: Bookmark },
    { href: "/dashboard/enquiries", label: "Vendor Enquiries", icon: MessageSquare },
    { href: "/dashboard/ai-assistant", label: "AI Concierge", icon: Bot },
    { href: "/dashboard/studio", label: "Design Studio", icon: Palette },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#07080b] text-slate-100">
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0a0c13] border-r border-white/10 shrink-0 select-none">
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
                  Customer Workspace
                </span>
              </div>
            </Link>
          </div>

          {/* Active Event Selector */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <button
                onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/30 flex items-center justify-between text-left transition-colors"
              >
                <div className="truncate">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                    Active Celebration
                  </span>
                  <span className="text-xs font-semibold text-white truncate block">
                    {activeEvent?.title || "Select Event"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {eventDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0f18] rounded-xl border border-amber-500/30 shadow-2xl py-1 z-50 animate-in fade-in">
                  {state.events.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => {
                        setActiveEventId(evt.id);
                        setEventDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                        evt.id === activeEvent?.id
                          ? "bg-amber-500/20 text-amber-300 font-semibold"
                          : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <span className="truncate">{evt.title}</span>
                      <span className="text-[10px] text-slate-500">{evt.city}</span>
                    </button>
                  ))}
                  <div className="border-t border-slate-800 pt-1 mt-1">
                    <Link
                      href="/planner"
                      onClick={() => setEventDropdownOpen(false)}
                      className="block px-3 py-1.5 text-xs text-amber-400 font-semibold hover:bg-amber-500/10 text-center"
                    >
                      + Plan New Celebration
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer — Back to Website */}
          <div className="p-4 border-t border-white/5 space-y-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Evntora Website</span>
            </Link>
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-white block truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {displayEmail}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Modal */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-[#0a0c13] h-full flex flex-col z-50 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link href="/" onClick={() => setSidebarOpen(false)} className="font-serif text-lg font-bold text-white hover:text-amber-300 transition-colors">
                  EVNTORA
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                      pathname === item.href
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <Link
                href="/"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all border-t border-white/5 pt-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Evntora Website</span>
              </Link>
            </div>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Top Bar */}
          <header className="lg:hidden bg-[#0a0c13] border-b border-white/10 p-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-slate-900 text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-serif text-base font-bold text-white">Customer Workspace</span>
            <Link href="/" className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              <span>Website</span>
            </Link>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
