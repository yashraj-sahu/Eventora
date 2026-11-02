"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { PortalIntent } from "@/lib/portal-routing";

export function RequireRole({ role, children }: { role: PortalIntent; children: ReactNode }) {
  const { user, profile, isLoading, hasRole, rolesError, profileError, signOut } = useAuth();
  const pathname = usePathname();
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.replace(`/signin?portal=${role}&redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (rolesError || profileError || !profile) return;
    if (!hasRole(role)) {
      return;
    }
  }, [isLoading, user, profile, role, pathname, hasRole, rolesError, profileError]);

  if (isLoading || !user) {
    return <main className="min-h-screen grid place-items-center bg-[#FAF8F3] dark:bg-[#151B18] text-[#173F35] dark:text-[#F4F0E7]">Checking account access…</main>;
  }
  if (rolesError || profileError) {
    return <main className="min-h-screen grid place-items-center bg-[#FAF8F3] dark:bg-[#151B18] p-6 text-[#173F35] dark:text-[#F4F0E7]"><div className="max-w-md space-y-4 text-center"><h1 className="text-xl font-serif font-bold">Account access is temporarily unavailable</h1><p className="text-sm">We couldn’t load your account details. Please try again.</p><button onClick={() => window.location.reload()} className="rounded-xl bg-[#173F35] px-4 py-2 text-sm text-white">Try again</button></div></main>;
  }
  if (!profile) {
    return <main className="min-h-screen grid place-items-center bg-[#FAF8F3] dark:bg-[#151B18] p-6 text-[#173F35] dark:text-[#F4F0E7]"><div className="max-w-md space-y-4 text-center"><h1 className="text-xl font-serif font-bold">Account setup is incomplete</h1><p className="text-sm">Your signed-in account is missing its Evntora profile.</p><button onClick={() => void signOut()} className="rounded-xl bg-[#173F35] px-4 py-2 text-sm text-white">Sign out</button></div></main>;
  }
  if (!hasRole(role)) {
    if (role === "admin") return <main className="min-h-screen grid place-items-center bg-[#FAF8F3] dark:bg-[#151B18] p-6 text-[#173F35] dark:text-[#F4F0E7]"><div className="max-w-md space-y-4 text-center"><h1 className="text-xl font-serif font-bold">Administrator access required</h1><p className="text-sm">Admin access is invitation-only. Contact a Platform Owner if you need access.</p><a className="inline-block rounded-xl bg-[#173F35] px-4 py-2 text-sm text-white" href="/admin/signin">Admin sign in</a></div></main>;
    const isVendor = role === "vendor";
    return <main className="min-h-screen grid place-items-center bg-[#FAF8F3] dark:bg-[#151B18] p-6 text-[#173F35] dark:text-[#F4F0E7]"><div className="max-w-md space-y-4 text-center"><h1 className="text-xl font-serif font-bold">{isVendor ? "Enable Vendor access" : "Enable Customer access"}</h1><p className="text-sm">Your account can use more than one Evntora portal. {isVendor ? "Create a vendor application to access vendor tools." : "Enable customer access to plan and manage events."}</p>{isVendor ? <a className="inline-block rounded-xl bg-[#173F35] px-4 py-2 text-sm text-white" href="/signup/vendor">Register your business</a> : <button disabled={enabling} onClick={async () => { setEnabling(true); setEnableError(""); const response = await fetch("/api/auth/roles", { method: "POST" }); if (!response.ok) { setEnableError("Customer access could not be enabled. Please try again."); setEnabling(false); return; } window.location.assign("/dashboard"); }} className="rounded-xl bg-[#173F35] px-4 py-2 text-sm text-white disabled:opacity-60">{enabling ? "Enabling…" : "Enable Customer access"}</button>}{enableError && <p role="alert" className="text-sm text-red-700">{enableError}</p>}</div></main>;
  }
  return <>{children}</>;
}
