"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";
import {
  Store,
  Coins,
  Users,
  Calendar,
  MessageSquare,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Eye,
  Check,
  X,
} from "lucide-react";

export default function VendorDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "leads" | "packages" | "calendar" | "reviews"
  >("leads");

  const [leads, setLeads] = useState([
    {
      id: "lead-01",
      client: "Aarav & Ananya Singhania",
      eventType: "Royal Destination Wedding (3-Day)",
      dates: "20-22 Nov 2026",
      guests: 350,
      budget: 8500000,
      status: "booked",
      city: "Mumbai",
      message: "Requesting full property buyout of lakeside lawn and 40 heritage suites.",
    },
    {
      id: "lead-02",
      client: "Kabir & Meera Roy",
      eventType: "Sangeet & Royal Pheras",
      dates: "14-15 Dec 2026",
      guests: 280,
      budget: 4500000,
      status: "new",
      city: "Delhi NCR",
      message: "Inquiring about heritage courtyard availability and royal boat arrival rights.",
    },
    {
      id: "lead-03",
      client: "Apex Global Ventures",
      eventType: "Annual Leadership Gala",
      dates: "10 Jan 2027",
      guests: 200,
      budget: 3200000,
      status: "proposal_sent",
      city: "Bengaluru",
      message: "Executive dining setup with technical staging on the promenade lawn.",
    },
  ]);

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D7] dark:border-[#344139] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold border border-[#173F35]/20 dark:border-[#A9C7B2]/30">
            <Store className="w-3.5 h-3.5 text-[#C6A66B] dark:text-[#D4B77D]" />
            <span>Artisan Partner Desk • The Oberoi Udaivilas</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Partner Operations Hub
          </h1>
          <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Manage incoming celebration enquiries, booking contracts, and calendar schedule
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 dark:border-[#A9C7B2]/30 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
            <span>Verified Artisan (Tier 1 Heritage Estate)</span>
          </span>
        </div>
      </div>

      {/* 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Gross Bookings Value
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#D4B77D]">
            ₹1.62 Cr
          </div>
          <div className="text-[11px] text-[#173F35] dark:text-[#A9C7B2] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+24% vs last quarter</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Active Client Leads
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            {leads.length} Active
          </div>
          <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] block">
            1 requires direct response today
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Confirmed Dates
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            18 Dates
          </div>
          <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] block">
            Nov 2026 - Feb 2027 season
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Artisan Rating
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-1.5">
            <span>4.95</span>
            <Star className="w-5 h-5 text-[#C6A66B] dark:text-[#D4B77D] fill-[#C6A66B] dark:fill-[#D4B77D]" />
          </div>
          <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] block">
            Based on 148 verified royal events
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E2D7] dark:border-[#344139] pb-3">
        {(["leads", "packages", "calendar", "reviews"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#232F28] dark:text-[#A9C7B2] shadow-xs"
                : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/50 dark:hover:bg-[#1C2520]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Incoming Enquiries & High-Value Proposals
            </h2>
            <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              Showing {leads.length} client requests
            </span>
          </div>

          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D7] dark:border-[#344139] pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                      {lead.client}
                    </h3>
                    <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                      {lead.eventType} • Origin: {lead.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] text-base">
                      {formatINR(lead.budget)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase ${
                        lead.status === "booked"
                          ? "bg-[#E7EFEA] text-[#173F35] dark:bg-[#173F35]/50 dark:text-[#A9C7B2]"
                          : lead.status === "proposal_sent"
                          ? "bg-[#F4EBD9] text-[#C6A66B] dark:bg-[#C6A66B]/20 dark:text-[#D4B77D]"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      }`}
                    >
                      {lead.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#77746D] dark:text-[#B5B5AA]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Dates: {lead.dates}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Expected Guests: {lead.guests}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span className="truncate">{lead.message}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {lead.status === "new" && (
                    <button
                      onClick={() => handleUpdateStatus(lead.id, "proposal_sent")}
                      className="px-3 py-1.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-[#C6A66B]" />
                      <span>Send Quote Proposal</span>
                    </button>
                  )}
                  {lead.status === "proposal_sent" && (
                    <button
                      onClick={() => handleUpdateStatus(lead.id, "booked")}
                      className="px-3 py-1.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A66B]" />
                      <span>Confirm Contract</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(lead.id, "declined")}
                    className="px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium transition-all cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-4">
          <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Active Service Packages & Buyouts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
              <span className="text-xs font-bold text-[#173F35] dark:text-[#F4F0E7] block">
                Full Palace Buyout (3 Nights)
              </span>
              <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                Exclusive access to all 87 rooms, poolside lawns, courtyards and lakeside dining.
              </p>
              <div className="font-serif font-bold text-[#173F35] dark:text-[#D4B77D] text-lg pt-1">
                ₹85,00,000 / event
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
              <span className="text-xs font-bold text-[#173F35] dark:text-[#F4F0E7] block">
                Heritage Courtyard & Sangeet Lawn
              </span>
              <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                Single evening buyout with royal illumination and heritage entrance protocols.
              </p>
              <div className="font-serif font-bold text-[#173F35] dark:text-[#D4B77D] text-lg pt-1">
                ₹25,00,000 / night
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-3">
          <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Season Availability (2026 - 2027)
          </h2>
          <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Peak auspicious wedding muhurat dates are currently 82% occupied.
          </p>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-3">
          <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Client Endorsements & Quality Metrics
          </h2>
          <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Verified reviews collected following post-event platform debriefs.
          </p>
        </div>
      )}
    </div>
  );
}
