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
  }, [isLoading, user, profile, role, pathname, hasRole, rolesError, profileError]);

  if (isLoading || !user) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#FFF3E3] dark:bg-[#1A1211] text-[#681B1D] dark:text-[#EAD2B0] text-sm">
        Checking account access…
      </main>
    );
  }
  if (rolesError || profileError) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#FFF3E3] dark:bg-[#1A1211] p-6 text-[#30221D] dark:text-[#FFF3E3]">
        <div className="max-w-md space-y-4 text-center p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl">
          <h1 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
            Account access is temporarily unavailable
          </h1>
          <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            We couldn’t load your account details. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] px-6 py-2.5 text-xs font-semibold text-[#FFF3E3] border border-[#B77A36]/40 shadow-sm cursor-pointer"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#FFF3E3] dark:bg-[#1A1211] p-6 text-[#30221D] dark:text-[#FFF3E3]">
        <div className="max-w-md space-y-4 text-center p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl">
          <h1 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
            Account setup is incomplete
          </h1>
          <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            Your signed-in account is missing its Evntora profile.
          </p>
          <button
            onClick={() => void signOut()}
            className="rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] px-6 py-2.5 text-xs font-semibold text-[#FFF3E3] border border-[#B77A36]/40 shadow-sm cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }
  if (!hasRole(role)) {
    if (role === "admin") {
      return (
        <main className="min-h-screen grid place-items-center bg-[#FFF3E3] dark:bg-[#1A1211] p-6 text-[#30221D] dark:text-[#FFF3E3]">
          <div className="max-w-md space-y-4 text-center p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl">
            <h1 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
              Administrator access required
            </h1>
            <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Admin access is invitation-only. Contact a Platform Owner if you need access.
            </p>
            <a
              className="inline-block rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] px-6 py-2.5 text-xs font-semibold text-[#FFF3E3] border border-[#B77A36]/40 shadow-sm"
              href="/admin/signin"
            >
              Admin sign in
            </a>
          </div>
        </main>
      );
    }
    const isVendor = role === "vendor";
    return (
      <main className="min-h-screen grid place-items-center bg-[#FFF3E3] dark:bg-[#1A1211] p-6 text-[#30221D] dark:text-[#FFF3E3]">
        <div className="max-w-md space-y-4 text-center p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl">
          <h1 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
            {isVendor ? "Enable Vendor access" : "Enable Customer access"}
          </h1>
          <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            Your account can use more than one Evntora portal.{" "}
            {isVendor
              ? "Create a vendor application to access vendor tools."
              : "Enable customer access to plan and manage events."}
          </p>
          {isVendor ? (
            <a
              className="inline-block rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] px-6 py-2.5 text-xs font-semibold text-[#FFF3E3] border border-[#B77A36]/40 shadow-sm"
              href="/signup/vendor"
            >
              Register your business
            </a>
          ) : (
            <button
              disabled={enabling}
              onClick={async () => {
                setEnabling(true);
                setEnableError("");
                const response = await fetch("/api/auth/roles", { method: "POST" });
                if (!response.ok) {
                  setEnableError("Customer access could not be enabled. Please try again.");
                  setEnabling(false);
                  return;
                }
                window.location.assign("/dashboard");
              }}
              className="rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] px-6 py-2.5 text-xs font-semibold text-[#FFF3E3] border border-[#B77A36]/40 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {enabling ? "Enabling…" : "Enable Customer access"}
            </button>
          )}
          {enableError && <p role="alert" className="text-xs text-red-700">{enableError}</p>}
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
