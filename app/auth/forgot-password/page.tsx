"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        }
      );

      if (resetError) {
        setError("We couldn’t send a recovery link. Check the email address and try again.");
      } else {
        setSent(true);
      }
    } catch (err: unknown) {
      console.error("Forgot password exception:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-md p-10 rounded-3xl bg-[#1A1211]/90 border border-rose-900/20 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-900/10 border border-rose-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-amber-700" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Check Your Email</h2>
          <p className="text-sm text-[#D4C3B7] mt-2">
            We&apos;ve sent password reset instructions to{" "}
            <span className="text-amber-400 font-semibold">{email}</span>.
            The link expires in 1 hour.
          </p>
        </div>
        <p className="text-xs text-[#9E897F]">
          Didn&apos;t receive it? Check spam, or{" "}
          <button
            onClick={() => setSent(false)}
            className="text-amber-400 hover:underline"
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/signin"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#4D3331] text-[#D4C3B7] text-sm font-medium hover:bg-[#2E1F1E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#1A1211]/90 border border-amber-500/20 shadow-2xl backdrop-blur-md space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center font-serif font-black text-[#1A1211] text-xl shadow-lg shadow-amber-500/20">
            E
          </div>
        </Link>
        <h1 className="text-2xl font-serif font-bold text-white">Reset Password</h1>
        <p className="text-xs text-[#D4C3B7]">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label htmlFor="email" className="block text-[#D4C3B7] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#9E897F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1A1211] border border-[#4D3331] text-white placeholder-[#9E897F] focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#1A1211] font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <Link
        href="/signin"
        className="flex items-center justify-center gap-1.5 text-xs text-[#D4C3B7] hover:text-amber-400 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Sign In
      </Link>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div data-evntora-theme="portal" className="min-h-screen flex flex-col bg-[#08090d] text-[#FFF3E3]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="w-full max-w-md h-80 rounded-3xl bg-[#1A1211]/90 animate-pulse" />}>
          <ForgotPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

