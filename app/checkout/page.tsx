"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Calendar,
  MapPin,
  Users,
  Coins,
  ArrowRight,
  ArrowLeft,
  Printer,
  Sparkles,
  CreditCard,
  Building,
  AlertCircle,
  Clock,
} from "lucide-react";

interface BookingData {
  id: string;
  booking_reference: string;
  customer_id: string;
  vendor_name: string;
  vendor_category: string;
  package_name: string | null;
  event_date: string;
  event_city: string;
  guest_count: number | null;
  total_amount: number; // in paise
  advance_amount: number; // in paise
  paid_amount: number; // in paise
  currency: string;
  status: string;
  cancellation_terms: string | null;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  status: string;
  purpose: string;
  verified_at: string | null;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading: authLoading } = useAuth();

  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Purpose: advance or remaining or full
  const [paymentPurpose, setPaymentPurpose] = useState<"advance" | "remaining" | "full">("advance");
  const [isProcessing, setIsProcessing] = useState(false);

  // Verified Receipt State
  const [verifiedPayment, setVerifiedPayment] = useState<{
    paymentId: string;
    razorpayPaymentId: string;
    amountPaid: number;
    verifiedAt: string;
    bookingRef: string;
  } | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError("No booking reference provided. Please initiate booking from a vendor or event blueprint.");
      setLoading(false);
      return;
    }

    async function loadBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load booking details.");
        }

        setBooking(data.booking);
        setPayments(data.payments || []);

        // If booking already has advance paid, default purpose to remaining
        if (data.booking.paid_amount > 0 && data.booking.paid_amount < data.booking.total_amount) {
          setPaymentPurpose("remaining");
        } else if (data.booking.paid_amount >= data.booking.total_amount) {
          // Already paid in full
          const lastPayment = data.payments?.[0];
          setVerifiedPayment({
            paymentId: lastPayment?.id || data.booking.id,
            razorpayPaymentId: lastPayment?.razorpay_payment_id || "VERIFIED_SETTLED",
            amountPaid: data.booking.paid_amount / 100,
            verifiedAt: lastPayment?.verified_at || data.booking.updated_at,
            bookingRef: data.booking.booking_reference,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error loading booking";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/signin?redirect=/checkout?bookingId=${bookingId}`);
        return;
      }
      loadBooking();
    }
  }, [bookingId, isAuthenticated, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#681B1D] border-t-[#B77A36] rounded-full animate-spin" />
        <p className="text-sm font-serif text-[#681B1D] dark:text-[#EAD2B0]">
          Securing your luxury booking session...
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">
          Unable to Open Checkout
        </h2>
        <p className="text-xs text-[#30221D]/70 dark:text-[#FFF3E3]/70 leading-relaxed">
          {error || "The requested booking could not be verified or has expired."}
        </p>
        <div className="pt-2">
          <Link
            href="/vendors"
            className="px-6 py-2.5 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider inline-block transition-colors"
          >
            Return to Vendor Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const totalPaise = booking.total_amount;
  const advancePaise = booking.advance_amount;
  const paidPaise = booking.paid_amount || 0;
  const remainingPaise = Math.max(0, totalPaise - paidPaise);

  let currentPayablePaise = 0;
  if (paymentPurpose === "advance") {
    currentPayablePaise = advancePaise;
  } else if (paymentPurpose === "remaining" || paymentPurpose === "full") {
    currentPayablePaise = remainingPaise;
  }

  const payableINR = currentPayablePaise / 100;
  const totalINR = totalPaise / 100;
  const advanceINR = advancePaise / 100;
  const remainingINR = remainingPaise / 100;
  const paidINR = paidPaise / 100;

  const handleLaunchRazorpay = async () => {
    if (typeof window.Razorpay === "undefined") {
      alert("Razorpay SDK is loading. Please check your internet connection and try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Server-side order creation
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          purpose: paymentPurpose,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // 2. Configure Razorpay Standard Checkout options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || "INR",
        name: "Evntora Luxury Celebrations",
        description: `Booking ${orderData.bookingReference} • ${orderData.vendorName}`,
        order_id: orderData.orderId,
        prefill: {
          name: profile?.full_name || user?.user_metadata?.full_name || "",
          email: profile?.email || user?.email || "",
          contact: profile?.phone || user?.user_metadata?.phone || "",
        },
        notes: {
          bookingId: booking.id,
          bookingReference: orderData.bookingReference,
        },
        theme: {
          color: "#681B1D",
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            // 3. Trusted Server-side Verification
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                bookingId: booking.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // Success state display
            setVerifiedPayment({
              paymentId: verifyData.paymentId,
              razorpayPaymentId: response.razorpay_payment_id,
              amountPaid: payableINR,
              verifiedAt: verifyData.verifiedAt || new Date().toISOString(),
              bookingRef: booking.booking_reference,
            });
          } catch (verifyErr: unknown) {
            const vMsg = verifyErr instanceof Error ? verifyErr.message : "Verification error";
            setError(vMsg);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (failResponse: {
        error: { description: string; code: string };
      }) {
        setError(`Payment failed: ${failResponse.error.description}`);
        setIsProcessing(false);
      });

      razorpay.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initialization error";
      setError(msg);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-10">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      {/* Verified Success Receipt Screen */}
      {verifiedPayment ? (
        <div className="max-w-2xl mx-auto p-8 sm:p-12 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border-2 border-[#681B1D] dark:border-[#B77A36] shadow-2xl space-y-8 animate-in zoom-in-95">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#681B1D]/10 dark:bg-[#681B1D]/30 border border-[#B77A36]/30 text-[#681B1D] dark:text-[#EAD2B0] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B77A36] dark:text-[#EAD2B0] block">
              Official Tax & Booking Transaction Receipt
            </span>
            <h1 className="text-3xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">
              Payment Verified & Secured!
            </h1>
            <p className="text-xs text-[#30221D]/70 dark:text-[#FFF3E3]/70">
              Your transaction has been securely captured on Razorpay and registered with {booking.vendor_name}.
            </p>
          </div>

          {/* Receipt Details Box */}
          <div className="p-6 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
              <span className="text-[#30221D]/70 dark:text-[#FFF3E3]/70">Booking Reference:</span>
              <span className="font-mono font-bold text-[#681B1D] dark:text-[#EAD2B0] text-sm">
                {verifiedPayment.bookingRef}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
              <span className="text-[#30221D]/70 dark:text-[#FFF3E3]/70">Razorpay Transaction ID:</span>
              <span className="font-mono font-semibold text-[#30221D] dark:text-[#FFF3E3]">
                {verifiedPayment.razorpayPaymentId}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
              <span className="text-[#30221D]/70 dark:text-[#FFF3E3]/70">Verified Date & Time:</span>
              <span className="text-[#30221D] dark:text-[#FFF3E3]">
                {new Date(verifiedPayment.verifiedAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
              <span className="text-[#30221D]/70 dark:text-[#FFF3E3]/70">Booked Artisan / Venue:</span>
              <span className="font-bold text-[#30221D] dark:text-[#FFF3E3]">
                {booking.vendor_name} ({booking.vendor_category})
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm font-bold">
              <span className="text-[#681B1D] dark:text-[#EAD2B0]">Amount Paid:</span>
              <span className="text-xl font-serif text-[#681B1D] dark:text-[#EAD2B0]">
                {formatINR(verifiedPayment.amountPaid)}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-[#FFF3E3] dark:bg-[#1A1211] hover:bg-[#FFF3E3]/80 text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tax Receipt</span>
            </button>

            <Link
              href="/dashboard/payments"
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>View Payment Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Standard Checkout Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          {/* Left Column: Booking & Artisan Summary */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#681B1D]/10 text-[#681B1D] dark:bg-[#681B1D]/30 dark:text-[#EAD2B0] border border-[#681B1D]/20">
                      {booking.vendor_category}
                    </span>
                    <span className="text-[11px] font-mono text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                      {booking.booking_reference}
                    </span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">
                    {booking.vendor_name}
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#30221D]/70 dark:text-[#FFF3E3]/70 block">
                    Agreed Contract
                  </span>
                  <span className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                    {formatINR(totalINR)}
                  </span>
                </div>
              </div>

              {/* Event Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                    <Calendar className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>Event Date</span>
                  </div>
                  <div className="font-bold text-[#30221D] dark:text-[#FFF3E3]">
                    {booking.event_date}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                    <MapPin className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>Destination</span>
                  </div>
                  <div className="font-bold text-[#30221D] dark:text-[#FFF3E3]">
                    {booking.event_city}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                    <Users className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>Guests</span>
                  </div>
                  <div className="font-bold text-[#30221D] dark:text-[#FFF3E3]">
                    {booking.guest_count || 100} Attendees
                  </div>
                </div>
              </div>

              {/* Package Included */}
              {booking.package_name && (
                <div className="p-4 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#B77A36] dark:text-[#EAD2B0] block">
                    Contracted Service / Package
                  </span>
                  <div className="font-bold text-[#30221D] dark:text-[#FFF3E3]">
                    {booking.package_name}
                  </div>
                </div>
              )}

              {/* Terms & Guarantees */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs uppercase font-bold tracking-wider text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                  Luxury Cancellation & Protection Terms
                </h3>
                <div className="p-4 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0] shrink-0 mt-0.5" />
                    <span>
                      <strong>Evntora Artisan Guarantee:</strong> Funds are held under standard merchant escrow until verified performance delivery.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#B77A36] shrink-0 mt-0.5" />
                    <span>
                      {booking.cancellation_terms ||
                        "Full refund up to 30 days prior to event; 50% refund up to 14 days prior to event date."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Ledger & Razorpay Trigger */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-lg space-y-6">
              <div className="space-y-1 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#B77A36] dark:text-[#EAD2B0]">
                  Checkout Breakdown
                </span>
                <h3 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">
                  Payment Schedule
                </h3>
              </div>

              {/* Payment Option Selector */}
              {paidINR === 0 ? (
                <div className="space-y-2 text-xs">
                  <label className="block text-[#30221D]/70 dark:text-[#FFF3E3]/70 font-bold uppercase tracking-wider text-[11px]">
                    Choose Payment Option
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentPurpose("advance")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentPurpose === "advance"
                          ? "bg-[#681B1D]/10 dark:bg-[#681B1D]/30 border-[#681B1D] dark:border-[#B77A36] shadow-xs"
                          : "bg-[#FFF3E3]/50 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331]"
                      }`}
                    >
                      <span className="font-bold block text-[#30221D] dark:text-[#FFF3E3]">
                        Pay Advance Lock
                      </span>
                      <span className="font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0] text-sm">
                        {formatINR(advanceINR)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentPurpose("full")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentPurpose === "full"
                          ? "bg-[#681B1D]/10 dark:bg-[#681B1D]/30 border-[#681B1D] dark:border-[#B77A36] shadow-xs"
                          : "bg-[#FFF3E3]/50 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331]"
                      }`}
                    >
                      <span className="font-bold block text-[#30221D] dark:text-[#FFF3E3]">
                        Pay Full Amount
                      </span>
                      <span className="font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0] text-sm">
                        {formatINR(totalINR)}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#681B1D]/10 dark:bg-[#681B1D]/30 border border-[#B77A36]/30 text-xs text-[#681B1D] dark:text-[#EAD2B0] space-y-1">
                  <div className="font-bold">Advance Payment Received</div>
                  <div>You have already settled {formatINR(paidINR)}. Paying remaining balance now.</div>
                </div>
              )}

              {/* Itemized Calculation */}
              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex items-center justify-between text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                  <span>Total Agreed Fee:</span>
                  <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3]">
                    {formatINR(totalINR)}
                  </span>
                </div>

                {paidINR > 0 && (
                  <div className="flex items-center justify-between text-rose-800 dark:text-amber-700">
                    <span>Already Settled:</span>
                    <span>- {formatINR(paidINR)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                  <span>Platform Processing & GST:</span>
                  <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3]">
                    Included (0% Surcharge)
                  </span>
                </div>

                <div className="pt-3 border-t border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#30221D]/70 dark:text-[#FFF3E3]/70 block">
                      Payable Now via Razorpay
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                      {formatINR(payableINR)}
                    </span>
                  </div>

                  {paymentPurpose === "advance" && remainingINR > 0 && (
                    <div className="text-right text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                      <span>Balance Later:</span>
                      <div className="font-semibold">{formatINR(totalINR - advanceINR)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Supported Payment Badges */}
              <div className="pt-2 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#30221D]/70 dark:text-[#FFF3E3]/70 block">
                  Supported Methods
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                  <span className="px-2 py-1 rounded-lg bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331]">
                    UPI (Google Pay, PhonePe, Paytm)
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331]">
                    All Indian Credit & Debit Cards
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331]">
                    NetBanking (50+ Banks)
                  </span>
                </div>
              </div>

              {/* Pay Now Button */}
              <button
                type="button"
                onClick={handleLaunchRazorpay}
                disabled={isProcessing || payableINR <= 0}
                className="w-full py-4 rounded-2xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Opening Razorpay Secure Gateway...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-[#EAD2B0]" />
                    <span>Pay {formatINR(payableINR)} Securely</span>
                    <Sparkles className="w-4 h-4 text-[#EAD2B0]" />
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-[#30221D]/70 dark:text-[#FFF3E3]/70 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-[#B77A36]" />
                <span>PCI-DSS Level 1 Compliant • 256-bit SSL Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header Breadcrumb */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EAD2B0] text-[#681B1D] dark:bg-[#681B1D]/50 dark:text-[#EAD2B0] border border-[#681B1D]/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B77A36]" />
              <span>Razorpay Verified Gateway</span>
            </span>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center text-sm font-serif text-[#681B1D]">
              Loading Checkout...
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

