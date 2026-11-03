"use client";

import Link from "next/link";
import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { MessageSquare, ArrowRight, Store, Calendar, Users, Coins } from "lucide-react";

export default function EnquiriesPage() {
  const { state } = useEvntoraStore();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="space-y-1 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Vendor Proposals & Enquiries</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
          Active Vendor Enquiries
        </h1>
        <p className="text-xs text-[#D4C3B7]">
          Direct quotes, proposals, and communication status with shortlisted event artisans
        </p>
      </div>

      <div className="space-y-4">
        {state.enquiries.map((enq) => (
          <div
            key={enq.id}
            className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 hover:border-amber-500/30 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">{enq.vendorName}</h3>
                  <span className="text-[11px] text-[#D4C3B7]">{enq.vendorCategory} • Request ID: {enq.id}</span>
                </div>
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    enq.status === "booked"
                      ? "bg-rose-900/10 text-amber-700 border border-rose-900/20"
                      : enq.status === "replied"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {enq.status === "booked" ? "Contract Booked" : enq.status === "replied" ? "Proposal Received" : "Enquiry Transmitted"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#D4C3B7]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Date: {enq.eventDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{enq.guestCount} Guests</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Budget: {formatINR(enq.estimatedBudget)}</span>
              </div>
              <div className="text-[#D4C3B7] text-right">
                Sent: {new Date(enq.createdAt).toLocaleDateString()}
              </div>
            </div>

            <p className="text-xs text-[#D4C3B7] bg-[#1A1211]/60 p-4 rounded-xl border border-[#4D3331] leading-relaxed italic">
              &ldquo;{enq.message}&rdquo;
            </p>

            <div className="flex justify-end pt-2">
              <Link
                href={`/vendors/${enq.vendorId}`}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>View Vendor Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

