"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AlertCircle } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "unknown_error";
  const description = error === "vendor_registration_failed"
    ? "Your email was verified, but your business application could not be saved. Sign in, open Vendor Registration, and retry. Your account remains available."
    : error === "invalid_vendor_registration"
    ? "Your email was verified, but the business details were incomplete or invalid. Sign in and resubmit the vendor application."
    : searchParams.get("description") ?? "An authentication error occurred. The link may have expired or already been used.";

  return (
    <div className="w-full max-w-md p-10 rounded-3xl bg-[#0d0f18]/90 border border-rose-500/20 shadow-2xl text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400" />
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-white">Authentication Error</h2>
        <p className="text-sm text-slate-400 mt-2">{description}</p>
        {error && (
          <p className="text-[11px] text-slate-600 mt-2 font-mono">Code: {error}</p>
        )}
      </div>
      <div className="space-y-2">
        <Link
          href={error === "vendor_registration_failed" || error === "invalid_vendor_registration" ? "/signup/vendor" : "/auth/forgot-password"}
          className="block w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm text-center"
        >
          {error === "vendor_registration_failed" || error === "invalid_vendor_registration" ? "Retry Vendor Application" : "Request New Link"}
        </Link>
        <Link
          href="/signin"
          className="block w-full py-3 rounded-xl border border-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-900 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <Suspense fallback={<div className="w-full max-w-md h-80 rounded-3xl bg-[#0d0f18]/90 animate-pulse" />}>
          <AuthErrorContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

