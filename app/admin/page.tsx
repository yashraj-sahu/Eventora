"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  Store,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [activeTab, setActiveTab] = useState<"vendors" | "events" | "users">(
    "vendors"
  );

  const [pendingVendors, setPendingVendors] = useState<Array<{ id: string; business_name: string; business_category: string; city: string; created_at: string; approval_status: string; is_published: boolean }>>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [newListing, setNewListing] = useState({ business_name: "", business_category: "", city: "", address: "", business_description: "", contact_email: "", contact_phone: "" });
  const loadVendors = async () => {
    setQueueLoading(true); setQueueError("");
    try { const response = await fetch("/api/vendors/admin"); const data = await response.json(); if (!response.ok) throw new Error(data.error); setPendingVendors(data.vendors); }
    catch (cause) { setQueueError(cause instanceof Error ? cause.message : "Unable to load vendor queue"); }
    finally { setQueueLoading(false); }
  };
  useEffect(() => { void loadVendors(); }, []);
  const updateVendor = async (id: string, action: string) => {
    const response = await fetch("/api/vendors/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (response.ok) await loadVendors(); else setQueueError("Unable to update vendor listing");
  };
  const createListing = async (event: React.FormEvent) => {
    event.preventDefault(); setQueueError("");
    const response = await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newListing) });
    const data = await response.json();
    if (!response.ok) { setQueueError(data.error || "Unable to create listing"); return; }
    setNewListing({ business_name: "", business_category: "", city: "", address: "", business_description: "", contact_email: "", contact_phone: "" });
    await loadVendors();
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
            Vendor records: {pendingVendors.length}
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
            —
          </div>
          <div className="text-[11px] text-[#173F35] dark:text-[#A9C7B2] flex items-center gap-1 font-semibold">
            <span>Payment reporting is not connected here.</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Active Celebrations
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            —
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
            {pendingVendors.filter((v) => v.approval_status === "approved" && v.is_published).length} Partners
          </div>
          <span className="text-[11px] text-[#173F35] dark:text-[#A9C7B2] block font-semibold">
            Approved and published listings
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-[#77746D] dark:text-[#B5B5AA] text-xs uppercase tracking-wider font-semibold">
            Pending Verifications
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#C6A66B] dark:text-[#D4B77D]">
            {pendingVendors.filter((v) => v.approval_status === "pending").length}
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
          <form onSubmit={createListing} className="grid gap-3 rounded-2xl border border-[#E8E2D7] dark:border-[#344139] bg-white dark:bg-[#232F28] p-5 sm:grid-cols-2 lg:grid-cols-4">
            <input required maxLength={160} placeholder="Business name" value={newListing.business_name} onChange={(e) => setNewListing({ ...newListing, business_name: e.target.value })} className="rounded-xl border border-[#E8E2D7] bg-[#FAF8F3] px-3 py-2 text-sm" />
            <input required maxLength={80} placeholder="Category (custom allowed)" value={newListing.business_category} onChange={(e) => setNewListing({ ...newListing, business_category: e.target.value })} className="rounded-xl border border-[#E8E2D7] bg-[#FAF8F3] px-3 py-2 text-sm" />
            <input required maxLength={120} placeholder="City / region" value={newListing.city} onChange={(e) => setNewListing({ ...newListing, city: e.target.value })} className="rounded-xl border border-[#E8E2D7] bg-[#FAF8F3] px-3 py-2 text-sm" />
            <input maxLength={300} placeholder="Business address" value={newListing.address} onChange={(e) => setNewListing({ ...newListing, address: e.target.value })} className="rounded-xl border border-[#E8E2D7] bg-[#FAF8F3] px-3 py-2 text-sm" />
            <input type="email" placeholder="Verified business email (for claims)" value={newListing.contact_email} onChange={(e) => setNewListing({ ...newListing, contact_email: e.target.value })} className="rounded-xl border border-[#E8E2D7] bg-[#FAF8F3] px-3 py-2 text-sm" />
            <input placeholder="Phone" value={newListing.contact_phone} onChange={(e) => setNewListing({ ...newListing, contact_phone: e.target.value })} className="rounded-xl border border-[#E8E2D7] bg-[#FAF8F3] px-3 py-2 text-sm" />
            <textarea maxLength={5000} placeholder="Business description" value={newListing.business_description} onChange={(e) => setNewListing({ ...newListing, business_description: e.target.value })} className="rounded-xl border border-[#E8E2D7] bg-[#FAF8F3] px-3 py-2 text-sm lg:col-span-2" />
            <button className="rounded-xl bg-[#173F35] px-3 py-2 text-xs font-semibold text-white">Add unclaimed listing</button>
          </form>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Artisan Verification Desk
            </h2>
            <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              {pendingVendors.length} listings logged
            </span>
          </div>

          <div className="space-y-3">
            {queueLoading ? <p className="p-8 text-center">Loading vendor listings…</p> : queueError ? <p className="p-8 text-center text-rose-600">{queueError}</p> : pendingVendors.length === 0 ? <p className="p-8 text-center text-[#77746D]">No vendor listings yet.</p> : pendingVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                      {vendor.business_name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] font-semibold">
                      {vendor.business_category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#77746D] dark:text-[#B5B5AA]">
                    <span>Location: {vendor.city}</span>
                    <span>•</span>
                    <span>Applied: {new Date(vendor.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Status: {vendor.approval_status}{vendor.is_published ? " · published" : " · hidden"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {vendor.approval_status === "approved" ? <button onClick={() => void updateVendor(vendor.id, "suspend")} className="px-3.5 py-1.5 rounded-xl text-rose-600 text-xs font-medium">Suspend listing</button> : <>
                      <button
                        onClick={() => void updateVendor(vendor.id, "approve")}
                        className="px-3.5 py-1.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-[#C6A66B]" />
                        <span>Approve Partner</span>
                      </button>
                      <button
                        onClick={() => void updateVendor(vendor.id, "reject")}
                        className="px-3.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                  </>}
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
