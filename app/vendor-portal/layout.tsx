// "use client";

// import Link from "next/link";
// import { Suspense } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useState } from "react";
// import { useAuth } from "@/lib/auth-context";
// import { RequireRole } from "@/components/auth/RequireRole";
// import { PortalAccessNotice } from "@/components/auth/PortalAccessNotice";
// import { WorkspaceSwitchLinks } from "@/components/auth/WorkspaceSwitchLinks";
// import { WorkspaceActivityMenu } from "@/components/layout/WorkspaceActivityMenu";
// import { ThemeToggle } from "@/components/ui/ThemeToggle";
// import { Building2, CalendarDays, ChevronDown, CreditCard, LayoutDashboard, LogOut, Menu, ShieldCheck, Store, UserRound, X } from "lucide-react";

// const primary = [
//   { section: "overview", label: "Overview", icon: LayoutDashboard },
//   { section: "bookings", label: "Bookings", icon: CalendarDays },
//   { section: "availability", label: "Availability Calendar", icon: CalendarDays },
//   { section: "finances", label: "Finances", icon: CreditCard },
//   { section: "reviews", label: "Reviews", icon: ShieldCheck },
// ];
// const groups = [
//   { label: "My Business", icon: Building2, items: [{ section: "business-profile", label: "Business Profile" }, { section: "locations", label: "Locations & Service Areas" }, { section: "portfolio", label: "Portfolio" }, { section: "verification", label: "Verification & Documents" }, { section: "storefront", label: "Public Storefront" }] },
//   { label: "Listings & Services", icon: Store, items: [{ section: "listings", label: "All Listings" }, { section: "create-listing", label: "Create New Listing" }, { section: "published", label: "Published" }, { section: "drafts", label: "Drafts" }, { section: "pending-approval", label: "Pending Approval" }, { section: "rejected", label: "Rejected / Needs Changes" }, { section: "packages", label: "Packages & Pricing" }] },
// ];

