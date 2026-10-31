"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";
import { Sparkles, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";

function SignInForm() {
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo") ?? "";
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "unauthorized"
      ? "You don't have permission to access that page."
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

        let role: UserRole = "customer";
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.role) {
            role = profile.role;
          } else {
            const metaRole = session.user.user_metadata?.role as UserRole;
            if (metaRole === "admin" || metaRole === "vendor" || metaRole === "customer") {
              role = metaRole;
            }
          }
        } catch {
          const metaRole = session.user.user_metadata?.role as UserRole;
          if (metaRole === "admin" || metaRole === "vendor" || metaRole === "customer") {
            role = metaRole;
          }
        }

        if (!isMounted) return;
        const destination = role === "admin" ? "/admin" : role === "vendor" ? "/vendor-portal" : "/dashboard";
        window.location.assign(destination);
      } catch (err) {
        console.warn("Session check error:", err);
      }
    }

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

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
          setError(authError.message || "Failed to sign in. Please try again.");
        }
        return;
      }

      // 2. Verify session was successfully established
      if (!data.session || !data.user) {
        setError("Unable to establish a secure session. Please try again.");
        return;
      }

      // 3. Retrieve user profile role with graceful fallback
      let userRole: UserRole = "customer";
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("Profile retrieval warning:", profileError.message);
        }

        if (profile?.role) {
          userRole = profile.role;
        } else {
          const metaRole = data.user.user_metadata?.role as UserRole;
          if (metaRole === "admin" || metaRole === "vendor" || metaRole === "customer") {
            userRole = metaRole;
          }
        }
      } catch (err) {
        console.warn("Exception during profile lookup:", err);
      }

      // 4. Determine authorized destination
      let defaultDestination = "/dashboard";
      if (userRole === "admin") {
        defaultDestination = "/admin";
      } else if (userRole === "vendor") {
        defaultDestination = "/vendor-portal";
      } else {
        defaultDestination = "/dashboard";
      }

      // 5. Evaluate requested redirect (prevent open redirects & redirect loops)
      redirectUrl = defaultDestination;
      if (
        rawRedirectTo &&
        rawRedirectTo.startsWith("/") &&
        !rawRedirectTo.startsWith("//") &&
        !rawRedirectTo.startsWith("/signin")
      ) {
        const targetingAdmin = rawRedirectTo.startsWith("/admin");
        const targetingVendor = rawRedirectTo.startsWith("/vendor-portal");
        const targetingCustomer = rawRedirectTo.startsWith("/dashboard");

        if (targetingAdmin && userRole === "admin") {
          redirectUrl = rawRedirectTo;
        } else if (targetingVendor && (userRole === "vendor" || userRole === "admin")) {
          redirectUrl = rawRedirectTo;
        } else if (targetingCustomer && (userRole === "customer" || userRole === "admin")) {
          redirectUrl = rawRedirectTo;
        } else if (!targetingAdmin && !targetingVendor && !targetingCustomer) {
          redirectUrl = rawRedirectTo;
        }
      }

      // 6. Navigate to destination
      window.location.assign(redirectUrl);
    } catch (err: unknown) {
      console.error("Sign-in submission error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign in. Please try again."
      );
    } finally {
      if (!redirectUrl) {
        setIsLoading(false);
      }
    }
  };

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
          Welcome Back
        </h1>
        <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
          Sign in to your Evntora workspace to continue planning
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
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
            Create your account
          </Link>
        </p>
        <p>
          Joining as a vendor?{" "}
          <Link href="/signup/vendor" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
            Vendor registration
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="w-full max-w-md h-96 rounded-3xl bg-white dark:bg-[#232F28] animate-pulse" />}>
          <SignInForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
