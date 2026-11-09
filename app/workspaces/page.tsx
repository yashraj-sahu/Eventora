"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authorizedWorkspaces, portalHome, rememberWorkspace, rememberedWorkspace, workspaceForPath, type PortalIntent } from "@/lib/portal-routing";

const options: Record<PortalIntent, { title: string; description: string; icon: typeof CalendarDays }> = {
  customer: { title: "Customer Workspace", description: "Plan celebrations, organize event details and manage bookings.", icon: CalendarDays },
  vendor: { title: "Vendor Hub", description: "Manage your business profile, services and booking activity.", icon: Building2 },
  admin: { title: "Admin Desk", description: "Oversee platform operations and authorized administration.", icon: ShieldCheck },
};

function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;
  const path = value.split(/[?#]/, 1)[0];
  if (["/signin", "/signup", "/workspaces", "/admin/signin"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  const origin = typeof window === "undefined" ? "https://evntora.invalid" : window.location.origin;
  try { return new URL(value, origin).origin === origin ? value : null; } catch { return null; }
}

function WorkspaceChooser() {
  const { user, roles, isLoading, rolesError, vendorProfile } = useAuth();
  const searchParams = useSearchParams();
  const [selecting, setSelecting] = useState<PortalIntent | null>(null);
  const workspaces = useMemo(() => authorizedWorkspaces(roles), [roles]);
  const [lastWorkspace, setLastWorkspace] = useState<PortalIntent | null>(null);
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  useEffect(() => { setLastWorkspace(rememberedWorkspace(roles, user?.id)); }, [roles, user?.id]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const suffix = returnTo ? `?redirectTo=${encodeURIComponent(`/workspaces?returnTo=${encodeURIComponent(returnTo)}`)}` : "";
      window.location.replace(`/signin${suffix}`);
      return;
    }
    if (rolesError) return;
    if (!workspaces.length) {
      window.location.replace("/signin?error=unauthorized");
      return;
    }
    if (workspaces.length === 1) {
      const role = workspaces[0];
      rememberWorkspace(role, user.id);
      const targetRole = returnTo ? workspaceForPath(new URL(returnTo, window.location.origin).pathname) : null;
      const target = returnTo && (!targetRole || targetRole === role) ? returnTo : portalHome(role, vendorProfile?.approval_status === "approved");
      window.location.replace(target);
    }
  }, [isLoading, user, rolesError, workspaces, returnTo, vendorProfile]);

  const choose = (role: PortalIntent) => {
    if (!user || !workspaces.includes(role)) return;
    setSelecting(role);
    rememberWorkspace(role, user.id);
    const targetRole = returnTo ? workspaceForPath(new URL(returnTo, window.location.origin).pathname) : null;
    const target = returnTo && (!targetRole || targetRole === role) ? returnTo : portalHome(role, vendorProfile?.approval_status === "approved");
    window.location.assign(target);
  };

  return <main className="min-h-screen bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] px-4 py-12 sm:py-20">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10"><span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD2B0]/50 text-[#681B1D] dark:text-[#EAD2B0] text-[10px] font-bold uppercase tracking-[.18em]"><Sparkles className="w-3.5 h-3.5"/>Evntora Workspaces</span><h1 className="mt-4 text-3xl sm:text-4xl font-serif font-bold">Where would you like to go?</h1><p className="mt-3 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Choose an authorized workspace for this session.</p></div>
      {isLoading || (user && workspaces.length < 2 && !rolesError) ? <div role="status" className="mx-auto max-w-lg rounded-3xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFFCF6] dark:bg-[#241918] p-10 text-center text-sm text-[#7D6B63]">Loading your account access…</div> : rolesError ? <div role="alert" className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">We couldn’t verify your workspace access. Refresh and try again.</div> : <div className={`grid gap-4 ${workspaces.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 max-w-3xl mx-auto"}`}>
        {workspaces.map((role) => { const item = options[role]; const Icon = item.icon; return <button key={role} type="button" disabled={Boolean(selecting)} onClick={() => choose(role)} className="group text-left p-6 sm:p-7 rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B77A36]"><span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#681B1D] to-[#4B1117] border border-[#B77A36]/40 text-[#EAD2B0] flex items-center justify-center"><Icon className="w-5 h-5"/></span><span className="mt-5 flex items-center justify-between gap-3"><span className="font-serif text-xl font-bold">{item.title}</span><ArrowRight className="w-4 h-4 text-[#B77A36] transition-transform group-hover:translate-x-1"/></span><span className="mt-2 block text-sm leading-relaxed text-[#7D6B63] dark:text-[#D4C3B7]">{item.description}</span>{lastWorkspace === role && <span className="mt-3 inline-flex rounded-full bg-[#EAD2B0]/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#681B1D] dark:text-[#EAD2B0]">Last used</span>}{selecting === role && <span className="mt-4 block text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">Opening workspace…</span>}</button>; })}
      </div>}
    </div>
  </main>;
}

export default function WorkspacesPage() {
  return <Suspense fallback={<main className="min-h-screen grid place-items-center bg-[#FFF3E3] dark:bg-[#1A1211] text-sm text-[#7D6B63]">Loading your workspaces…</main>}><WorkspaceChooser /></Suspense>;
}
