"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Clock, CheckCircle, Mail, ArrowLeft } from "lucide-react";

export default function VendorPendingPage() {
  const { profile, vendorProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#07080b] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center font-serif font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            E
          </div>
          <span className="font-serif tracking-widest text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
            EVNTORA
          </span>
        </Link>

        {/* Status Icon */}
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-serif font-bold text-white">
            Application Under Review
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Thank you for registering{" "}
            <span className="text-amber-400 font-semibold">
              {vendorProfile?.business_name ?? profile?.full_name ?? "your business"}
            </span>{" "}
            as an Evntora partner. Our team is reviewing your application.
          </p>
        </div>

        {/* Steps */}
        <div className="text-left p-6 rounded-2xl bg-[#0d0f18] border border-slate-800 space-y-4">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Review Timeline
          </p>
          <div className="space-y-3">
            {[
              { step: "Application submitted", done: true },
              { step: "Identity & business verification", done: false },
              { step: "Profile review & quality check", done: false },
              { step: "Approval notification via email", done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                {item.done ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-700 shrink-0" />
                )}
                <span className={item.done ? "text-slate-300" : "text-slate-500"}>
                  {item.step}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Typical review time: 2–3 business days. You&apos;ll receive an email at{" "}
            <span className="text-amber-400">{profile?.email}</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Website
          </Link>
          <button
            onClick={signOut}
            className="px-5 py-2.5 rounded-xl text-slate-400 text-sm hover:text-white hover:bg-slate-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

