"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Menu,
  X,
  ArrowRight,
  User,
  ChevronDown,
  LogOut,
  Settings,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navLinks = [
  { href: "/events", label: "Explore Events" },
  { href: "/vendors", label: "Find Vendors" },
  { href: "/planner", label: "AI Planner", badge: "AI" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
];

const portalLinks = [
  {
    href: "/dashboard",
    label: "Customer Workspace",
    desc: "Personal celebration planner",
    icon: CalendarCheck,
  },
  {
    href: "/vendor-portal",
    label: "Vendor Hub",
    desc: "B2B client management & leads",
    icon: Building2,
  },
  {
    href: "/admin",
    label: "Admin Desk",
    desc: "Verification & platform control",
    icon: ShieldCheck,
  },
];

function AccountMenu({ onClose }: { onClose: () => void }) {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    onClose();
    await signOut();
    window.location.assign("/");
  };

  const portalHref =
    profile?.role === "admin"
      ? "/admin"
      : profile?.role === "vendor"
      ? "/vendor-portal"
      : "/dashboard";

  return (
    <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#232F28] rounded-2xl shadow-xl border border-[#E8E2D7] dark:border-[#344139] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
      {/* User identity */}
      <div className="px-4 py-3 border-b border-[#E8E2D7] dark:border-[#344139]">
        <p className="text-xs font-bold text-[#252522] dark:text-[#F4F0E7] truncate">
          {profile?.full_name || "User"}
        </p>
        <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] truncate">
          {profile?.email}
        </p>
        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] font-semibold capitalize">
          {profile?.role || "Member"} Portal
        </span>
      </div>

      <Link
        href={portalHref}
        onClick={onClose}
        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#252522] dark:text-[#F4F0E7] hover:text-[#173F35] dark:hover:text-[#A9C7B2] hover:bg-[#E7EFEA]/70 dark:hover:bg-[#1C2520] transition-colors"
      >
        <LayoutDashboard className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
        <span>My Dashboard</span>
      </Link>
      <Link
        href={`${portalHref}/settings`}
        onClick={onClose}
        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#252522] dark:text-[#F4F0E7] hover:text-[#173F35] dark:hover:text-[#A9C7B2] hover:bg-[#E7EFEA]/70 dark:hover:bg-[#1C2520] transition-colors"
      >
        <Settings className="w-4 h-4 text-[#C6A66B] dark:text-[#D4B77D]" />
        <span>Account Settings</span>
      </Link>

      <div className="border-t border-[#E8E2D7] dark:border-[#344139] mt-1 pt-1">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#77746D] dark:text-[#B5B5AA] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors w-full text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function PortalsDropdown({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-[#232F28] rounded-2xl shadow-xl border border-[#E8E2D7] dark:border-[#344139] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="px-3 py-1.5 border-b border-[#E8E2D7] dark:border-[#344139] mb-1">
        <p className="text-[10px] font-bold tracking-wider uppercase text-[#77746D] dark:text-[#B5B5AA]">
          Evntora Portals
        </p>
      </div>
      {portalLinks.map((portal) => {
        const Icon = portal.icon;
        const isActive = pathname.startsWith(portal.href);
        return (
          <Link
            key={portal.href}
            href={portal.href}
            onClick={onClose}
            className={`flex items-start gap-2.5 px-3 py-2 rounded-xl mx-1 transition-colors ${
              isActive
                ? "bg-[#E7EFEA] dark:bg-[#1C2520] text-[#173F35] dark:text-[#A9C7B2]"
                : "text-[#252522] dark:text-[#F4F0E7] hover:bg-[#E7EFEA]/60 dark:hover:bg-[#1C2520]"
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#FAF8F3] dark:bg-[#151B18] border border-[#E8E2D7] dark:border-[#344139] flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-[#173F35] dark:text-[#C6A66B]" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">{portal.label}</p>
              <p className="text-[10px] text-[#77746D] dark:text-[#B5B5AA] leading-normal">
                {portal.desc}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isLoading, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [portalsMenuOpen, setPortalsMenuOpen] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const portalsMenuRef = useRef<HTMLDivElement>(null);

  const handleMobileSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    window.location.assign("/");
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
      if (
        portalsMenuRef.current &&
        !portalsMenuRef.current.contains(e.target as Node)
      ) {
        setPortalsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    setPortalsMenuOpen(false);
  }, [pathname]);

  const isAuthenticated = Boolean(user);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? "bg-[#FAF8F3]/95 dark:bg-[#151B18]/95 backdrop-blur-md border-b border-[#E8E2D7] dark:border-[#344139] shadow-[0_4px_20px_-4px_rgba(23,63,53,0.06)]"
          : "bg-[#FAF8F3] dark:bg-[#151B18] border-b border-[#E8E2D7] dark:border-[#344139]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px] gap-2 lg:gap-4">

          {/* ── BRAND LOGO ── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#173F35] flex items-center justify-center font-serif font-bold text-[#C6A66B] text-xl shadow-xs group-hover:bg-[#0F2B24] transition-colors">
              E
            </div>
            <div className="flex flex-col">
              <span className="font-serif tracking-widest text-[20px] sm:text-[22px] font-bold text-[#173F35] dark:text-[#A9C7B2] group-hover:text-[#0F2B24] transition-colors leading-none">
                EVNTORA
              </span>
              <span className="text-[9px] tracking-wider uppercase text-[#77746D] dark:text-[#B5B5AA] font-sans mt-0.5 hidden xl:block">
                Every Celebration, Beautifully Planned
              </span>
            </div>
          </Link>

          {/* ── DESKTOP NAVIGATION ── */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 min-w-0">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "text-[#173F35] dark:text-[#151B18] bg-[#E7EFEA] dark:bg-[#A9C7B2] font-semibold"
                      : "text-[#252522] dark:text-[#F4F0E7] hover:text-[#173F35] dark:hover:text-[#A9C7B2] hover:bg-[#E7EFEA]/50 dark:hover:bg-[#1C2520]"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#173F35] dark:bg-[#232F28] text-[#FAF8F3] dark:text-[#D4B77D] font-bold uppercase tracking-wider leading-none">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Portals Dropdown Trigger */}
            <div className="relative" ref={portalsMenuRef}>
              <button
                onClick={() => setPortalsMenuOpen(!portalsMenuOpen)}
                className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-[13px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  pathname.startsWith("/dashboard") ||
                  pathname.startsWith("/vendor-portal") ||
                  pathname.startsWith("/admin")
                    ? "text-[#173F35] dark:text-[#151B18] bg-[#E7EFEA] dark:bg-[#A9C7B2] font-semibold"
                    : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#A9C7B2] hover:bg-[#E7EFEA]/50 dark:hover:bg-[#1C2520]"
                }`}
              >
                <span>Portals</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    portalsMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {portalsMenuOpen && (
                <PortalsDropdown onClose={() => setPortalsMenuOpen(false)} />
              )}
            </div>
          </nav>

          {/* ── RIGHT ACTION CTAs ── */}
          <div className="hidden md:flex items-center gap-2 xl:gap-2.5 shrink-0">
            {/* Functional Theme Switcher */}
            <ThemeToggle />

            {!isLoading && (
              <>
                {isAuthenticated ? (
                  /* Account Dropdown */
                  <div className="relative" ref={accountMenuRef}>
                    <button
                      onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                      className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-xl bg-white dark:bg-[#232F28] hover:bg-[#F0EDE5] dark:hover:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] transition-all text-xs cursor-pointer shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#173F35] flex items-center justify-center text-[#FAF8F3] font-bold text-xs shrink-0">
                        {profile?.full_name?.charAt(0)?.toUpperCase() ?? (
                          <User className="w-3 h-3" />
                        )}
                      </div>
                      <span className="text-[#252522] dark:text-[#F4F0E7] font-semibold max-w-[80px] xl:max-w-[100px] truncate">
                        {profile?.full_name?.split(" ")[0] ?? "Account"}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#77746D] dark:text-[#B5B5AA] transition-transform duration-200 ${
                          accountMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {accountMenuOpen && (
                      <AccountMenu onClose={() => setAccountMenuOpen(false)} />
                    )}
                  </div>
                ) : (
                  /* Sign In */
                  <Link
                    href="/signin"
                    className="px-3 xl:px-3.5 py-1.5 xl:py-2 rounded-xl text-xs font-semibold text-[#173F35] dark:text-[#A9C7B2] hover:bg-[#E7EFEA] dark:hover:bg-[#1C2520] border border-[#173F35]/25 dark:border-[#344139] transition-all whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}

            {/* Prominent Emerald Start Planning CTA */}
            <Link
              href="/planner"
              className="px-3.5 xl:px-4 py-2 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold tracking-wide shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 xl:gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span className="hidden sm:inline">Start Planning</span>
              <span className="sm:hidden">Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ── MOBILE MENU TRIGGER ── */}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <Link
              href="/planner"
              className="px-3 py-1.5 rounded-lg bg-[#173F35] text-[#FAF8F3] text-xs font-bold"
            >
              Plan
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#252522] dark:text-[#F4F0E7] hover:bg-[#F0EDE5] dark:hover:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF8F3] dark:bg-[#151B18] border-b border-[#E8E2D7] dark:border-[#344139] px-5 py-5 space-y-4 shadow-lg animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-0.5">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#252522] dark:text-[#F4F0E7] hover:bg-[#E7EFEA] dark:hover:bg-[#232F28] hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors"
            >
              <span>Home</span>
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#252522] dark:text-[#F4F0E7] hover:bg-[#E7EFEA] dark:hover:bg-[#232F28] hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors"
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#173F35] dark:bg-[#232F28] text-[#FAF8F3] dark:text-[#D4B77D] font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E8E2D7] dark:border-[#344139]">
            <p className="text-[10px] font-bold text-[#77746D] dark:text-[#B5B5AA] uppercase tracking-widest px-3 mb-2">
              Evntora Portals
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {portalLinks.map((portal) => {
                const Icon = portal.icon;
                return (
                  <Link
                    key={portal.href}
                    href={portal.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#173F35] dark:text-[#A9C7B2] bg-white dark:bg-[#232F28] hover:bg-[#E7EFEA] dark:hover:bg-[#1C2520] transition-colors border border-[#E8E2D7] dark:border-[#344139]"
                  >
                    <Icon className="w-4 h-4 text-[#C6A66B]" />
                    <div>
                      <p className="text-xs font-semibold">{portal.label}</p>
                      <p className="text-[10px] text-[#77746D] dark:text-[#B5B5AA] font-normal">
                        {portal.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8E2D7] dark:border-[#344139] space-y-2">
            {isAuthenticated ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#173F35] flex items-center justify-center text-[#FAF8F3] font-bold text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#252522] dark:text-[#F4F0E7]">
                      {profile?.full_name}
                    </p>
                    <p className="text-[10px] text-[#77746D] dark:text-[#B5B5AA] capitalize">
                      {profile?.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleMobileSignOut}
                  className="text-xs text-rose-600 dark:text-rose-400 font-medium hover:underline cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-[#173F35] text-xs font-bold text-[#173F35] dark:text-[#A9C7B2] bg-white dark:bg-[#232F28] hover:bg-[#E7EFEA] dark:hover:bg-[#1C2520] transition-colors"
              >
                Sign In
              </Link>
            )}

            <Link
              href="/planner"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#173F35] text-[#FAF8F3] text-xs font-bold shadow-md hover:bg-[#0F2B24]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span>Start Planning My Event</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
