"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/utils";
import {
  ShieldCheck,
  CreditCard,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  X,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface AdminPaymentRecord {
  id: string;
  booking_id: string;
  customer_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number; // in paise
  currency: string;
  status: string;
  purpose: string;
  payment_method: string | null;
  verified_at: string | null;
  created_at: string;
  bookings?: {
    booking_reference: string;
    vendor_name: string;
    vendor_category: string;
  } | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export default function AdminPaymentsPage() {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Refund Modal State
  const [refundingPayment, setRefundingPayment] = useState<AdminPaymentRecord | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmountPaise, setRefundAmountPaise] = useState<number>(0);
  const [refundRequestKey, setRefundRequestKey] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("id,booking_id,customer_id,razorpay_order_id,razorpay_payment_id,amount,currency,status,purpose,payment_method,verified_at,created_at,bookings(booking_reference,vendor_name,vendor_category),profiles:customer_id(full_name,email)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPayments(data as any);
      }
    } catch (err) {
      console.error("Error fetching admin payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleTriggerRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingPayment) return;

    setIsRefunding(true);
    setRefundError(null);

    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: refundingPayment.id,
          ...(refundAmountPaise > 0 ? { amountPaise: refundAmountPaise } : {}),
          reason: refundReason || "Customer Requested Administrative Refund",
          idempotencyKey: refundRequestKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund on Razorpay.");
      }

      if (data.status === "pending") {
        setRefundError("Razorpay has not finished processing this refund. The reserved amount will not be submitted again.");
        return;
      }

      setRefundingPayment(null);
      setRefundReason("");
      await fetchPayments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Refund failed";
      setRefundError(msg);
    } finally {
      setIsRefunding(false);
    }
  };

  const filtered = payments.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const ref = p.bookings?.booking_reference?.toLowerCase() || "";
    const vendor = p.bookings?.vendor_name?.toLowerCase() || "";
    const client = p.profiles?.full_name?.toLowerCase() || "";
    const email = p.profiles?.email?.toLowerCase() || "";
    const pid = p.razorpay_payment_id?.toLowerCase() || "";
    const oid = p.razorpay_order_id?.toLowerCase() || "";

    const matchesSearch =
      ref.includes(q) ||
      vendor.includes(q) ||
      client.includes(q) ||
      email.includes(q) ||
      pid.includes(q) ||
      oid.includes(q);

    return matchesStatus && matchesSearch;
  });

  const totalCapturedPaise = payments
    .filter((p) => p.status === "captured" || p.status === "partially_refunded")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefundedPaise = payments
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD2B0] dark:bg-[#681B1D]/50 text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold border border-[#681B1D]/20">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B77A36]" />
            <span>Platform Financial Audit & Oversight</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
            Payment Ledger & Escrow Desk
          </h1>
          <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            All-India customer transactions, Razorpay order states, and secure server refunds
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="px-4 py-2 rounded-xl bg-[#FFFCF6] dark:bg-[#2E1F1E] hover:bg-[#EAD2B0] text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-[#7D6B63] dark:text-[#D4C3B7] font-semibold block">
            Total Captured Volume
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
            {formatINR(totalCapturedPaise / 100)}
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Across {payments.filter((p) => p.status === "captured" || p.status === "partially_refunded").length} verified transactions
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-[#7D6B63] dark:text-[#D4C3B7] font-semibold block">
            Total Refunded Amount
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-600 dark:text-rose-400">
            {formatINR(totalRefundedPaise / 100)}
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Processed via Razorpay Refund API
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-[#7D6B63] dark:text-[#D4C3B7] font-semibold block">
            Active Payment Gateway
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
            Razorpay Live/Test
          </div>
          <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] block">
            Server-only HMAC signature validation
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by ref, client, vendor, or order ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] text-xs focus:outline-none focus:border-[#681B1D]"
            />
          </div>

          <div className="flex items-center gap-2">
            {(["all", "captured", "partially_refunded", "created", "refunded"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-[#681B1D] text-[#FFF3E3] dark:bg-[#EAD2B0] dark:text-[#681B1D] shadow-xs"
                    : "bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] dark:text-[#D4C3B7]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            Loading platform payment transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            No payment records matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] dark:text-[#D4C3B7] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Booking Ref</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">Order / Payment ID</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAD2B0]/50 dark:divide-[#4D3331]/50">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#FFF3E3] dark:hover:bg-[#241918]/50 transition-colors"
                  >
                    <td className="py-3.5 px-3 text-[#7D6B63] dark:text-[#D4C3B7] whitespace-nowrap">
                      {new Date(p.verified_at || p.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                      {p.bookings?.booking_reference || "—"}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-[#30221D] dark:text-[#F4F0E7]">
                        {p.profiles?.full_name || "Customer"}
                      </div>
                      <div className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7]">
                        {p.profiles?.email || "—"}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-[#30221D] dark:text-[#F4F0E7]">
                      {p.bookings?.vendor_name || "—"}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[11px] text-[#7D6B63] dark:text-[#D4C3B7]">
                      <div>{p.razorpay_order_id}</div>
                      {p.razorpay_payment_id && (
                        <div className="text-rose-800 dark:text-amber-700">
                          {p.razorpay_payment_id}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
                      {formatINR(p.amount / 100)}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === "captured"
                            ? "bg-[#EAD2B0] text-[#681B1D] dark:bg-[#681B1D]/50 dark:text-[#EAD2B0]"
                            : p.status === "partially_refunded"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : p.status === "refunded"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {p.status === "captured" || p.status === "partially_refunded" ? (
                        <button
                          onClick={() => {
                            setRefundingPayment(p);
                            setRefundAmountPaise(0);
                            setRefundRequestKey(crypto.randomUUID());
                            setRefundError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold cursor-pointer transition-colors"
                        >
                          Issue Refund
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Execution Modal */}
      {refundingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#FFFCF6] dark:bg-[#1E2621] rounded-3xl border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
              <h3 className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
                Process Razorpay Refund
              </h3>
              <button
                onClick={() => setRefundingPayment(null)}
                className="p-1 rounded text-[#7D6B63] hover:text-[#30221D] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                {refundError}
              </div>
            )}

            <form onSubmit={handleTriggerRefund} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
                <span className="text-[10px] text-[#7D6B63] block font-bold uppercase">
                  Razorpay Payment ID
                </span>
                <span className="font-mono font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                  {refundingPayment.razorpay_payment_id}
                </span>
                <div className="text-[11px] text-[#7D6B63] pt-1">
                  Original Amount: <strong>{formatINR(refundingPayment.amount / 100)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-semibold">Refund amount (₹; leave blank for remaining balance)</label>
                <input type="number" min="0.01" step="0.01" max={refundingPayment.amount / 100}
                  value={refundAmountPaise ? refundAmountPaise / 100 : ""}
                  onChange={(event) => setRefundAmountPaise(Math.round(Number(event.target.value) * 100))}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] focus:outline-none focus:border-[#681B1D]" />
              </div>

              <div>
                <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-semibold">
                  Refund Reason (Audit Log)
                </label>
                <textarea
                  required
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Mutual cancellation of palace booking per cancellation schedule..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] focus:outline-none focus:border-[#681B1D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundingPayment(null)}
                  className="px-4 py-2 rounded-xl bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm transition-all disabled:opacity-50"
                >
                  {isRefunding ? "Initiating on Razorpay..." : "Confirm & Issue Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

