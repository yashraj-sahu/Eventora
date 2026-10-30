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
  const [activeTab, setActiveTab] = useState<"leads" | "packages" | "calendar" | "reviews">("leads");

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
      message: "Requesting full property buyout of lakeside lawn and 40 suites.",
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
      message: "Inquiring about heritage courtyard availability and boat arrival rights.",
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
      message: "Executive dining setup with technical staging on the outer lawn.",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <Store className="w-3.5 h-3.5" />
            <span>Artisan Portal • The Oberoi Udaivilas</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            Partner Operations Hub
          </h1>
          <p className="text-xs text-slate-400">
            Manage incoming celebration leads, booking contracts, and availability calendar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile Verified (Tier 1 Royal Estate)</span>
          </span>
        </div>
      </div>

      {/* 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Gross Bookings Value
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-400">
            ₹1.62 Cr
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+24% vs last wedding season</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            High-Value Inquiries
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white">
            {leads.length} Active
          </div>
          <div className="text-[11px] text-slate-400">Avg Budget: ₹54 Lakhs</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Profile Inquiries & Views
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white">
            3,420
          </div>
          <div className="text-[11px] text-slate-400">Past 30 days on Evntora</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Artisan Rating
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span>4.9</span>
          </div>
          <div className="text-[11px] text-slate-400">142 verified client reviews</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("leads")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "leads"
              ? "bg-amber-500 text-slate-950 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Customer Inquiries ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "packages"
              ? "bg-amber-500 text-slate-950 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Published Packages
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "calendar"
              ? "bg-amber-500 text-slate-950 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Availability Calendar
        </button>
      </div>

      {/* Tab 1: Leads */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">{lead.client}</h3>
                  <span className="text-xs text-amber-400 font-semibold">{lead.eventType}</span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
                    lead.status === "booked"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : lead.status === "proposal_sent"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {lead.status === "booked" ? "Contract Booked" : lead.status === "proposal_sent" ? "Proposal Sent" : "New Lead"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Target Dates</span>
                  <span>{lead.dates}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Attendees</span>
                  <span>{lead.guests} Guests</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Budget (INR)</span>
                  <span className="font-bold text-white">{formatINR(lead.budget)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Client City</span>
                  <span>{lead.city}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 leading-relaxed italic">
                &ldquo;{lead.message}&rdquo;
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                {lead.status !== "booked" && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(lead.id, "declined")}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(lead.id, "proposal_sent")}
                      className="px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold"
                    >
                      Send Customized Proposal
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(lead.id, "booked")}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
                    >
                      Confirm Booking
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Packages */}
      {activeTab === "packages" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-white">Royal 3-Day Wedding Residency</h3>
              <span className="text-lg font-bold text-amber-400">{formatINR(8500000)}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Full buyout of lakeside gardens, heritage courtyard staging, and 40 luxury suites.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>• Private royal boat transfer for baraat</li>
              <li>• Exclusive 3-day residency setup</li>
              <li>• Full banquet setup and sound staging rights</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-white">Palace Gala & Banquet Evening</h3>
              <span className="text-lg font-bold text-amber-400">{formatINR(3500000)}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Main heritage courtyard access with banquet seating for up to 300 guests.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>• Silver-tier banquet setup</li>
              <li>• Architectural wash lighting included</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Calendar */}
      {activeTab === "calendar" && (
        <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <h3 className="text-lg font-serif font-bold text-white">Autumn & Winter Season Availability</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">Nov 2026</span>
              <span className="text-emerald-400 font-bold block">12 Dates Open</span>
              <span className="text-slate-500 text-[10px]">Peak Wedding Season</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">Dec 2026</span>
              <span className="text-amber-400 font-bold block">6 Dates Open</span>
              <span className="text-slate-500 text-[10px]">High Demand</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">Jan 2027</span>
              <span className="text-emerald-400 font-bold block">18 Dates Open</span>
              <span className="text-slate-500 text-[10px]">Winter Galas</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">Feb 2027</span>
              <span className="text-emerald-400 font-bold block">14 Dates Open</span>
              <span className="text-slate-500 text-[10px]">Spring Celebrations</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

