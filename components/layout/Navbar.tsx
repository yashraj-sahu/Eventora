"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  { href: "/planner", label: "AI Planner" },
  { href: "/about", label: "About" },
];

const portalLinks = [
  {
    href: "/signin?portal=customer",
    path: "/dashboard",
    label: "Customer Workspace",
    desc: "Personal celebration planner",
    icon: CalendarCheck,
  },
  {
    href: "/signin?portal=vendor",
    path: "/vendor-portal",
    label: "Vendor Hub",
    desc: "B2B client management & leads",
    icon: Building2,
  },
  {
    href: "/admin/signin",
    path: "/admin",
    label: "Admin Desk",
    desc: "Verification & platform control",
    icon: ShieldCheck,
  },
];

function AccountMenu({ onClose }: { onClose: () => void }) {
  const { profile, roles, signOut } = useAuth();

  const handleSignOut = async () => {
    onClose();
    await signOut();
    window.location.assign("/");
  };

  const portalHref = roles.includes("customer")
    ? "/dashboard"
    : roles.includes("vendor")
    ? "/vendor-portal"
    : roles.some((role) => role === "admin" || role === "platform_owner")
    ? "/admin"
    : "/signin";

  return (
    <div className="absolute right-0 mt-2 w-64 bg-[#FFF3E3] dark:bg-[#2E1F1E] rounded-2xl shadow-xl border border-[#EAD2B0] dark:border-[#4D3331] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
      {/* User identity */}
      <div className="px-4 py-3 border-b border-[#EAD2B0] dark:border-[#4D3331]">
        <p className="text-xs font-bold text-[#30221D] dark:text-[#FFF3E3] truncate font-serif">
          {profile?.full_name || "User"}
        </p>
        <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] truncate">
          {profile?.email}
        </p>
        <span className="inline-block mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-[#EAD2B0]/40 dark:bg-[#681B1D]/50 text-[#681B1D] dark:text-[#EAD2B0] font-semibold capitalize border border-[#EAD2B0] dark:border-[#4D3331]">
          {roles.length
            ? `${roles.map((role) => role.replace("platform_owner", "owner")).join(" + ")} access`
            : "Member"}
        </span>
      </div>

      <Link
        href={portalHref}
        onClick={onClose}
        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#30221D] dark:text-[#FFF3E3] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624] transition-colors"
      >
        <LayoutDashboard className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
        <span>My Dashboard</span>
      </Link>
      <Link
        href={`${portalHref}/settings`}
        onClick={onClose}
        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#30221D] dark:text-[#FFF3E3] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624] transition-colors"
      >
        <Settings className="w-4 h-4 text-[#B77A36] dark:text-[#EAD2B0]" />
        <span>Account Settings</span>
      </Link>

      <div className="border-t border-[#EAD2B0] dark:border-[#4D3331] mt-1 pt-1">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors w-full text-left cursor-pointer"
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
    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#FFF3E3] dark:bg-[#2E1F1E] rounded-2xl shadow-xl border border-[#EAD2B0] dark:border-[#4D3331] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="px-3 py-1.5 border-b border-[#EAD2B0] dark:border-[#4D3331] mb-1">
        <p className="text-[10px] font-bold tracking-wider uppercase text-[#B77A36] dark:text-[#EAD2B0]">
          Evntora Portals
        </p>
      </div>
      {portalLinks.map((portal) => {
        const Icon = portal.icon;
        const isActive = pathname.startsWith(portal.path);
        return (
          <Link
            key={portal.href}
            href={portal.href}
            onClick={onClose}
            className={`flex items-start gap-2.5 px-3 py-2 rounded-xl mx-1 transition-colors ${
              isActive
                ? "bg-[#EAD2B0]/40 dark:bg-[#3D2624] text-[#681B1D] dark:text-[#EAD2B0] font-semibold"
                : "text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624]"
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#B77A36]" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">{portal.label}</p>
              <p className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7] leading-normal">
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
  const { user, profile, roles, isLoading, signOut } = useAuth();
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
    <header className="sticky top-0 z-50 w-full transition-all duration-300 py-2.5 px-3 sm:px-6 lg:px-8">
      <div
        className={`max-w-7xl mx-auto rounded-full transition-all duration-300 px-4 sm:px-6 py-1.5 border ${
          scrolled
            ? "bg-[#FFF3E3]/98 dark:bg-[#1A1211]/98 backdrop-blur-md border-[#EAD2B0] dark:border-[#4D3331] shadow-[0_8px_30px_rgba(75,17,23,0.12)]"
            : "bg-[#FFF3E3]/92 dark:bg-[#1A1211]/92 backdrop-blur-sm border-[#EAD2B0]/90 dark:border-[#4D3331]/90 shadow-[0_4px_24px_rgba(75,17,23,0.06)]"
        }`}
      >
        <div className="flex items-center justify-between h-[52px] gap-4 xl:gap-7">
          {/* ── 1. BRAND LOGO ── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0 pl-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#681B1D] to-[#4B1117] border border-[#B77A36]/70 flex items-center justify-center font-serif font-bold text-[#EAD2B0] text-xl shadow-xs group-hover:from-[#7A2124] group-hover:to-[#5C151D] transition-all">
              <span>E</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif tracking-widest text-[18px] sm:text-[20px] font-bold text-[#30221D] dark:text-[#FFF3E3] group-hover:text-[#681B1D] dark:group-hover:text-[#EAD2B0] transition-colors leading-none">
                EVNTORA
              </span>
              <span className="text-[8px] sm:text-[8.5px] tracking-[0.16em] uppercase text-[#B77A36] dark:text-[#EAD2B0] font-sans mt-0.5 hidden md:block">
                Luxury Event Planning
              </span>
            </div>
          </Link>

          {/* ── 2. CENTER NAVIGATION ITEMS (PROPORTIONAL, BALANCED) ── */}
          <nav className="hidden xl:flex flex-1 items-center justify-center gap-4 2xl:gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs xl:text-[13px] font-semibold transition-colors py-1.5 px-1 relative ${
                    isActive
                      ? "text-[#681B1D] dark:text-[#EAD2B0]"
                      : "text-[#59453E] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#FFF3E3]"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#681B1D] dark:bg-[#EAD2B0] rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Portals Dropdown Trigger */}
            <div className="relative" ref={portalsMenuRef}>
              <button
                type="button"
                onClick={() => setPortalsMenuOpen(!portalsMenuOpen)}
                className={`text-xs xl:text-[13px] font-semibold transition-colors flex items-center gap-1 py-1.5 px-1 cursor-pointer ${
                  pathname.startsWith("/dashboard") ||
                  pathname.startsWith("/vendor-portal") ||
                  pathname.startsWith("/admin")
                    ? "text-[#681B1D] dark:text-[#EAD2B0]"
                    : "text-[#59453E] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#FFF3E3]"
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

          {/* ── 3. RIGHT ACTION CLUSTER ── */}
          <div className="hidden xl:flex items-center gap-4 shrink-0 pr-1">
            {/* Theme Selector */}
            <ThemeToggle />

            {!isLoading && (
              <>
                {isAuthenticated ? (
                  /* Account Menu */
                  <div className="relative" ref={accountMenuRef}>
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFCF6]/80 dark:bg-[#2E1F1E] hover:bg-[#FAF3E8] dark:hover:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] transition-all text-xs cursor-pointer shadow-xs"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#681B1D] flex items-center justify-center text-[#FFF3E3] font-bold text-[11px] shrink-0">
                        {profile?.full_name?.charAt(0)?.toUpperCase() ?? (
                          <User className="w-3 h-3" />
                        )}
                      </div>
                      <span className="text-[#30221D] dark:text-[#FFF3E3] font-semibold max-w-[90px] truncate">
                        {profile?.full_name?.split(" ")[0] ?? "Account"}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#7D6B63] dark:text-[#D4C3B7] transition-transform duration-200 ${
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
                    className="group flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] border border-[#B77A36]/60 text-xs font-bold tracking-wide text-[#FFF3E3] shadow-md hover:shadow-lg transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B77A36] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF3E3] dark:focus-visible:ring-offset-[#1A1211]"
                  >
                    <span>Sign In</span>
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-[#EAD2B0] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </>
            )}

          </div>

          {/* ── MOBILE MENU TRIGGER ── */}
          <div className="flex xl:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 border border-[#EAD2B0] dark:border-[#4D3331] cursor-pointer"
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
        <div className="xl:hidden mt-2 max-w-7xl mx-auto rounded-2xl bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] px-5 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-0.5">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 hover:text-[#681B1D] transition-colors"
            >
              <span>Home</span>
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 hover:text-[#681B1D] transition-colors"
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-[#EAD2B0] dark:border-[#4D3331]">
            <p className="text-[10px] font-bold text-[#B77A36] dark:text-[#EAD2B0] uppercase tracking-widest px-3 mb-2">
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
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0] bg-[#FFFCF6] dark:bg-[#2E1F1E] hover:bg-[#EAD2B0]/30 transition-colors border border-[#EAD2B0] dark:border-[#4D3331]"
                  >
                    <Icon className="w-4 h-4 text-[#B77A36]" />
                    <div>
                      <p className="text-xs font-semibold">{portal.label}</p>
                      <p className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7] font-normal">
                        {portal.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
            {isAuthenticated ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#681B1D] flex items-center justify-center text-[#FFF3E3] font-bold text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#30221D] dark:text-[#FFF3E3]">
                      {profile?.full_name}
                    </p>
                    <p className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7] capitalize">
                      {roles.join(" + ") || "Member"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
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
                className="group flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] border border-[#B77A36]/60 text-xs font-bold tracking-wide text-[#FFF3E3] shadow-md hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B77A36]"
              >
                <span>Sign In</span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-[#EAD2B0] transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}

          </div>
        </div>
      )}
    </header>
  );
}
