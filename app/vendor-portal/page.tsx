"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { VendorCatalogManager } from "@/components/vendors/VendorCatalogManager";
import { VendorProfileEditor } from "@/components/vendors/VendorProfileEditor";
import { BookingLifecyclePanel } from "@/components/booking/BookingLifecyclePanel";
import { VendorQuoteAmountForm } from "@/components/booking/VendorQuoteAmountForm";
import { VendorAvailabilityManager } from "@/components/booking/VendorAvailabilityManager";
import { VendorListingsManager } from "@/components/vendors/VendorListingsManager";
import { VendorServiceAreasManager } from "@/components/vendors/VendorServiceAreasManager";
import { VendorVerificationDocuments } from "@/components/vendors/VendorVerificationDocuments";
import { VendorReviewsPanel } from "@/components/vendors/VendorReviewsPanel";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("section") || "overview";
  const [bookings, setBookings] = useState<RealBooking[]>([]);
  const [sentQuotationAmounts, setSentQuotationAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const selectedBookingId = searchParams.get("bookingId");
  const [bookingActionError, setBookingActionError] = useState<string | null>(null);
  const [proposalBookingId, setProposalBookingId] = useState<string | null>(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingDateFrom, setBookingDateFrom] = useState("");
  const [bookingDateTo, setBookingDateTo] = useState("");
  const [finance, setFinance] = useState<{ bookings: Array<{ id: string; booking_reference: string; event_date: string; status: string; total_amount: number; paid_amount: number; package_name: string | null }>; payments: Array<{ id: string; booking_id: string; amount: number; currency: string; status: string; purpose: string; verified_at: string | null; created_at: string }>; refunds: Array<{ id: string; booking_id: string; payment_id: string; amount: number; status: string; created_at: string }> }>({ bookings: [], payments: [], refunds: [] });
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeFrom, setFinanceFrom] = useState("");
  const [financeTo, setFinanceTo] = useState("");

  const businessName = vendorProfile?.business_name || "Your business";
  const city = vendorProfile?.city || "";

  const navigateToSection = (section: string, bookingId?: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    if (section === "bookings" && bookingId) params.set("bookingId", bookingId);
    else params.delete("bookingId");
    router.push(`/vendor-portal?${params.toString()}`, { scroll: false });
  };
  const setActiveTab = (section: string) => navigateToSection(section);
  const setSelectedBookingId = (bookingId: string | null) => navigateToSection("bookings", bookingId);

  const fetchBookings = async () => {
    setBookingsError(null);
    try {
      // Query bookings for this vendor
      if (!vendorProfile?.id) { setBookings([]); setLoading(false); return; }
      const query = supabase
        .from("bookings")
        .select("id,booking_reference,customer_id,vendor_name,vendor_category,package_name,event_date,event_city,guest_count,requirements,total_amount,advance_amount,paid_amount,status,created_at,profiles:customer_id(full_name,email,phone)")
        .eq("vendor_profile_id", vendorProfile.id)
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setBookings(data as any);
        const { data: quotationData, error: quotationError } = await supabase.from("booking_quotations")
          .select("booking_id,total_amount,version")
          .eq("vendor_profile_id", vendorProfile.id)
          .eq("status", "sent")
          .order("version", { ascending: false });
        if (!quotationError) {
          const amounts: Record<string, number> = {};
          for (const quotation of quotationData ?? []) {
            if (amounts[quotation.booking_id] === undefined) amounts[quotation.booking_id] = quotation.total_amount;
          }
          setSentQuotationAmounts(amounts);
        }
      } else if (error) {
        setBookingsError("Booking records could not be loaded. Refresh and try again.");
      }
    } catch (err) {
      console.error("Error loading vendor bookings:", err);
      setBookingsError("Booking records could not be loaded. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [vendorProfile]);

  useEffect(() => {
    if (activeTab !== "finances") return;
    let active = true;
    setFinanceError(null); setFinanceLoading(true);
    const query = new URLSearchParams(); if (financeFrom) query.set("from", financeFrom); if (financeTo) query.set("to", financeTo);
    fetch(`/api/vendors/finance${query.size ? `?${query}` : ""}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Financial records could not be loaded.");
      if (active) setFinance(data);
    }).catch((cause) => { if (active) setFinanceError(cause instanceof Error ? cause.message : "Financial records could not be loaded."); }).finally(() => { if (active) setFinanceLoading(false); });
    return () => { active = false; };
  }, [activeTab, financeFrom, financeTo]);

  const handleUpdateBookingStatus = async (id: string, action: string) => {
    setActionInProgress(id);
    setBookingActionError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "reject" ? "Vendor declined the request" : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking could not be updated.");
      await fetchBookings();
    } catch (err) {
      setBookingActionError(err instanceof Error ? err.message : "Booking could not be updated.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCompleteServiceTask = async (booking: RealBooking) => {
    setActionInProgress(booking.id);
    setBookingActionError(null);
    try {
      // The API enforces the normal confirmed -> in_progress -> completed
      // lifecycle; this single task control advances through both valid steps.
      const actions = booking.status === "confirmed" ? ["start", "complete"] : ["complete"];
      for (const action of actions) {
        const response = await fetch(`/api/bookings/${booking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "The service task could not be updated.");
      }
      await fetchBookings();
    } catch (cause) {
      setBookingActionError(cause instanceof Error ? cause.message : "The service task could not be updated.");
      await fetchBookings();
    } finally {
      setActionInProgress(null);
    }
  };

  // Metrics calculated from real bookings
  const pricedBookings = bookings.filter((booking) => booking.total_amount > 0 && ["awaiting_payment", "confirmed", "in_progress", "completed", "cancellation_requested"].includes(booking.status));
  const outstandingBookings = pricedBookings.filter((booking) => ["awaiting_payment", "confirmed", "in_progress", "cancellation_requested"].includes(booking.status));
  const grossValuePaise = pricedBookings.reduce((sum, b) => sum + b.total_amount, 0);
  const totalPaidPaise = pricedBookings.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
  const pendingReceivablesPaise = outstandingBookings.reduce((sum, booking) => sum + Math.max(0, booking.total_amount - (booking.paid_amount || 0)), 0);
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const pendingCount = bookings.filter((b) => ["pending_vendor_confirmation", "awaiting_quotation", "quotation_sent", "awaiting_customer_decision"].includes(b.status)).length;
  const upcomingBookings = bookings.filter((booking) => booking.event_date >= new Date().toISOString().slice(0, 10) && ["awaiting_payment", "confirmed", "in_progress", "cancellation_requested"].includes(booking.status)).slice(0, 5);
  const vendorBookings = bookings.filter((booking) => !["awaiting_quotation", "quotation_sent", "quotation_revision_requested", "declined"].includes(booking.status));
  const displayedBookings = vendorBookings.filter((booking) => (bookingStatusFilter === "all" || booking.status === bookingStatusFilter) && (!bookingDateFrom || booking.event_date >= bookingDateFrom) && (!bookingDateTo || booking.event_date <= bookingDateTo) && (!bookingSearch || `${booking.booking_reference} ${booking.event_city} ${booking.package_name || ""} ${booking.profiles?.full_name || ""}`.toLowerCase().includes(bookingSearch.toLowerCase())));
  const quoteRequests = bookings.filter((booking) => ["awaiting_quotation", "quotation_revision_requested", "quotation_sent"].includes(booking.status));
  const serviceTasks = bookings.filter((booking) => ["confirmed", "in_progress", "completed"].includes(booking.status));
  const capturedPaise = Math.max(0, finance.payments.filter((payment) => ["captured", "partially_refunded", "refunded"].includes(payment.status)).reduce((sum, payment) => sum + payment.amount, 0) - finance.refunds.filter((refund) => refund.status === "processed").reduce((sum, refund) => sum + refund.amount, 0));
  const financeOutstandingPaise = finance.bookings.reduce((sum, booking) => sum + Math.max(0, booking.total_amount - booking.paid_amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD2B0] dark:bg-[#681B1D]/50 text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold border border-[#681B1D]/20 dark:border-[#EAD2B0]/30">
            <Store className="w-3.5 h-3.5 text-[#B77A36] dark:text-[#D4B77D]" />
            <span>Vendor workspace</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
            {activeTab === "overview" ? `Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}` : activeTab.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
          </h1>
          <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            Manage business details, availability and customer bookings in one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-[#EAD2B0] dark:bg-[#681B1D]/50 border border-[#681B1D]/20 dark:border-[#EAD2B0]/30 text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
            <span>{vendorProfile?.approval_status === "approved" ? (vendorProfile?.is_published ? "Business is published" : "Approved · not published") : `Profile ${vendorProfile?.approval_status || "incomplete"}`}</span>
          </span>
        </div>
      </div>

      {/* Keep Service Tasks focused on actionable work instead of overview metrics. */}
      {activeTab !== "service-tasks" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Agreed Booking Value
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#681B1D] dark:text-[#D4B77D]">
            {formatINR(grossValuePaise / 100)}
          </div>
          <div className="text-[11px] text-[#681B1D] dark:text-[#EAD2B0] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{bookings.length} booking records</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Customer Payments Recorded
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-800 dark:text-amber-700">
            {formatINR(totalPaidPaise / 100)}
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Payment totals by booking; see Finances
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Outstanding Booking Balances
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-600 dark:text-amber-400">
            {formatINR(pendingReceivablesPaise / 100)}
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Based on current booking records
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-[#7D6B63] dark:text-[#D4C3B7] text-xs uppercase tracking-wider font-semibold">
            Confirmed Bookings
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7] flex items-center gap-1.5">
            <span>{confirmedCount}</span>
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Based on current booking status
          </span>
        </div>
      </div>}

      {activeTab === "overview" && <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl bg-gradient-to-br from-[#681B1D] to-[#3B1016] p-6 text-[#FFF3E3] shadow-lg sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#EAD2B0]">Your business at a glance</p><h2 className="mt-3 font-serif text-3xl font-bold">{businessName}</h2><p className="mt-2 max-w-xl text-sm text-[#F3DFCA]">Respond to booking requests, keep your business details current, and manage the dates you can serve.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setActiveTab("bookings")} className="rounded-xl bg-[#FFF3E3] px-4 py-2.5 text-sm font-bold text-[#681B1D]">Review {pendingCount} new request{pendingCount === 1 ? "" : "s"}</button><button onClick={() => setActiveTab("business-profile")} className="rounded-xl border border-[#EAD2B0]/60 px-4 py-2.5 text-sm font-semibold">Edit business profile</button></div></div>
        <div className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-6 dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Business status</h2><p className="mt-3 text-sm">Approval: <strong className="capitalize">{vendorProfile?.approval_status || "Not available"}</strong></p><p className="mt-1 text-sm">Storefront: <strong>{vendorProfile?.is_published ? "Published" : "Not published"}</strong></p><p className="mt-1 text-sm">Verification: <strong>{vendorProfile?.is_verified ? "Verified" : "Not verified"}</strong></p><button onClick={() => setActiveTab("verification")} className="mt-4 text-sm font-semibold text-[#681B1D] underline dark:text-[#EAD2B0]">View verification status</button></div>
        <div className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918] lg:col-span-2"><div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Upcoming bookings</h2><button onClick={() => setActiveTab("bookings")} className="text-sm font-semibold text-[#681B1D] underline dark:text-[#EAD2B0]">All bookings</button></div>{upcomingBookings.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{upcomingBookings.map((booking) => <button key={booking.id} onClick={() => navigateToSection("bookings", booking.id)} className="rounded-2xl border border-[#EAD2B0] p-4 text-left transition hover:border-[#B77A36] dark:border-[#4D3331]"><span className="font-mono text-xs text-[#B77A36]">{booking.booking_reference}</span><b className="mt-1 block">{booking.package_name || "Custom service"}</b><span className="mt-1 block text-xs text-[#7D6B63]">{new Date(`${booking.event_date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {booking.event_city}</span><span className="mt-2 inline-block rounded-full bg-[#EAD2B0]/50 px-2 py-1 text-[10px] capitalize">{booking.status.replaceAll("_", " ")}</span></button>)}</div> : <p className="rounded-2xl bg-[#FFF3E3] p-5 text-sm text-[#7D6B63] dark:bg-[#1A1211]">No upcoming bookings yet. New customer requests will appear here.</p>}</div>
      </section>}

      {activeTab === "quote-requests" && <section className="space-y-4 rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918]">
        <div><h2 className="font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Incoming quotation requests</h2><p className="mt-1 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Review the customer's event details and prepare a proposal from the existing booking record.</p></div>
        {bookingsError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{bookingsError}</p>}
        {!bookingsError && (loading ? <p role="status" className="py-8 text-sm text-[#7D6B63]">Loading quotation requests…</p> : quoteRequests.length ? <div className="space-y-4">{quoteRequests.map((booking) => <article key={booking.id} className="rounded-2xl border border-[#EAD2B0] p-4 dark:border-[#4D3331]"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-xs text-[#B77A36]">{booking.booking_reference}</p><h3 className="mt-1 font-serif text-lg font-bold">{booking.package_name || booking.vendor_category || "Custom service request"}</h3></div><span className="rounded-full bg-[#EAD2B0]/55 px-2.5 py-1 text-[10px] font-semibold capitalize text-[#681B1D]">{booking.status.replaceAll("_", " ")}</span></div><p className="mt-3 text-sm">{booking.profiles?.full_name || "Customer"} · {booking.event_city} · {booking.guest_count ? `${booking.guest_count} guests` : "Guest count not provided"}</p><p className="mt-1 text-xs text-[#7D6B63]">Event date: {new Date(`${booking.event_date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })} · Submitted: {new Date(booking.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>{booking.requirements && <p className="mt-3 rounded-xl bg-[#FFF3E3] p-3 text-sm dark:bg-[#1A1211]"><b>Requirements:</b> {booking.requirements}</p>}{booking.status === "quotation_sent" ? <div className="mt-4 rounded-xl bg-[#EAD2B0]/30 p-4 text-sm"><b>Quotation sent</b><p className="mt-1">{sentQuotationAmounts[booking.id] != null ? `Proposed total: ${formatINR(sentQuotationAmounts[booking.id] / 100)}.` : "The proposal is saved; its total will appear after the quotation record loads."} Waiting for the customer to respond.</p></div> : <div className="mt-4"><button type="button" aria-expanded={proposalBookingId === booking.id} onClick={() => setProposalBookingId((current) => current === booking.id ? null : booking.id)} className="inline-flex items-center gap-2 rounded-xl bg-[#681B1D] px-4 py-2.5 text-xs font-semibold text-white">{proposalBookingId === booking.id ? "Close amount form" : "Enter amount and send quotation"}<ArrowRight className="h-4 w-4"/></button>{proposalBookingId === booking.id && <div className="mt-4 border-t border-[#EAD2B0] pt-4"><VendorQuoteAmountForm bookingId={booking.id} bookingReference={booking.booking_reference} serviceName={booking.package_name || booking.vendor_category || "Requested service"} onSent={(amountPaise) => { setSentQuotationAmounts((current) => ({ ...current, [booking.id]: amountPaise })); void fetchBookings(); }} /></div>}</div>}</article>)}</div> : <div className="rounded-2xl bg-[#FFF3E3] p-8 text-center dark:bg-[#1A1211]"><FileText className="mx-auto h-8 w-8 text-[#B77A36]"/><h3 className="mt-3 font-serif text-lg font-bold">No quotation requests waiting</h3><p className="mt-1 text-sm text-[#7D6B63]">Custom service requests that need a proposal will appear here.</p></div>)}
      </section>}

      {activeTab === "service-tasks" && <section className="space-y-4 rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918]">
        <h2 className="font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Service Tasks</h2>
        {bookingsError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{bookingsError}</p>}
        {loading ? <p role="status" className="p-6 text-sm text-[#7D6B63]">Loading service tasks…</p> : serviceTasks.length ? <div className="space-y-3">{serviceTasks.map((booking) => {
          const workDone = booking.status === "completed";
          return <article key={booking.id} className="rounded-2xl border border-[#EAD2B0] p-4 dark:border-[#4D3331] sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="font-mono text-xs text-[#B77A36]">{booking.booking_reference}</p><h3 className="mt-1 font-serif text-lg font-bold">{booking.package_name || booking.vendor_category}</h3><p className="mt-1 text-sm">{booking.profiles?.full_name || "Customer"} · {booking.event_city} · {new Date(`${booking.event_date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p></div><label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold sm:mt-0"><input type="checkbox" checked={workDone} disabled={workDone || actionInProgress === booking.id} onChange={() => void handleCompleteServiceTask(booking)} aria-label={`Work ${workDone ? "done" : "not done"} for ${booking.package_name || booking.vendor_category}`} className="h-5 w-5 accent-[#681B1D] disabled:cursor-default"/>{actionInProgress === booking.id ? "Saving…" : workDone ? "Done" : "Mark done"}</label></article>;
        })}</div> : <div className="rounded-2xl bg-[#FFF3E3] p-8 text-center dark:bg-[#1A1211]"><h3 className="font-serif text-lg font-bold">No service tasks yet</h3><p className="mt-1 text-sm text-[#7D6B63]">A task appears after the customer accepts your quotation, pays the required advance and the booking is confirmed.</p></div>}
        {bookingActionError && <p role="alert" className="text-sm text-rose-700">{bookingActionError}</p>}
      </section>}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          {bookingActionError && <p role="alert" className="text-sm text-rose-700">{bookingActionError}</p>}
          {bookingsError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{bookingsError}</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Search customer, booking reference or location" className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-4 py-3 text-sm dark:border-[#4D3331] dark:bg-[#241918]"/><select value={bookingStatusFilter} onChange={(event) => setBookingStatusFilter(event.target.value)} className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-3 py-3 text-sm dark:border-[#4D3331] dark:bg-[#241918]"><option value="all">All statuses</option>{[...new Set(vendorBookings.map((booking) => booking.status))].sort().map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><input aria-label="Event date from" type="date" value={bookingDateFrom} max={bookingDateTo || undefined} onChange={(event) => setBookingDateFrom(event.target.value)} className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-3 py-3 text-sm dark:border-[#4D3331] dark:bg-[#241918]"/><input aria-label="Event date through" type="date" value={bookingDateTo} min={bookingDateFrom || undefined} onChange={(event) => setBookingDateTo(event.target.value)} className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-3 py-3 text-sm dark:border-[#4D3331] dark:bg-[#241918]"/></div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
              Client Bookings & Orders
            </h2>
            <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              {vendorBookings.length} accepted or direct-package booking(s)
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Loading Vendor bookings...
            </div>
          ) : bookingsError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-800">Booking data is unavailable, so the inbox cannot be shown as empty.</div>
          ) : vendorBookings.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
              <Store className="w-8 h-8 text-[#7D6B63]/50 mx-auto" />
              <h3 className="text-sm font-bold text-[#30221D] dark:text-[#F4F0E7]">
                No Bookings Received Yet
              </h3>
              <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] max-w-sm mx-auto">
                Quote requests stay in Quote Requests. Accepted quotations and direct-package requests will appear here with their payment progress.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedBookings.map((booking) => {
                const totalINR = booking.total_amount / 100;
                const paidINR = (booking.paid_amount || 0) / 100;
                const balanceINR = Math.max(0, totalINR - paidINR);

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
                          {booking.package_name || "Custom Service"} • {booking.event_city} • {booking.guest_count ? `${booking.guest_count} Guests` : "Guest count not provided"}
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
                          {paidINR > 0 ? `Payment done · ${formatINR(paidINR)} received` : "Payment not done"} · Remaining {formatINR(balanceINR)}
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
                          onClick={() => handleUpdateBookingStatus(booking.id, "reject")}
                          className="px-4 py-2 rounded-xl bg-[#FFF3E3] hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer"
                        >
                          Decline Request
                        </button>
                        <button
                          disabled={actionInProgress === booking.id}
                          onClick={() => handleUpdateBookingStatus(booking.id, "accept")}
                          className="px-4 py-2 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                        >
                          Accept & Enable Customer Payment
                        </button>
                      </div>
                    )}
                    <button aria-expanded={selectedBookingId === booking.id} onClick={() => setSelectedBookingId(selectedBookingId === booking.id ? null : booking.id)} className="text-xs font-semibold text-[#681B1D] underline">{selectedBookingId === booking.id ? "Close booking details" : "View payment details"}</button>
                    {selectedBookingId === booking.id && <div className="border-t border-[#EAD2B0] pt-4"><BookingLifecyclePanel bookingId={booking.id} onUpdated={() => void fetchBookings()} /></div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "finances" && <section className="space-y-5 rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 shadow-sm dark:border-[#4D3331] dark:bg-[#241918]">
        <div><h2 className="font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Finances</h2><p className="mt-1 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Booking value, captured customer payments and refunds from actual records. This is not a payout or wallet balance.</p></div>
        <div className="flex flex-wrap items-end gap-3"><label className="text-xs">Payment/refund from<input type="date" value={financeFrom} max={financeTo || undefined} onChange={(event) => setFinanceFrom(event.target.value)} className="mt-1 block rounded-xl border border-[#EAD2B0] bg-white p-2 dark:border-[#4D3331] dark:bg-[#1A1211]"/></label><label className="text-xs">Through<input type="date" value={financeTo} min={financeFrom || undefined} onChange={(event) => setFinanceTo(event.target.value)} className="mt-1 block rounded-xl border border-[#EAD2B0] bg-white p-2 dark:border-[#4D3331] dark:bg-[#1A1211]"/></label>{(financeFrom || financeTo) && <button onClick={() => { setFinanceFrom(""); setFinanceTo(""); }} className="text-xs font-semibold text-[#681B1D] underline">Clear dates</button>}</div>
        {financeError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{financeError}</p>}
        {financeLoading && <p role="status" className="text-xs text-[#7D6B63]">Loading verified payment records…</p>}
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#FFF3E3] p-4 dark:bg-[#1A1211]"><span className="text-xs text-[#7D6B63]">Booking value</span><b className="mt-2 block text-xl">{formatINR(finance.bookings.reduce((sum, booking) => sum + booking.total_amount, 0) / 100)}</b></div><div className="rounded-2xl bg-[#FFF3E3] p-4 dark:bg-[#1A1211]"><span className="text-xs text-[#7D6B63]">Net captured payments</span><b className="mt-2 block text-xl">{formatINR(capturedPaise / 100)}</b></div><div className="rounded-2xl bg-[#FFF3E3] p-4 dark:bg-[#1A1211]"><span className="text-xs text-[#7D6B63]">Outstanding on bookings</span><b className="mt-2 block text-xl">{formatINR(financeOutstandingPaise / 100)}</b></div></div>
        {!financeError && <div className="overflow-x-auto rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#FFF3E3] text-xs dark:bg-[#1A1211]"><tr><th className="p-3">Date</th><th className="p-3">Booking</th><th className="p-3">Purpose</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead><tbody>{finance.payments.map((payment) => { const booking = finance.bookings.find((item) => item.id === payment.booking_id); return <tr key={payment.id} className="border-t border-[#EAD2B0] dark:border-[#4D3331]"><td className="p-3">{new Date(payment.created_at).toLocaleDateString("en-IN")}</td><td className="p-3">{booking?.booking_reference || "Booking"}</td><td className="p-3 capitalize">{payment.purpose}</td><td className="p-3">{formatINR(payment.amount / 100)}</td><td className="p-3 capitalize">{payment.status.replaceAll("_", " ")}</td></tr>})}{finance.refunds.map((refund) => <tr key={refund.id} className="border-t border-[#EAD2B0] text-rose-700 dark:border-[#4D3331] dark:text-rose-300"><td className="p-3">{new Date(refund.created_at).toLocaleDateString("en-IN")}</td><td className="p-3">{finance.bookings.find((item) => item.id === refund.booking_id)?.booking_reference || "Booking"}</td><td className="p-3">Refund</td><td className="p-3">−{formatINR(refund.amount / 100)}</td><td className="p-3 capitalize">{refund.status}</td></tr>)}{!finance.payments.length && !finance.refunds.length && <tr><td colSpan={5} className="p-6 text-center text-[#7D6B63]">No payment or refund records for your bookings.</td></tr>}</tbody></table></div>}
      </section>}

      {activeTab === "availability" && vendorProfile?.id && <VendorAvailabilityManager vendorProfileId={vendorProfile.id} />}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <div className="p-6 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-4 shadow-xs">
          <h2 className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">Services, packages and portfolio</h2>
          {vendorProfile ? <><VendorProfileEditor profile={vendorProfile} onSaved={() => void refreshProfile()} /><VendorCatalogManager vendorId={vendorProfile.id} /></> : <p className="text-sm text-[#7D6B63]">Your business profile will appear here after registration is saved.</p>}
        </div>
      )}

      {["listings", "create-listing", "published", "drafts", "pending-approval", "rejected"].includes(activeTab) && <VendorListingsManager filter={activeTab} />}
      {activeTab === "portfolio" && <div className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="mb-4 font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Portfolio</h2>{vendorProfile ? <VendorCatalogManager vendorId={vendorProfile.id} /> : <p>Complete vendor onboarding first.</p>}</div>}

      {["business-profile", "locations"].includes(activeTab) && <section className="space-y-4">{vendorProfile ? <VendorProfileEditor profile={vendorProfile} onSaved={() => void refreshProfile()} /> : <p>Complete vendor onboarding to create your business profile.</p>}{activeTab === "locations" && <VendorServiceAreasManager/>}</section>}

      {activeTab === "storefront" && <section className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-6 dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Public storefront</h2><p className="mt-2 text-sm text-[#7D6B63]">{vendorProfile?.is_published && vendorProfile.approval_status === "approved" ? "Your approved vendor profile is publicly available." : "Your storefront is not currently public. Publication requires the existing approval workflow."}</p>{vendorProfile?.id && vendorProfile.is_published && vendorProfile.approval_status === "approved" && <a href={`/vendors/${vendorProfile.id}`} className="mt-4 inline-flex rounded-xl bg-[#681B1D] px-4 py-2.5 text-sm font-semibold text-white">Open public storefront</a>}</section>}

      {activeTab === "verification" && <section className="space-y-4"><div className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-6 dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Verification & documents</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><p className="rounded-xl bg-[#FFF3E3] p-4 dark:bg-[#1A1211]">Business review: <b className="capitalize">{vendorProfile?.approval_status || "Not available"}</b></p><p className="rounded-xl bg-[#FFF3E3] p-4 dark:bg-[#1A1211]">Verified badge: <b>{vendorProfile?.is_verified ? "Approved" : "Not verified"}</b></p></div><p className="mt-4 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Submitting a document does not automatically verify a business. An authorized administrator must review the submission.</p></div><VendorVerificationDocuments/></section>}

      {/* Reviews Tab */}
      {activeTab === "reviews" && vendorProfile?.id ? <VendorReviewsPanel vendorId={vendorProfile.id} /> : activeTab === "reviews" ? (
        <div className="p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-4 shadow-xs">
          <h2 className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
            Client Reviews
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
              —
            </span>
            <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Complete your vendor profile to access customer reviews here.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
