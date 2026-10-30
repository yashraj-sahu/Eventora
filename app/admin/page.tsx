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
  const [activeTab, setActiveTab] = useState<"vendors" | "events" | "users">("vendors");

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 text-xs font-semibold border border-rose-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Evntora Platform Governance</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            Admin Master Console
          </h1>
          <p className="text-xs text-slate-400">
            Nationwide operational telemetry, artisan compliance auditing, and celebration oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
            System Status: 100% Operational
          </span>
        </div>
      </div>

      {/* 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Gross Merchandise Value (GMV)
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-400">
            ₹152.4 Cr
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+38% Year-over-Year</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Celebrations Orchestrated
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white">
            542 Active
          </div>
          <div className="text-[11px] text-slate-400">Across 52 Indian Cities</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Verified Artisan Network
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white">
            428 Partners
          </div>
          <div className="text-[11px] text-amber-400">Top 8% acceptance rate</div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Registered Host Accounts
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white">
            1,850+
          </div>
          <div className="text-[11px] text-slate-400">Couples & Enterprises</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "vendors"
              ? "bg-amber-500 text-slate-950 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Artisan Verification Queue ({pendingVendors.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-white">
            Pending Vendor Applications & Compliance Audits
          </h2>
          <span className="text-xs text-slate-400">Audit checklist enforced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Business / Estate</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Insurance Audit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pendingVendors.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-4 font-semibold text-white">{v.business}</td>
                  <td className="py-4 px-4 text-slate-300">{v.category}</td>
                  <td className="py-4 px-4 text-slate-400">{v.city}</td>
                  <td className="py-4 px-4">
                    {v.insuranceVerified ? (
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                        <X className="w-3.5 h-3.5" />
                        Missing Docs
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        v.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : v.status === "rejected"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {v.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReject(v.id)}
                          className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-rose-300 border border-slate-800 text-[11px]"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(v.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px]"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