// function VendorPortalShell({ children }: { children: React.ReactNode }) {
//   const { signOut, profile, user, vendorProfile } = useAuth();
//   const search = useSearchParams();
//   const router = useRouter();
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const [accountOpen, setAccountOpen] = useState(false);
//   const [expanded, setExpanded] = useState<Record<string, boolean>>({ "My Business": true, "Listings & Services": true });
//   const section = search.get("section") || "overview";
//   const sectionHref = (value: string) => `/vendor-portal?section=${encodeURIComponent(value)}`;
//   const select = (value: string) => { router.push(sectionHref(value)); setMobileOpen(false); };
//   const handleSignOut = async () => { await signOut(); window.location.assign("/"); };
//   const activeClass = "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/30";
//   const inactiveClass = "text-[#7D6B63] dark:text-[#D4C3B7] hover:bg-[#EAD2B0]/50 dark:hover:bg-[#2E1F1E] hover:text-[#681B1D] dark:hover:text-[#FFF3E3]";
//   const navContent = <>
//     <nav aria-label="Vendor navigation" className="flex-1 space-y-1 overflow-y-auto py-5">
//       {primary.map(({ section: target, label, icon: Icon }) => <button key={target} type="button" onClick={() => select(target)} aria-current={section === target ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all ${section === target ? activeClass : `border-transparent ${inactiveClass}`}`}><Icon className="h-4 w-4"/><span>{label}</span>{section === target && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EAD2B0]"/>}</button>)}
//       {groups.map((group) => { const Icon = group.icon; const open = expanded[group.label]; const groupActive = group.items.some((item) => item.section === section); return <div key={group.label} className="pt-2">
//         <button type="button" aria-expanded={open} onClick={() => setExpanded((value) => ({ ...value, [group.label]: !value[group.label] }))} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${groupActive ? "text-[#681B1D] dark:text-[#EAD2B0]" : inactiveClass}`}><Icon className="h-4 w-4 text-[#B77A36]"/><span className="flex-1">{group.label}</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}/></button>
//         {open && <div className="ml-5 space-y-1 border-l border-[#EAD2B0] pl-3 dark:border-[#4D3331]">{group.items.map((item) => <button key={item.section} type="button" onClick={() => select(item.section)} aria-current={section === item.section ? "page" : undefined} className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${section === item.section ? "bg-[#EAD2B0]/60 font-semibold text-[#681B1D] dark:bg-[#2E1F1E] dark:text-[#EAD2B0]" : inactiveClass}`}>{item.label}</button>)}</div>}
//       </div>; })}
//     </nav>
//     <div className="border-t border-[#EAD2B0] pt-3 dark:border-[#4D3331]"><div className="mb-3"><WorkspaceActivityMenu workspace="vendor" placement="sidebar"/></div><div className="relative">
//       <button type="button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen} className="flex w-full items-center gap-3 rounded-2xl border border-[#EAD2B0] bg-[#FFF3E3] p-2.5 text-left hover:border-[#B77A36] dark:border-[#4D3331] dark:bg-[#2E1F1E]"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#B77A36]/50 bg-[#681B1D] font-serif font-bold text-[#EAD2B0]">{profile?.full_name?.charAt(0)?.toUpperCase() || "E"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{profile?.full_name || "Your account"}</span><span className="block truncate text-[11px] text-[#7D6B63] dark:text-[#D4C3B7]">{user?.email}</span></span><ChevronDown className={`h-4 w-4 transition-transform ${accountOpen ? "rotate-180" : ""}`}/></button>
//       {accountOpen && <div className="absolute bottom-full left-0 right-0 z-40 mb-2 rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-2 shadow-xl dark:border-[#4D3331] dark:bg-[#241918]"><Link href="/account/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]"><UserRound className="h-4 w-4 text-[#B77A36]"/>My Profile & Settings</Link><WorkspaceSwitchLinks className="my-2 border-y border-[#EAD2B0] py-2 dark:border-[#4D3331]"/><button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"><LogOut className="h-4 w-4"/>Sign Out</button></div>}
//     </div></div>
//   </>;
//   return <RequireRole role="vendor"><div data-evntora-theme="portal" className="min-h-screen bg-[#FFF3E3] font-sans text-[#30221D] transition-colors dark:bg-[#1A1211] dark:text-[#FFF3E3]"><PortalAccessNotice/><div className="flex min-h-screen">
//     <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[#EAD2B0] bg-[#FFFCF6] px-4 py-5 dark:border-[#4D3331] dark:bg-[#241918] lg:flex"><div className="flex items-center justify-between border-b border-[#EAD2B0] px-2 pb-5 dark:border-[#4D3331]"><Link href="/vendor-portal" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#681B1D] font-serif text-xl font-bold text-[#B77A36] shadow-md">E</span><span><span className="block font-serif text-lg font-bold tracking-[0.18em] text-[#681B1D] dark:text-[#EAD2B0]">EVNTORA</span><span className="block text-[9px] uppercase tracking-[0.2em] text-[#B77A36]">Vendor workspace</span></span></Link><ThemeToggle/></div>{navContent}</aside>
//     {mobileOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm"/><aside className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col border-r border-[#EAD2B0] bg-[#FFFCF6] p-4 dark:border-[#4D3331] dark:bg-[#241918]"><div className="flex items-center justify-between border-b border-[#EAD2B0] pb-4 dark:border-[#4D3331]"><Link href="/vendor-portal" className="font-serif text-lg font-bold tracking-[0.18em] text-[#681B1D] dark:text-[#EAD2B0]">EVNTORA</Link><button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="rounded-xl p-2 hover:bg-[#EAD2B0]/50"><X className="h-5 w-5"/></button></div>{navContent}</aside></div>}


//     {/* <div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#EAD2B0] bg-[#FFFCF6]/95 px-4 py-3 backdrop-blur-md dark:border-[#4D3331] dark:bg-[#241918]/95 sm:px-6"> */}
//     <div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#EAD2B0] bg-[#FFFCF6]/95 px-4 py-3 backdrop-blur-md dark:border-[#4D3331] dark:bg-[#241918]/95 sm:px-6">


//     <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-xl border border-[#EAD2B0] p-2 lg:hidden dark:border-[#4D3331]"><Menu className="h-5 w-5"/></button><span className="text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">Vendo Hub</span></div><span className="lg:hidden"><ThemeToggle/></span></header><main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main></div>
//   </div></div></RequireRole>;

// }

