"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Clock, CheckCircle, ArrowLeft } from "lucide-react";

export default function VendorPendingPage() {
  const { profile, vendorProfile, signOut } = useAuth();
  const status = vendorProfile?.approval_status;
  const handleSignOut = async () => { await signOut(); window.location.assign("/"); };

  return (
    <div className="min-h-screen bg-[#07080b] text-[#FFF3E3] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center font-serif font-black text-[#1A1211] text-xl shadow-lg shadow-amber-500/20">
            E
          </div>
          <span className="font-serif tracking-widest text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
            EVNTORA
          </span>
        </Link>

        {/* Status Icon */}
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
          {status === "approved" ? <CheckCircle className="w-10 h-10 text-amber-700" /> : <Clock className="w-10 h-10 text-amber-400" />}
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-serif font-bold text-white">
            {!status ? "Application Status Unavailable" : status === "pending" ? "Application Under Review" : status === "rejected" ? "Application Not Approved" : status === "suspended" ? "Vendor Listing Suspended" : "Vendor Approved"}
          </h1>
          <p className="text-[#D4C3B7] text-sm leading-relaxed">
            {!status ? "We couldn’t load your vendor application. Sign out and try again, or contact Evntora support." : status === "pending" ? "Thank you for registering " : status === "rejected" ? "Your vendor application was not approved. Contact Evntora support if you need clarification. " : status === "suspended" ? "Your vendor listing is currently suspended. Contact Evntora support for assistance. " : "Your vendor account is approved. Open your portal to manage your business. "}
            {status === "pending" && <>
            <span className="text-amber-400 font-semibold">
              {vendorProfile?.business_name ?? profile?.full_name ?? "your business"}
            </span>{" "}
            as an Evntora partner. Our team is reviewing your application.
            </>}
          </p>
        </div>

        {/* Steps */}
        {status === "pending" && <div className="p-6 rounded-2xl bg-[#1A1211] border border-[#4D3331] space-y-2"><p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Application status</p><p className="text-xs text-[#D4C3B7]">Your listing is not visible in the marketplace until an administrator approves and publishes it.</p><p className="text-[11px] text-[#9E897F]">Account email: <span className="text-amber-400">{profile?.email}</span></p></div>}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#4D3331] text-[#D4C3B7] text-sm font-medium hover:bg-[#2E1F1E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Website
          </Link>
          <button
            onClick={() => void handleSignOut()}
            className="px-5 py-2.5 rounded-xl text-[#D4C3B7] text-sm hover:text-white hover:bg-[#2E1F1E] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

