"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { portalHome, type PortalIntent } from "@/lib/portal-routing";

export function RequireRole({ role, children }: { role: PortalIntent; children: ReactNode }) {
  const { user, profile, vendorProfile, isLoading, signOut } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.replace(`/signin?portal=${role}&redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!profile) return;
    if (profile.role !== role) {
      window.location.replace(portalHome(profile.role, vendorProfile?.approval_status === "approved"));
    }
  }, [isLoading, user, profile, vendorProfile?.approval_status, role, pathname]);

  if (isLoading || !user || (profile && profile.role !== role)) {
    return <main className="min-h-screen grid place-items-center bg-[#FAF8F3] dark:bg-[#151B18] text-[#173F35] dark:text-[#F4F0E7]">Checking account access…</main>;
  }
  if (!profile) {
    return <main className="min-h-screen grid place-items-center bg-[#FAF8F3] dark:bg-[#151B18] p-6 text-[#173F35] dark:text-[#F4F0E7]"><div className="max-w-md space-y-4 text-center"><h1 className="text-xl font-serif font-bold">We couldn’t verify your account role</h1><p className="text-sm">Access stays closed until your Evntora profile can be verified.</p><button onClick={() => void signOut()} className="rounded-xl bg-[#173F35] px-4 py-2 text-sm text-white">Sign out</button></div></main>;
  }
  return <>{children}</>;
}
