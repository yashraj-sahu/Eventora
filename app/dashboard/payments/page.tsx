"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/utils";
import {
  CreditCard,
  Coins,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
  ShieldCheck,
  Search,
  RotateCcw,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";

interface PaymentItem {
  id: string;
  booking_id: string;
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
    event_date: string;
    total_amount: number;
    paid_amount: number;
    status: string;
  } | null;
}

interface BookingBalanceItem {
  id: string;
  booking_reference: string;
  vendor_name: string;
  vendor_category: string;
  event_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
}

export default function CustomerPaymentsPage() {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [pendingBookings, setPendingBookings] = useState<BookingBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentItem | null>(null);

  useEffect(() => {
    async function loadPaymentData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch payments
        const { data: payData, error: payError } = await supabase
          .from("payments")
          .select("*, bookings(booking_reference, vendor_name, vendor_category, event_date, total_amount, paid_amount, status)")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        if (!payError && payData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setPayments(payData as any);
        }

        // Fetch bookings with remaining balances
        const { data: bookData } = await supabase
          .from("bookings")
          .select("id, booking_reference, vendor_name, vendor_category, event_date, total_amount, paid_amount, status")
          .eq("customer_id", user.id)
          .in("status", ["awaiting_payment", "confirmed"]);

        if (bookData) {
          const withBalance = bookData.filter((b) => b.total_amount > (b.paid_amount || 0));
          setPendingBookings(withBalance);
        }
      } catch (err) {
        console.error("Error loading payments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPaymentData();
  }, [user]);

  // Aggregate Metrics
  const totalPaidPaise = payments
    .filter((p) => p.status === "captured")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPendingPaise = pendingBookings.reduce(
    (sum, b) => sum + (b.total_amount - (b.paid_amount || 0)),
    0
  );

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const ref = p.bookings?.booking_reference?.toLowerCase() || "";
    const vendor = p.bookings?.vendor_name?.toLowerCase() || "";
    const payId = p.razorpay_payment_id?.toLowerCase() || "";
    return ref.includes(q) || vendor.includes(q) || payId.includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D7] dark:border-[#344139] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold border border-[#173F35]/20">
            <CreditCard className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>Escrow & Fiscal Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
            Payments & Invoices
          </h1>
          <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Track verified Razorpay transactions, settled artisan contracts, and tax receipts in INR
          </p>
        </div>

        <Link
          href="/vendors"
          className="px-4 py-2 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <span>Explore Artisans</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-[#77746D] dark:text-[#B5B5AA] font-semibold block">
            Total Captured Payments
          </span>
          <div className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
            {formatINR(totalPaidPaise / 100)}
          </div>
          <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
            {payments.filter((p) => p.status === "captured").length} verified transactions
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-[#77746D] dark:text-[#B5B5AA] font-semibold block">
            Pending Scheduled Balances
          </span>
          <div className="text-3xl font-serif font-bold text-amber-600 dark:text-amber-400">
            {formatINR(totalPendingPaise / 100)}
          </div>
          <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
            Across {pendingBookings.length} contracted services
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-[#77746D] dark:text-[#B5B5AA] font-semibold block">
            Payment Gateway Security
          </span>
          <div className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
            <span>Razorpay</span>
            <ShieldCheck className="w-6 h-6 text-[#173F35] dark:text-[#A9C7B2]" />
          </div>
          <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
            PCI-DSS Level 1 & HMAC-SHA256 verified
          </p>
        </div>
      </div>

      {/* Pending Balances Action Bar */}
      {pendingBookings.length > 0 && (
        <div className="p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C6A66B]" />
              <span>Unpaid Invoices & Pending Balances</span>
            </h2>
            <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              {pendingBookings.length} action item(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBookings.map((b) => {
              const balanceINR = (b.total_amount - (b.paid_amount || 0)) / 100;
              return (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#1E2621] border border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#77746D] dark:text-[#B5B5AA]">
                      {b.booking_reference}
                    </span>
                    <h3 className="text-sm font-bold text-[#252522] dark:text-[#F4F0E7]">
                      {b.vendor_name}
                    </h3>
                    <div className="text-xs font-serif font-bold text-amber-600 dark:text-amber-400">
                      Balance Due: {formatINR(balanceINR)}
                    </div>
                  </div>

                  <Link
                    href={`/checkout?bookingId=${b.id}`}
                    className="px-3.5 py-2 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold tracking-wide uppercase transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Pay Balance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction History Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Transaction History & Receipts
            </h2>
            <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              Official record of all advance deposits and final settlements
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, vendor, or txn ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] text-xs focus:outline-none focus:border-[#173F35]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#77746D] dark:text-[#B5B5AA]">
            Loading transaction records...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CreditCard className="w-10 h-10 text-[#77746D]/50 mx-auto" />
            <h3 className="text-sm font-bold text-[#252522] dark:text-[#F4F0E7]">
              No Payments Recorded Yet
            </h3>
            <p className="text-xs text-[#77746D] dark:text-[#B5B5AA] max-w-sm mx-auto">
              Once you confirm and pay an advance for a vendor or blueprint package, receipts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E2D7] dark:border-[#344139] text-[#77746D] dark:text-[#B5B5AA] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Booking Ref</th>
                  <th className="py-3 px-3">Artisan Service</th>
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Purpose</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D7]/50 dark:divide-[#344139]/50">
                {filteredPayments.map((p) => {
                  const payDate = p.verified_at || p.created_at;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#FAF8F3] dark:hover:bg-[#1C2520]/50 transition-colors"
                    >
                      <td className="py-3.5 px-3 text-[#77746D] dark:text-[#B5B5AA] whitespace-nowrap">
                        {new Date(payDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-[#173F35] dark:text-[#A9C7B2]">
                        {p.bookings?.booking_reference || "—"}
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-[#252522] dark:text-[#F4F0E7]">
                        {p.bookings?.vendor_name || "Artisan Service"}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
                        {p.razorpay_payment_id || p.razorpay_order_id}
                      </td>

                      <td className="py-3.5 px-3 capitalize text-[#77746D] dark:text-[#B5B5AA]">
                        {p.purpose} Lock
                      </td>

                      <td className="py-3.5 px-3 font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                        {formatINR(p.amount / 100)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "captured"
                              ? "bg-[#E7EFEA] text-[#173F35] dark:bg-[#173F35]/50 dark:text-[#A9C7B2]"
                              : p.status === "refunded"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="p-1.5 rounded-lg text-[#173F35] dark:text-[#A9C7B2] hover:bg-[#E7EFEA] dark:hover:bg-[#173F35]/30 transition-colors cursor-pointer"
                          title="View Tax Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E2621] rounded-3xl border border-[#E8E2D7] dark:border-[#344139] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E8E2D7] dark:border-[#344139] pb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#C6A66B] dark:text-[#D4B77D]">
                  Evntora Tax Invoice
                </span>
                <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                  Transaction Receipt
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-xl text-[#77746D] hover:text-[#173F35] dark:text-[#B5B5AA] dark:hover:text-[#F4F0E7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#FAF8F3] dark:bg-[#151B18] p-5 rounded-2xl border border-[#E8E2D7] dark:border-[#344139]">
              <div className="flex justify-between">
                <span className="text-[#77746D] dark:text-[#B5B5AA]">Booking Ref:</span>
                <span className="font-mono font-bold text-[#173F35] dark:text-[#A9C7B2]">
                  {selectedReceipt.bookings?.booking_reference || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77746D] dark:text-[#B5B5AA]">Razorpay Payment ID:</span>
                <span className="font-mono text-[#252522] dark:text-[#F4F0E7]">
                  {selectedReceipt.razorpay_payment_id || selectedReceipt.razorpay_order_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77746D] dark:text-[#B5B5AA]">Service Partner:</span>
                <span className="font-semibold text-[#252522] dark:text-[#F4F0E7]">
                  {selectedReceipt.bookings?.vendor_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77746D] dark:text-[#B5B5AA]">Transaction Date:</span>
                <span className="text-[#252522] dark:text-[#F4F0E7]">
                  {new Date(selectedReceipt.verified_at || selectedReceipt.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E8E2D7] dark:border-[#344139] pt-3 text-sm font-bold">
                <span className="text-[#173F35] dark:text-[#A9C7B2]">Settled Amount:</span>
                <span className="text-xl font-serif text-[#173F35] dark:text-[#A9C7B2]">
                  {formatINR(selectedReceipt.amount / 100)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

