"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { href: "/events", label: "Explore Events" },
  { href: "/vendors", label: "Vendors & Palaces" },
  { href: "/planner", label: "AI Planner", badge: "AI" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

// Direct portal links — displayed inline on desktop, no dropdown
const portalLinks = [
  { href: "/dashboard", label: "Customer" },
  { href: "/vendor-portal", label: "Vendor" },
  { href: "/admin", label: "Admin" },
];

function AccountMenu({ onClose }: { onClose: () => void }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();

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
    <div className="absolute right-0 mt-2 w-56 bg-[#0d0f18]/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-500/20 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
      {/* User identity */}
      <div className="px-4 py-3 border-b border-slate-800/80">
        <p className="text-xs font-semibold text-white truncate">{profile?.full_name}</p>
        <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize font-medium">
          {profile?.role}
        </span>
      </div>

      <Link
        href={portalHref}
        onClick={onClose}
        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
      >
        <LayoutDashboard className="w-4 h-4 text-amber-400" />
        <span>My Portal</span>
      </Link>
      <Link
        href={`${portalHref}/settings`}
        onClick={onClose}
        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
      >
        <Settings className="w-4 h-4 text-amber-400" />
        <span>Account Settings</span>
      </Link>
      <div className="border-t border-slate-800/80 mt-1 pt-1">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const handleMobileSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    window.location.assign("/");
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  const isAuthenticated = Boolean(user);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? "bg-[#08090d]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/60"
          : "bg-transparent border-b border-white/5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px] gap-4">

          {/* ── LOGO ── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 flex items-center justify-center font-serif font-black text-slate-950 text-lg shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform duration-200">
              E
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif tracking-widest text-[20px] font-bold text-white group-hover:text-amber-300 transition-colors">
                EVNTORA
              </span>
              <span className="text-[9px] tracking-widest uppercase text-slate-500 font-sans hidden sm:block">
                Every Moment, Perfectly Planned
              </span>
            </div>
          </Link>

          {/* ── DESKTOP NAV ── */}
          <nav className="hidden xl:flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "text-amber-400 bg-amber-500/10 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold uppercase tracking-wider leading-none">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Divider */}
            <span className="w-px h-4 bg-slate-800 mx-1.5 shrink-0" />

            {/* Direct portal links */}
            {portalLinks.map((portal) => (
              <Link
                key={portal.href}
                href={portal.href}
                className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                  pathname.startsWith(portal.href)
                    ? "text-amber-400 bg-amber-500/10 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {portal.label}
              </Link>
            ))}
          </nav>

          {/* ── RIGHT SIDE CTAs ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  /* Account Menu */
                  <div className="relative" ref={accountMenuRef}>
                    <button
                      onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/30 transition-all text-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                        {profile?.full_name?.charAt(0)?.toUpperCase() ?? <User className="w-3 h-3" />}
                      </div>
                      <span className="text-slate-200 text-xs font-medium max-w-[80px] truncate">
                        {profile?.full_name?.split(" ")[0] ?? "Account"}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
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
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}

            {/* Start Planning CTA */}
            <Link
              href="/planner"
              className="group overflow-hidden px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 text-xs font-bold tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              <span>Start Planning</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* ── MOBILE CONTROLS ── */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/planner"
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
            >
              Plan
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d0f18]/98 backdrop-blur-xl border-b border-white/10 px-5 py-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
          {/* Nav links */}
          <div className="space-y-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Portal links */}
          <div className="pt-3 border-t border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Portals
            </p>
            <div className="flex gap-2">
              {portalLinks.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-amber-500/10 hover:text-amber-400 transition-colors border border-slate-800"
                >
                  {portal.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth / CTA */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            {isAuthenticated ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{profile?.full_name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{profile?.role}</p>
                  </div>
                </div>
                <button
                   onClick={handleMobileSignOut}
                   className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
                 >
                   Sign out
                 </button>
              </div>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-4 py-3 rounded-xl border border-slate-800 text-sm font-semibold text-white hover:bg-slate-900 transition-colors"
              >
                Sign In
              </Link>
            )}

            <Link
              href="/planner"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Planning My Event</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
