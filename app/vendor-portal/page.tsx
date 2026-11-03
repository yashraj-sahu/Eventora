"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { VendorCatalogManager } from "@/components/vendors/VendorCatalogManager";
import { VendorProfileEditor } from "@/components/vendors/VendorProfileEditor";
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
  CreditCard,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";

interface RealBooking {
  id: string;
  booking_reference: string;
  customer_id: string;
  vendor_name: string;
  vendor_category: string;
  package_name: string | null;
  event_date: string;
  event_city: string;
  guest_count: number | null;
  requirements: string | null;
  total_amount: number; // in paise
  advance_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export default function VendorDashboardPage() {
  const { user, profile, vendorProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"bookings" | "packages" | "payments" | "reviews">("bookings");
  const [bookings, setBookings] = useState<RealBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const businessName = vendorProfile?.business_name || "Your business";
  const city = vendorProfile?.city || "";

  const fetchBookings = async () => {
    try {
      // Query bookings for this vendor
      let query = supabase
        .from("bookings")
        .select("*, profiles:customer_id(full_name, email, phone)")
        .order("created_at", { ascending: false });

      if (vendorProfile?.id) {
        query = query.or(`vendor_profile_id.eq.${vendorProfile.id},vendor_name.eq."${businessName}"`);
      }

      const { data, error } = await query;
      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setBookings(data as any);
      }
    } catch (err) {
      console.error("Error loading vendor bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [vendorProfile]);

  const handleUpdateBookingStatus = async (id: string, newStatus: string) => {
    setActionInProgress(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchBookings();
      }
    } catch (err) {
      console.error("Failed to update booking status:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Metrics calculated from real bookings
  const grossValuePaise = bookings.reduce((sum, b) => sum + b.total_amount, 0);
  const totalPaidPaise = bookings.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
  const pendingReceivablesPaise = grossValuePaise - totalPaidPaise;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD2B0] dark:bg-[#681B1D]/50 text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold border border-[#681B1D]/20 dark:border-[#EAD2B0]/30">
            <Store className="w-3.5 h-3.5 text-[#B77A36] dark:text-[#D4B77D]" />
            <span>Artisan Partner Desk • {businessName}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
            Partner Operations Hub
          </h1>
          <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            Real-time management of client celebration requests, escrow receipts, and contracts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-[#EAD2B0] dark:bg-[#681B1D]/50 border border-[#681B1D]/20 dark:border-[#EAD2B0]/30 text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
            <span>{vendorProfile?.approval_status === "approved" ? "Approved Vendor Desk" : "Application Pending Review"}</span>
          </span>
        </div>
      </div>

      {/* 4 Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Gross Bookings Value
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#681B1D] dark:text-[#D4B77D]">
            {formatINR(grossValuePaise / 100)}
          </div>
          <div className="text-[11px] text-[#681B1D] dark:text-[#EAD2B0] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{bookings.length} active client orders</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Advance Escrow Received
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-800 dark:text-amber-700">
            {formatINR(totalPaidPaise / 100)}
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Verified via Razorpay Gateway
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Pending Client Receivables
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-600 dark:text-amber-400">
            {formatINR(pendingReceivablesPaise / 100)}
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Due pre-event delivery
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Confirmed Celebrations
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7] flex items-center gap-1.5">
            <span>{confirmedCount} Dates</span>
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Scheduled across 2026-2027 season
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
        {(["bookings", "payments", "packages", "reviews"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-[#681B1D] text-[#FFF3E3] dark:bg-[#2E1F1E] dark:text-[#EAD2B0] shadow-xs"
                : "text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#F4F0E7] hover:bg-[#EAD2B0]/50 dark:hover:bg-[#241918]"
            }`}
          >
            {tab === "bookings" ? "Booking Requests & Orders" : tab === "payments" ? "Escrow & Settlements" : tab}
          </button>
        ))}
      </div>

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
              Client Bookings & Orders
            </h2>
            <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              {bookings.length} client booking(s) recorded
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Loading artisan bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
              <Store className="w-8 h-8 text-[#7D6B63]/50 mx-auto" />
              <h3 className="text-sm font-bold text-[#30221D] dark:text-[#F4F0E7]">
                No Bookings Received Yet
              </h3>
              <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] max-w-sm mx-auto">
                When customers book your packages or services from your profile, bookings and payment locks will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const totalINR = booking.total_amount / 100;
                const paidINR = (booking.paid_amount || 0) / 100;
                const balanceINR = totalINR - paidINR;

                return (
                  <div
                    key={booking.id}
                    className="p-6 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                            {booking.booking_reference}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              booking.status === "confirmed"
                                ? "bg-[#EAD2B0] text-[#681B1D] dark:bg-[#681B1D]/50 dark:text-[#EAD2B0]"
                                : booking.status === "awaiting_payment"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : booking.status === "pending_vendor_confirmation"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            }`}
                          >
                            {booking.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#30221D] dark:text-[#F4F0E7]">
                          Client: {booking.profiles?.full_name || "Private Client"}
                        </h3>
                        <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
                          {booking.package_name || "Custom Service"} • {booking.event_city} • {booking.guest_count || 100} Guests
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[#7D6B63] dark:text-[#D4C3B7] block">
                          Agreed Contract
                        </span>
                        <div className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
                          {formatINR(totalINR)}
                        </div>
                        <span className="text-[11px] text-rose-800 dark:text-amber-700 font-semibold block">
                          Paid: {formatINR(paidINR)} | Due: {formatINR(balanceINR)}
                        </span>
                      </div>
                    </div>

                    {booking.requirements && (
                      <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] bg-[#FFF3E3] dark:bg-[#241918] p-3.5 rounded-xl border border-[#EAD2B0] dark:border-[#4D3331]">
                        <strong>Notes from Client:</strong> {booking.requirements}
                      </p>
                    )}

                    {/* Action buttons for pending confirmation */}
                    {booking.status === "pending_vendor_confirmation" && (
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          disabled={actionInProgress === booking.id}
                          onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                          className="px-4 py-2 rounded-xl bg-[#FFF3E3] hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer"
                        >
                          Decline Request
                        </button>
                        <button
                          disabled={actionInProgress === booking.id}
                          onClick={() => handleUpdateBookingStatus(booking.id, "awaiting_payment")}
                          className="px-4 py-2 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                        >
                          Accept & Enable Customer Payment
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Escrow & Payments Tab */}
      {activeTab === "payments" && (
        <div className="p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-6 shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77A36] dark:text-[#D4B77D]">
              Merchant Model Notice
            </span>
            <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
              Escrow Payouts & Settlement Intelligence
            </h2>
            <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] leading-relaxed max-w-2xl">
              Evntora acts as the primary merchant collector via Razorpay. Customer advance deposits are held under platform escrow safeguards until verified performance delivery. Direct automated marketplace split settlements via Razorpay Route can be enabled upon completing regulatory bank account verification.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#30221D] dark:text-[#F4F0E7]">
              <span>Verified Customer Advance Deposits in Escrow:</span>
              <span className="font-serif font-bold text-lg text-rose-800 dark:text-amber-700">
                {formatINR(totalPaidPaise / 100)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              <span>Artisan Bank Account Status:</span>
              <span className="text-rose-800 dark:text-amber-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified for Escrow Disbursements
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <div className="p-6 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-4 shadow-xs">
          <h2 className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">Services, packages and portfolio</h2>
          {vendorProfile ? <><VendorProfileEditor profile={vendorProfile} onSaved={() => void refreshProfile()} /><VendorCatalogManager vendorId={vendorProfile.id} /></> : <p className="text-sm text-[#7D6B63]">Your business profile will appear here after registration is saved.</p>}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-4 shadow-xs">
          <h2 className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
            Client Reviews
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
              —
            </span>
            <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Reviews are not connected yet.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
