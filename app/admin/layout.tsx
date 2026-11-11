"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { RequireRole } from "@/components/auth/RequireRole";
import { WorkspaceSwitchLinks } from "@/components/auth/WorkspaceSwitchLinks";
import { LayoutDashboard, Users, Store, CalendarDays, MessageSquareText, ChartNoAxesColumn, ShieldCheck, Settings2, Bell, LogOut, Menu, X, ChevronDown } from "lucide-react";

type Permission = "vendor_read" | "vendor_verification" | "listing_moderation" | "user_read" | "user_manage" | "booking_support" | "support_read" | "finance_read" | "refund_issue" | "analytics_finance" | "admin_message";
const navigation: Array<{ href: string; label: string; icon: typeof LayoutDashboard; section: string; permissions: Permission[]; ownerOnly?: boolean }> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "Main", permissions: [] },
  { href: "/admin/users", label: "Users", icon: Users, section: "Management", permissions: ["user_read"] },
  { href: "/admin/marketplace", label: "Marketplace", icon: Store, section: "Management", permissions: ["vendor_read", "vendor_verification", "listing_moderation"] },
  { href: "/admin/bookings", label: "Bookings & Payments", icon: CalendarDays, section: "Management", permissions: ["booking_support", "finance_read"] },
  { href: "/admin/reviews-support", label: "Reviews & Support", icon: MessageSquareText, section: "Management", permissions: ["support_read", "listing_moderation"] },
  { href: "/admin/analytics", label: "Analytics", icon: ChartNoAxesColumn, section: "Insights", permissions: ["analytics_finance", "user_read", "vendor_read", "finance_read"] },
  { href: "/admin/administrators", label: "Admin Management", icon: ShieldCheck, section: "System", permissions: [], ownerOnly: true },
  { href: "/admin/settings", label: "Platform Settings", icon: Settings2, section: "System", permissions: [], ownerOnly: true },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, roles, signOut } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const owner = roles.includes("platform_owner");

  useEffect(() => {
    let cancelled = false;
    async function loadPermissions() {
      if (!user) return;
      const { data, error } = await supabase.rpc("current_admin_permissions");
      if (cancelled) return;
      setRolePermissions(error ? [] : (data ?? []) as Permission[]);
      setPermissionLoading(false);
    }
    void loadPermissions();
    return () => { cancelled = true; };
  }, [user, roles]);

  const can = (permissions: Permission[]) => owner || permissions.length === 0 || permissions.some((permission) => rolePermissions.includes(permission));
  const visibleNavigation = useMemo(() => navigation.filter((item) => (!item.ownerOnly || owner) && can(item.permissions)), [owner, rolePermissions]);
  const canMessage = owner || rolePermissions.includes("admin_message");
  const canNotifications = owner || rolePermissions.length > 0;
  useEffect(() => {
    if (!canMessage && !canNotifications) return;
    let cancelled = false;
    const refresh = async () => {
      const [notifications, messages] = await Promise.all([
        canNotifications ? fetch("/api/admin/notifications?unread=1", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
        canMessage ? fetch("/api/admin/messages?unread=1", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
      ]);
      if (!cancelled) { setUnreadNotifications(notifications?.unreadCount ?? 0); setUnreadMessages(messages?.unreadCount ?? 0); }
    };
    void refresh(); const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [canMessage, canNotifications]);

  if (pathname === "/admin/signin") return <>{children}</>;
  const onSignOut = async () => { await signOut(); window.location.assign("/"); };
  const sections = ["Main", "Management", "Insights", "System"];
  const name = profile?.full_name || user?.email || "Administrator";
  const email = profile?.email || user?.email || "";
  return <RequireRole role="admin"><div data-evntora-theme="portal" className="min-h-screen bg-[#FFF3E3] text-[#30221D] dark:bg-[#1A1211] dark:text-[#F4F0E7] lg:flex">
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}
    <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#EAD2B0] bg-[#FFFCF6] transition-transform dark:border-[#4D3331] dark:bg-[#241918] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}>
      <div className="flex items-center justify-between border-b border-[#EAD2B0] p-5 dark:border-[#4D3331]"><Link href="/" aria-label="Evntora home" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#681B1D] font-serif text-xl text-[#EAD2B0]">E</span><span><span className="block font-serif tracking-[.22em] text-[#681B1D] dark:text-[#EAD2B0]">EVNTORA</span><span className="text-[10px] uppercase tracking-widest text-[#B77A36]">Admin Workspace</span></span></Link><div className="flex items-center gap-2"><ThemeToggle/><button className="lg:hidden" aria-label="Close menu" onClick={() => setSidebarOpen(false)}><X size={18}/></button></div></div>
      <div className="flex-1 overflow-y-auto px-3 py-5">{sections.map((section) => { const items = visibleNavigation.filter((item) => item.section === section); if (!items.length) return null; return <section key={section} className="mb-6"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#B77A36]">{section}</p><nav className="space-y-1">{items.map((item) => { const Icon = item.icon; const active = item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-[#681B1D] font-semibold text-[#FFF3E3] shadow-sm" : "text-[#715D54] hover:bg-[#F5E5D0] hover:text-[#681B1D] dark:text-[#D4C3B7] dark:hover:bg-[#342322]"}`}><Icon size={17}/>{item.label}</Link>; })}</nav></section>; })}{!permissionLoading && visibleNavigation.length === 1 && !owner && <p className="mx-3 rounded-xl border border-[#EAD2B0] p-3 text-xs text-[#7D6B63]">Your administrator access is limited to the sections assigned to your role.</p>}</div>
      <div className="space-y-3 border-t border-[#EAD2B0] p-3 dark:border-[#4D3331]">{(canMessage || canNotifications) && <div className={`grid gap-2 ${canMessage && canNotifications ? "grid-cols-2" : "grid-cols-1"}`}>{canMessage && <Link href="/admin/messages" className="relative flex items-center justify-center gap-2 rounded-xl border border-[#EAD2B0] px-2 py-2.5 text-xs font-medium text-[#681B1D] hover:bg-[#F5E5D0] dark:border-[#4D3331] dark:text-[#EAD2B0]"><MessageSquareText size={15}/>Messages{unreadMessages > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#681B1D] px-1.5 text-[9px] text-white">{unreadMessages}</span>}</Link>}{canNotifications && <Link href="/admin/notifications" className="relative flex items-center justify-center gap-2 rounded-xl border border-[#EAD2B0] px-2 py-2.5 text-xs font-medium text-[#681B1D] hover:bg-[#F5E5D0] dark:border-[#4D3331] dark:text-[#EAD2B0]"><Bell size={15}/>Alerts{unreadNotifications > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#681B1D] px-1.5 text-[9px] text-white">{unreadNotifications}</span>}</Link>}</div>}
        <details className="group rounded-2xl border border-[#EAD2B0] bg-[#FFF3E3] dark:border-[#4D3331] dark:bg-[#2E1F1E]"><summary className="flex cursor-pointer list-none items-center gap-3 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#681B1D] font-serif text-[#EAD2B0]">{name[0]?.toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs text-[#7D6B63]">{email}</span></span><ChevronDown size={16}/></summary><div className="space-y-1 border-t border-[#EAD2B0] p-2 dark:border-[#4D3331]"><Link href="/account/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/70 dark:hover:bg-[#241918]">My Profile & Settings</Link><WorkspaceSwitchLinks className="space-y-1 [&_a]:block [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:text-sm [&_a:hover]:bg-white/70"/><button onClick={() => void onSignOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300"><LogOut size={15}/>Sign out</button></div></details>
      </div>
    </aside>
    <div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#EAD2B0] bg-[#FFF3E3]/95 px-4 py-3 backdrop-blur dark:border-[#4D3331] dark:bg-[#1A1211]/95 lg:hidden"><button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-lg border border-[#EAD2B0] p-2"><Menu size={18}/></button><span className="font-serif text-[#681B1D] dark:text-[#EAD2B0]">Evntora Admin</span><ThemeToggle/></header><main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-9">{children}</main></div>
  </div></RequireRole>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) { return <AdminShell>{children}</AdminShell>; }
