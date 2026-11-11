"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { authorizedWorkspaces, rememberWorkspace, workspacePath, type PortalIntent } from "@/lib/portal-routing";
import { Building2, CalendarDays, ShieldCheck } from "lucide-react";

const labels: Record<PortalIntent, { label: string; icon: typeof CalendarDays }> = {
  customer: { label: "Customer Workspace", icon: CalendarDays },
  vendor: { label: "Vendor Hub", icon: Building2 },
  admin: { label: "Admin Desk", icon: ShieldCheck },
};

export function WorkspaceSwitchLinks({ className = "" }: { className?: string }) {
  const { user, roles, vendorProfile } = useAuth();
  const workspaces = authorizedWorkspaces(roles);
  const pendingVendor = Boolean(vendorProfile && vendorProfile.approval_status !== "approved" && !roles.includes("vendor"));
  if (!user || (workspaces.length < 2 && !pendingVendor)) return null;
  return <nav aria-label="Switch workspace" className={className}>
    <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0]">Switch workspace</p>
    {workspaces.map((role) => { const { label, icon: Icon } = labels[role]; return <Link key={role} href={workspacePath(role, vendorProfile?.approval_status === "approved")} onClick={() => rememberWorkspace(role, user.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E] transition-colors"><Icon className="w-3.5 h-3.5 text-[#B77A36]"/>{label}</Link>; })}
    {pendingVendor && <Link href="/vendor-portal" onClick={() => rememberWorkspace("vendor", user.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E] transition-colors"><Building2 className="w-3.5 h-3.5 text-[#B77A36]"/>Vendor Hub · Approval pending</Link>}
  </nav>;
}