// export default function VendorPortalLayout({ children }: { children: React.ReactNode }) {
//   return <Suspense fallback={<div className="min-h-screen bg-[#FFF3E3] dark:bg-[#1A1211]" />}><VendorPortalShell>{children}</VendorPortalShell></Suspense>;
// }



"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RequireRole } from "@/components/auth/RequireRole";
import { PortalAccessNotice } from "@/components/auth/PortalAccessNotice";
import { WorkspaceSwitchLinks } from "@/components/auth/WorkspaceSwitchLinks";
import { WorkspaceActivityMenu } from "@/components/layout/WorkspaceActivityMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";

const primary = [
  { section: "overview", label: "Overview", icon: LayoutDashboard },
  { section: "bookings", label: "Bookings", icon: CalendarDays },
  { section: "availability", label: "Availability Calendar", icon: CalendarDays },
  { section: "finances", label: "Finances", icon: CreditCard },
  { section: "reviews", label: "Reviews", icon: ShieldCheck },
];

const groups = [
  {
    label: "My Business",
    icon: Building2,
    items: [
      { section: "business-profile", label: "Business Profile" },
      { section: "locations", label: "Locations & Service Areas" },
      { section: "portfolio", label: "Portfolio" },
      { section: "verification", label: "Verification & Documents" },
      { section: "storefront", label: "Public Storefront" },
    ],
  },
  {
    label: "Listings & Services",
    icon: Store,
    items: [
      { section: "listings", label: "All Listings" },
      { section: "create-listing", label: "Create New Listing" },
      { section: "published", label: "Published" },
      { section: "drafts", label: "Drafts" },
      { section: "pending-approval", label: "Pending Approval" },
      { section: "rejected", label: "Rejected / Needs Changes" },
      { section: "packages", label: "Packages & Pricing" },
    ],
  },
];

