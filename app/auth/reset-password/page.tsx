"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // The auth callback will have set the session from the URL hash/code
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsValidSession(Boolean(session));
      setIsChecking(false);
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/signin?message=password_reset"), 2500);
      }
    } catch (err: unknown) {
      console.error("Password reset exception:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="w-full max-w-md h-80 rounded-3xl bg-[#0d0f18]/90 animate-pulse" />
    );
  }

  if (!isValidSession) {
    return (
      <div className="w-full max-w-md p-10 rounded-3xl bg-[#0d0f18]/90 border border-rose-500/20 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Link Expired or Invalid</h2>
          <p className="text-sm text-slate-400 mt-2">
            This password reset link has expired or is invalid. Please request a new one.
          </p>
        </div>
        <Link
          href="/auth/forgot-password"
          className="block w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm text-center"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md p-10 rounded-3xl bg-[#0d0f18]/90 border border-emerald-500/20 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Password Updated</h2>
          <p className="text-sm text-slate-400 mt-2">
            Your password has been changed successfully. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#0d0f18]/90 border border-amber-500/20 shadow-2xl backdrop-blur-md space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center font-serif font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            E
          </div>
        </Link>
        <h1 className="text-2xl font-serif font-bold text-white">Set New Password</h1>
        <p className="text-xs text-slate-400">Choose a strong password for your account</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4 text-xs">
        <div>
          <label htmlFor="password" className="block text-slate-400 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-slate-400 mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-600 focus:outline-none transition-colors ${
                confirmPassword && confirmPassword !== password
                  ? "border-rose-500/50"
                  : "border-slate-800 focus:border-amber-400"
              }`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="w-full max-w-md h-80 rounded-3xl bg-[#0d0f18]/90 animate-pulse" />}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

