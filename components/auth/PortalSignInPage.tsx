"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";
import { authorizedWorkspaces, portalHome, rememberWorkspace, workspaceForPath, type PortalIntent } from "@/lib/portal-routing";
import { Sparkles, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";

function safeInternalRedirect(value: string, origin: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return false;
  try { return new URL(value, origin).origin === origin; } catch { return false; }
}

function SignInForm({ forcedPortal }: { forcedPortal?: PortalIntent }) {
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo") ?? searchParams.get("redirect") ?? "";
  const requestedPortalValue = forcedPortal ?? searchParams.get("portal");
  const requestedPortal: PortalIntent | null = requestedPortalValue === "customer" || requestedPortalValue === "vendor" || requestedPortalValue === "admin" ? requestedPortalValue : null;
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "unauthorized"
      ? "You don't have permission to access that page."
      : errorParam === "auth_unavailable"
      ? "Account access is temporarily unavailable. Please try again shortly."
      : errorParam === "session_expired"
      ? "Your session expired. Sign in again to continue."
      : errorParam
      ? decodeURIComponent(errorParam)
      : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(
    messageParam === "verified"
      ? "Email verified! You can now sign in."
      : messageParam === "reset_sent"
      ? "Password reset email sent. Check your inbox."
      : messageParam === "password_reset"
      ? "Password updated successfully. Please sign in with your new password."
      : null
  );

  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted || !session?.user) return;

        const { data: memberships, error: membershipError } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("is_active", true);
        if (membershipError) { if (isMounted) setError("Account access is temporarily unavailable. Please try again."); return; }
        const roles = (memberships ?? []).map((item) => item.role);
        const requestedHasAccess = requestedPortal && (roles.includes(requestedPortal) || (requestedPortal === "admin" && roles.includes("platform_owner")));
        if (requestedPortal && !requestedHasAccess) {
          if (requestedPortal === "vendor") {
            const { data: application, error: applicationError } = await supabase.from("vendor_profiles").select("approval_status").eq("user_id", session.user.id).maybeSingle();
            if (applicationError) { if (isMounted) setError("We couldn’t verify your vendor application status."); return; }
            if (application && application.approval_status !== "approved") {
              window.location.assign("/vendor-portal");
              return;
            }
          }
          if (isMounted) setError(requestedPortal === "admin" ? "This account does not have authorized administrator access." : requestedPortal === "vendor" ? "This account does not have Vendor access yet. Register your business to add it." : "Customer access is not enabled for this account.");
          return;
        }
        const workspaces = authorizedWorkspaces(roles as UserRole[]);
        const role = requestedPortal ? requestedPortal : workspaces[0] ?? null;
        if (!role) { if (isMounted) setError("Your account is signed in, but its Evntora access setup is incomplete. Contact support."); return; }
        let vendorApproved = false;
        if (roles.includes("vendor")) {
          const { data: vp, error: vendorError } = await supabase.from("vendor_profiles").select("approval_status").eq("user_id", session.user.id).maybeSingle();
          if (vendorError) { if (isMounted) setError("We couldn’t verify your vendor application status."); return; }
          vendorApproved = vp?.approval_status === "approved";
        }

        if (!isMounted) return;
        const requestedTarget = safeInternalRedirect(rawRedirectTo, window.location.origin) ? rawRedirectTo : "";
        const targetPath = requestedTarget.split(/[?#]/, 1)[0];
        const protectedTargetRole = workspaceForPath(targetPath);
        const publicTarget = requestedTarget && !protectedTargetRole && !targetPath.startsWith("/signin") && !targetPath.startsWith("/signup") && targetPath !== "/admin/signin";
        if (workspaces.length > 1 && !publicTarget) {
          const target = requestedTarget ? `?returnTo=${encodeURIComponent(requestedTarget)}` : "";
          window.location.assign(`/workspaces${target}`);
          return;
        }
        rememberWorkspace(role, session.user.id);
        const allowedTarget = requestedTarget && (!protectedTargetRole || protectedTargetRole === role);
        window.location.assign(allowedTarget ? requestedTarget : portalHome(role, vendorApproved));
      } catch (err) {
        console.warn("Session check error:", err);
      }
    }

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [requestedPortal]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    let redirectUrl: string | null = null;
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setError("Sign-in failed. Please verify your credentials and try again.");
        setIsLoading(false);
        return;
      }

      const { data: memberships, error: membershipError } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("is_active", true);
      if (membershipError) {
        setError("We could not verify your account roles. Please refresh and try again.");
        setIsLoading(false);
        return;
      }

      const assignedRoles = (memberships ?? []).map((item) => item.role as UserRole);
      const workspaces = authorizedWorkspaces(assignedRoles);
      const has = (r: UserRole) => assignedRoles.includes(r);
      const isAdminUser = has("admin") || has("platform_owner");

      if (requestedPortal && !workspaces.includes(requestedPortal)) {
        if (requestedPortal === "vendor") {
          const { data: application, error: applicationError } = await supabase.from("vendor_profiles").select("approval_status").eq("user_id", data.user.id).maybeSingle();
          if (applicationError) {
            setError("We couldn’t verify your vendor application status. Please try again.");
            setIsLoading(false);
            return;
          }
          if (application && application.approval_status !== "approved") {
            redirectUrl = "/vendor-portal";
            window.location.assign(redirectUrl);
            return;
          }
        }
        setError(requestedPortal === "admin" ? "This account does not have authorized administrator access." : requestedPortal === "vendor" ? "This account does not have Vendor access yet. Register your business to add it." : "Customer access is not enabled for this account.");
        setIsLoading(false);
        return;
      }

      let vendorApproved = false;
      if (has("vendor")) {
        const { data: vp } = await supabase.from("vendor_profiles").select("approval_status").eq("user_id", data.user.id).maybeSingle();
        vendorApproved = vp?.approval_status === "approved";
      }

      const primaryRole = requestedPortal || workspaces[0] || null;

      if (!primaryRole) {
        setError("Your account is signed in, but no portal access is assigned.");
        setIsLoading(false);
        return;
      }

      redirectUrl = portalHome(primaryRole, vendorApproved);

      if (safeInternalRedirect(rawRedirectTo, window.location.origin)) {
        const path = rawRedirectTo.split(/[?#]/, 1)[0];
        const targetsAdmin = path === "/admin" || path.startsWith("/admin/");
        const targetsVendor = path === "/vendor-portal" || path.startsWith("/vendor-portal/");
        const targetsCustomer = path === "/dashboard" || path.startsWith("/dashboard/");
        const sameRoleTarget = (targetsAdmin && isAdminUser) || (targetsVendor && has("vendor")) || (targetsCustomer && has("customer"));
        const safePublicTarget = !targetsAdmin && !targetsVendor && !targetsCustomer && !path.startsWith("/signin") && !path.startsWith("/signup") && path !== "/admin/signin";
        const customerOnlyTarget = path === "/checkout";
        if (sameRoleTarget || (safePublicTarget && (!customerOnlyTarget || has("customer")))) redirectUrl = rawRedirectTo;
      }

      const redirectPath = redirectUrl.split(/[?#]/, 1)[0];
      const redirectRole = workspaceForPath(redirectPath);
      const isPublicDestination = safeInternalRedirect(redirectUrl, window.location.origin) && !redirectRole && !redirectPath.startsWith("/signin") && !redirectPath.startsWith("/signup") && redirectPath !== "/admin/signin";
      if (workspaces.length > 1 && !isPublicDestination) {
        redirectUrl = `/workspaces${safeInternalRedirect(rawRedirectTo, window.location.origin) ? `?returnTo=${encodeURIComponent(rawRedirectTo)}` : ""}`;
      } else {
        rememberWorkspace(primaryRole, data.user.id);
      }

      window.location.assign(redirectUrl);
    } catch (err: unknown) {
      console.error("Sign-in submission error:", err);
      setError("An unexpected sign-in error occurred. Please try again.");
    } finally {
      if (!redirectUrl) {
        setIsLoading(false);
      }
    }
  };

  const title = requestedPortal === "admin" ? "Administrator Sign In" : requestedPortal === "vendor" ? "Vendor Sign In" : requestedPortal === "customer" ? "Customer Sign In" : "Welcome Back";
  const description = requestedPortal === "admin" ? "Authorized administrators only. Access is checked against your Evntora account role." : requestedPortal === "vendor" ? "Sign in to manage your vendor profile and business." : requestedPortal === "customer" ? "Sign in to plan and manage your events." : "Sign in to your Evntora workspace to continue planning";

  return (
    <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#681B1D] to-[#4B1117] flex items-center justify-center font-serif font-bold text-[#EAD2B0] text-xl shadow-xs border border-[#B77A36]/60">
            E
          </div>
        </Link>
        <h1 className="text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
          {title}
        </h1>
        <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
          {description}
        </p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#B77A36]/40 text-xs text-[#681B1D] dark:text-[#EAD2B0]">
          <span className="shrink-0 mt-0.5">✓</span>
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sign In Form */}
      <form onSubmit={handleSignIn} className="space-y-4 text-xs">
        <div>
          <label htmlFor="email" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF3E3]/60 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#9E897F] focus:outline-none focus:border-[#B77A36] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-[#7D6B63] dark:text-[#D4C3B7] font-medium">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline transition-colors text-[11px] font-semibold"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FFF3E3]/60 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#9E897F] focus:outline-none focus:border-[#B77A36] transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#30221D] dark:hover:text-[#FFF3E3] cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 border border-[#B77A36]/40"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#FFF3E3] border-t-transparent rounded-full animate-spin" />
              <span>Signing in...</span>
            </span>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0]" />
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#EAD2B0]" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7] pt-2 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
        {requestedPortal === "admin" ? (
          <p>
            Administrator access is assigned by Evntora.{" "}
            <Link href="/signin?portal=customer" className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold">
              Customer sign in
            </Link>
          </p>
        ) : (
          <>
            <p>
              {requestedPortal === "vendor" ? "New vendor?" : "Don’t have an account?"}{" "}
              <Link
                href={requestedPortal === "vendor" ? "/signup/vendor" : `/signup?portal=customer${rawRedirectTo ? `&redirectTo=${encodeURIComponent(rawRedirectTo)}` : ""}`}
                className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold"
              >
                {requestedPortal === "vendor" ? "Register your business" : "Create a customer account"}
              </Link>
            </p>
            {requestedPortal !== "vendor" && (
              <p>
                Are you a vendor?{" "}
                <Link href="/signin?portal=vendor" className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold">
                  Vendor sign in
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function PortalSignInPage({ portal }: { portal?: PortalIntent }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] transition-colors duration-200">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="w-full max-w-md h-96 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] animate-pulse" />}>
          <SignInForm forcedPortal={portal} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function SignInPage() {
  return <PortalSignInPage />;
}
