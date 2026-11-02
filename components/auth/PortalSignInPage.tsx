"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";
import { portalHome, type PortalIntent } from "@/lib/portal-routing";
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

  // If already authenticated with a valid session, redirect immediately
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
          if (isMounted) setError(requestedPortal === "admin" ? "This account does not have authorized administrator access." : requestedPortal === "vendor" ? "This account does not have Vendor access yet. Register your business to add it." : "Customer access is not enabled for this account.");
          return;
        }
        const role = requestedPortal ? requestedPortal : roles.includes("customer") ? "customer" : roles.includes("vendor") ? "vendor" : roles.includes("admin") || roles.includes("platform_owner") ? "admin" : null;
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
        const allowedTarget = requestedPortal === "admin" ? targetPath.startsWith("/admin") : requestedPortal === "vendor" ? targetPath.startsWith("/vendor-portal") || targetPath === "/planner" : targetPath.startsWith("/dashboard") || targetPath === "/checkout" || targetPath === "/planner";
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
      // 1. Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Incorrect email or password. Please check your credentials and try again.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Please verify your email address before signing in. Check your inbox for the confirmation link.");
        } else {
          setError("Unable to sign in right now. Check your details and try again.");
        }
        return;
      }

      // 2. Verify session was successfully established
      if (!data.session || !data.user) {
        setError("Unable to establish a secure session. Please try again.");
        return;
      }

      // Active memberships are authoritative; a user may hold several portal memberships.
      const { data: memberships, error: membershipError } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("is_active", true);
      if (membershipError) { setError("Account access is temporarily unavailable. Please try again."); return; }
      const roles: UserRole[] = (memberships ?? []).map((item) => item.role);
      const has = (wanted: UserRole) => roles.includes(wanted) || (wanted === "admin" && roles.includes("platform_owner"));
      const userRole = requestedPortal ? (has(requestedPortal) ? requestedPortal : null) : has("customer") ? "customer" : has("vendor") ? "vendor" : has("admin") ? "admin" : null;
      if (!userRole) {
        setError(requestedPortal === "vendor" ? "This account is not a vendor yet. Register your business to add Vendor access." : requestedPortal === "admin" ? "This account does not have an authorized administrator role." : "Customer access is not enabled for this account.");
        return;
      }
      let vendorApproved = false;
      if (roles.includes("vendor")) {
        const { data: vp, error: vendorError } = await supabase.from("vendor_profiles").select("approval_status").eq("user_id", data.user.id).maybeSingle();
        if (vendorError) {
          setError("We couldn’t verify your vendor application status.");
          return;
        }
        vendorApproved = vp?.approval_status === "approved";
      }
      const defaultDestination = portalHome(userRole, vendorApproved);
      redirectUrl = defaultDestination;
      if (safeInternalRedirect(rawRedirectTo, window.location.origin)) {
        const path = rawRedirectTo.split(/[?#]/, 1)[0];
        const targetsAdmin = path === "/admin" || path.startsWith("/admin/");
        const targetsVendor = path === "/vendor-portal" || path.startsWith("/vendor-portal/");
        const targetsCustomer = path === "/dashboard" || path.startsWith("/dashboard/");
        const sameRoleTarget = (targetsAdmin && has("admin")) || (targetsVendor && has("vendor")) || (targetsCustomer && has("customer"));
        const safePublicTarget = !targetsAdmin && !targetsVendor && !targetsCustomer && !path.startsWith("/signin") && !path.startsWith("/signup") && path !== "/admin/signin";
        const customerOnlyTarget = path === "/checkout";
        if (sameRoleTarget || (safePublicTarget && (!customerOnlyTarget || has("customer")))) redirectUrl = rawRedirectTo;
      }

      // 6. Navigate to destination
      window.location.assign(redirectUrl);
    } catch (err: unknown) {
      console.error("Sign-in submission error:", err);
      setError(
        "An unexpected sign-in error occurred. Please try again."
      );
    } finally {
      if (!redirectUrl) {
        setIsLoading(false);
      }
    }
  };

  const title = requestedPortal === "admin" ? "Administrator Sign In" : requestedPortal === "vendor" ? "Vendor Sign In" : requestedPortal === "customer" ? "Customer Sign In" : "Welcome Back";
  const description = requestedPortal === "admin" ? "Authorized administrators only. Access is checked against your Evntora account role." : requestedPortal === "vendor" ? "Sign in to manage your vendor profile and business." : requestedPortal === "customer" ? "Sign in to plan and manage your events." : "Sign in to your Evntora workspace to continue planning";

  return (
    <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-[#173F35] flex items-center justify-center font-serif font-bold text-[#C6A66B] text-xl shadow-xs">
            E
          </div>
        </Link>
        <h1 className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
          {title}
        </h1>
        <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
          {description}
        </p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 dark:border-[#A9C7B2]/30 text-xs text-[#173F35] dark:text-[#A9C7B2]">
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
          <label htmlFor="email" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-[#77746D] dark:text-[#B5B5AA] font-medium">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[#173F35] dark:text-[#A9C7B2] hover:underline transition-colors text-[11px] font-semibold"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77746D] dark:text-[#B5B5AA] hover:text-[#252522] dark:hover:text-[#F4F0E7] cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#FAF8F3] border-t-transparent rounded-full animate-spin" />
              <span>Signing in...</span>
            </span>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-[#77746D] dark:text-[#B5B5AA] pt-2 border-t border-[#E8E2D7] dark:border-[#344139] space-y-3">
        {requestedPortal === "admin" ? <p>Administrator access is assigned by Evntora. <Link href="/signin?portal=customer" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">Customer sign in</Link></p> : <>
          <p>{requestedPortal === "vendor" ? "New vendor?" : "Don’t have an account?"}{" "}<Link href={requestedPortal === "vendor" ? "/signup/vendor" : `/signup?portal=customer${rawRedirectTo ? `&redirectTo=${encodeURIComponent(rawRedirectTo)}` : ""}`} className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">{requestedPortal === "vendor" ? "Register your business" : "Create a customer account"}</Link></p>
          {requestedPortal !== "vendor" && <p>Are you a vendor? <Link href="/signin?portal=vendor" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">Vendor sign in</Link></p>}
        </>}
      </div>
    </div>
  );
}

export function PortalSignInPage({ portal }: { portal?: PortalIntent }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="w-full max-w-md h-96 rounded-3xl bg-white dark:bg-[#232F28] animate-pulse" />}>
          <SignInForm forcedPortal={portal} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function SignInPage() { return <PortalSignInPage />; }
