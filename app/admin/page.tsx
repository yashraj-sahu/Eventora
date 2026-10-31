"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";
import {
  ShieldCheck,
  Coins,
  Users,
  Store,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  TrendingUp,
  Search,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [activeTab, setActiveTab] = useState<"vendors" | "events" | "users">(
    "vendors"
  );

  const [pendingVendors, setPendingVendors] = useState([
    {
      id: "pv-01",
      business: "Taj Falaknuma Palace",
      category: "Venues",
      city: "Hyderabad",
      appliedDate: "2026-10-28",
      insuranceVerified: true,
      licenseVerified: true,
      status: "pending",
    },
    {
      id: "pv-02",
      business: "Royal Rajputana Dhol & Troupes",
      category: "Entertainment",
      city: "Jaipur",
      appliedDate: "2026-10-29",
      insuranceVerified: true,
      licenseVerified: false,
      status: "pending",
    },
    {
      id: "pv-03",
      business: "Saffron & Spice Luxury Catering",
      category: "Caterers",
      city: "Delhi NCR",
      appliedDate: "2026-10-30",
      insuranceVerified: true,
      licenseVerified: true,
      status: "pending",
    },
  ]);

  const handleApprove = (id: string) => {
    setPendingVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "approved" } : v))
    );
  };

  const handleReject = (id: string) => {
    setPendingVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "rejected" } : v))
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D7] dark:border-[#344139] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold border border-[#173F35]/20 dark:border-[#A9C7B2]/30">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C6A66B] dark:text-[#D4B77D]" />
            <span>Evntora Platform Governance</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Admin Master Console
          </h1>
          <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Nationwide operational telemetry, artisan compliance auditing, and celebration oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#FAF8F3] dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] text-[#173F35] dark:text-[#A9C7B2] text-xs font-mono font-semibold">
            System Status: 100% Operational
          </span>
        </div>
      </div>

      {/* 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Gross Merchandise Value (GMV)
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#D4B77D]">
            ₹152.4 Cr
          </div>
          <div className="text-[11px] text-[#173F35] dark:text-[#A9C7B2] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+38% Year-over-Year</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Active Celebrations
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            1,240
          </div>
          <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] block">
            Across 14 royal hubs
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Verified Artisans
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            840 Partners
          </div>
          <span className="text-[11px] text-[#173F35] dark:text-[#A9C7B2] block font-semibold">
            99.2% background checked
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Pending Verifications
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#C6A66B] dark:text-[#D4B77D]">
            {pendingVendors.filter((v) => v.status === "pending").length}
          </div>
          <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] block">
            Requires compliance audit
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E2D7] dark:border-[#344139] pb-3">
        {(["vendors", "events", "users"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#232F28] dark:text-[#A9C7B2] shadow-xs"
                : "text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] hover:bg-[#E7EFEA]/50 dark:hover:bg-[#1C2520]"
            }`}
          >
            {tab === "vendors"
              ? "Vendor Approval Queue"
              : tab === "events"
              ? "Active Celebrations"
              : "Registered Users"}
          </button>
        ))}
      </div>

      {/* Pending Vendors Tab */}
      {activeTab === "vendors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Artisan Verification Desk
            </h2>
            <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              {pendingVendors.length} applications logged
            </span>
          </div>

          <div className="space-y-3">
            {pendingVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                      {vendor.business}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] font-semibold">
                      {vendor.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#77746D] dark:text-[#B5B5AA]">
                    <span>Location: {vendor.city}</span>
                    <span>•</span>
                    <span>Applied: {vendor.appliedDate}</span>
                    <span>•</span>
                    <span
                      className={
                        vendor.insuranceVerified
                          ? "text-[#173F35] dark:text-[#A9C7B2] font-medium"
                          : "text-amber-600"
                      }
                    >
                      Insurance: {vendor.insuranceVerified ? "Verified ✓" : "Pending ⚠"}
                    </span>
                    <span>•</span>
                    <span
                      className={
                        vendor.licenseVerified
                          ? "text-[#173F35] dark:text-[#A9C7B2] font-medium"
                          : "text-amber-600"
                      }
                    >
                      GST & License: {vendor.licenseVerified ? "Verified ✓" : "Pending ⚠"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {vendor.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleApprove(vendor.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-[#C6A66B]" />
                        <span>Approve Partner</span>
                      </button>
                      <button
                        onClick={() => handleReject(vendor.id)}
                        className="px-3.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full uppercase ${
                        vendor.status === "approved"
                          ? "bg-[#E7EFEA] text-[#173F35] dark:bg-[#173F35]/50 dark:text-[#A9C7B2]"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                      }`}
                    >
                      {vendor.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-4">
          <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Nationwide Event Blueprint Telemetry
          </h2>
          <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Monitoring real-time milestones, venue locks, and culinary vendor contracts across India.
          </p>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-4">
          <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Platform Member Accounts
          </h2>
          <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Supabase Auth synchronized user records with role-based access control.
          </p>
        </div>
      )}
    </div>
  );
}