function VendorPortalShell({ children }: { children: React.ReactNode }) {
  const { signOut, profile, user } = useAuth();
  const search = useSearchParams();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // const [expanded, setExpanded] = useState<Record<string, boolean>>({
  //   "My Business": true,
  //   "Listings & Services": true,
  // });

  const [expanded, setExpanded] = useState<string | null>(null);

  const section = search.get("section") || "overview";

  const sectionHref = (value: string) =>
    `/vendor-portal?section=${encodeURIComponent(value)}`;

  const select = (value: string) => {
    router.push(sectionHref(value));
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };

  const activeClass =
    "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/30";

  const inactiveClass =
    "text-[#7D6B63] dark:text-[#D4C3B7] hover:bg-[#EAD2B0]/50 dark:hover:bg-[#2E1F1E] hover:text-[#681B1D] dark:hover:text-[#FFF3E3]";

  const navContent = (
    <>
      <nav
        aria-label="Vendor navigation"
        className="flex-1 space-y-1 overflow-y-auto py-5"
      >
        {primary.map(({ section: target, label, icon: Icon }) => (
          <button
            key={target}
            type="button"
            onClick={() => select(target)}
            aria-current={section === target ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all ${
              section === target
                ? activeClass
                : `border-transparent ${inactiveClass}`
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>

            {section === target && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EAD2B0]" />
            )}
          </button>
        ))}

        {groups.map((group) => {
          const Icon = group.icon;
          // const open = expanded[group.label];
          const open = expanded === group.label;

          const groupActive = group.items.some(
            (item) => item.section === section
          );

          return (
            <div key={group.label} className="pt-2">
              <button
                type="button"
                aria-expanded={open}
                // onClick={() =>
                //   setExpanded((value) => ({
                //     ...value,
                //     [group.label]: !value[group.label],
                //   }))
                // }
                onClick={() =>
  setExpanded((current) =>
    current === group.label ? null : group.label
  )
}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${
                  groupActive
                    ? "text-[#681B1D] dark:text-[#EAD2B0]"
                    : inactiveClass
                }`}
              >
                <Icon className="h-4 w-4 text-[#B77A36]" />

                <span className="flex-1">{group.label}</span>

                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open && (
                <div className="ml-5 space-y-1 border-l border-[#EAD2B0] pl-3 dark:border-[#4D3331]">
                  {group.items.map((item) => (
                    <button
                      key={item.section}
                      type="button"
                      onClick={() => select(item.section)}
                      aria-current={
                        section === item.section ? "page" : undefined
                      }
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                        section === item.section
                          ? "bg-[#EAD2B0]/60 font-semibold text-[#681B1D] dark:bg-[#2E1F1E] dark:text-[#EAD2B0]"
                          : inactiveClass
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[#EAD2B0] pt-3 dark:border-[#4D3331]">
        <div className="mb-3">
          <WorkspaceActivityMenu
            workspace="vendor"
            placement="sidebar"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((value) => !value)}
            aria-expanded={accountOpen}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#EAD2B0] bg-[#FFF3E3] p-2.5 text-left hover:border-[#B77A36] dark:border-[#4D3331] dark:bg-[#2E1F1E]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#B77A36]/50 bg-[#681B1D] font-serif font-bold text-[#EAD2B0]">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "E"}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {profile?.full_name || "Your account"}
              </span>

              <span className="block truncate text-[11px] text-[#7D6B63] dark:text-[#D4C3B7]">
                {user?.email}
              </span>
            </span>

            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                accountOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {accountOpen && (
            <div className="absolute bottom-full left-0 right-0 z-40 mb-2 rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-2 shadow-xl dark:border-[#4D3331] dark:bg-[#241918]">
              <Link
                href="/account/settings"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]"
              >
                <UserRound className="h-4 w-4 text-[#B77A36]" />
                My Profile & Settings
              </Link>

              <WorkspaceSwitchLinks className="my-2 border-y border-[#EAD2B0] py-2 dark:border-[#4D3331]" />

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <RequireRole role="vendor">
      <div
        data-evntora-theme="portal"
        className="min-h-screen bg-[#FFF3E3] font-sans text-[#30221D] transition-colors dark:bg-[#1A1211] dark:text-[#FFF3E3]"
      >
        <PortalAccessNotice />

        <div className="flex min-h-screen">
          {/* Desktop Sidebar */}
          <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[#EAD2B0] bg-[#FFFCF6] px-4 py-5 dark:border-[#4D3331] dark:bg-[#241918] lg:flex">
            <div className="flex items-center justify-between border-b border-[#EAD2B0] px-2 pb-5 dark:border-[#4D3331]">
              <Link
                href="/vendor-portal"
                className="flex items-center gap-3"
              >
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#681B1D] font-serif text-xl font-bold text-[#B77A36] shadow-md">
                  E
                </span>

                <span>
                  <span className="block font-serif text-lg font-bold tracking-[0.18em] text-[#681B1D] dark:text-[#EAD2B0]">
                    EVNTORA
                  </span>

                  <span className="block text-[9px] uppercase tracking-[0.2em] text-[#B77A36]">
                    Vendor workspace
                  </span>
                </span>
              </Link>

              <ThemeToggle />
            </div>

            {navContent}
          </aside>

          {/* Mobile Sidebar */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <button
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              <aside className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col border-r border-[#EAD2B0] bg-[#FFFCF6] p-4 dark:border-[#4D3331] dark:bg-[#241918]">
                <div className="flex items-center justify-between border-b border-[#EAD2B0] pb-4 dark:border-[#4D3331]">
                  <Link
                    href="/vendor-portal"
                    className="font-serif text-lg font-bold tracking-[0.18em] text-[#681B1D] dark:text-[#EAD2B0]"
                  >
                    EVNTORA
                  </Link>

                  <button
                    aria-label="Close navigation"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl p-2 hover:bg-[#EAD2B0]/50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {navContent}
              </aside>
            </div>
          )}

          {/* Main Content - No Vendor Hub Header */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Mobile-only navigation header */}
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#EAD2B0] bg-[#FFFCF6]/95 px-4 py-3 backdrop-blur-md dark:border-[#4D3331] dark:bg-[#241918]/95 sm:px-6 lg:hidden">
              <button
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-[#EAD2B0] p-2 dark:border-[#4D3331]"
              >
                <Menu className="h-5 w-5" />
              </button>

              <ThemeToggle />
            </header>

            {/* Page Content */}
            <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}

export default function VendorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF3E3] dark:bg-[#1A1211]" />
      }
    >
      <VendorPortalShell>{children}</VendorPortalShell>
    </Suspense>
  );
}