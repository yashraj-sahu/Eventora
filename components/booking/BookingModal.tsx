"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Users,
  Coins,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: {
    id: string;
    name: string;
    category: string;
    city: string;
    startingPrice: number | null;
    priceUnit: string;
    packages?: Array<{
      name: string;
      price: number;
      features: string[];
    }>;
  };
  initialPackageName?: string;
}

export function BookingModal({
  isOpen,
  onClose,
  vendor,
  initialPackageName,
}: BookingModalProps) {
  const router = useRouter();
  const { isAuthenticated, profile } = useAuth();

  const packages = vendor.packages?.length ? vendor.packages : vendor.startingPrice === null ? [] : [
    { name: "Starting price", price: vendor.startingPrice, features: [] },
  ];

  const [selectedPkgName, setSelectedPkgName] = useState(
    initialPackageName || packages[0]?.name || "Standard Package"
  );
  const [eventDate, setEventDate] = useState("2026-11-20");
  const [eventCity, setEventCity] = useState(vendor.city || "Udaipur");
  const [guestCount, setGuestCount] = useState(250);
  const [advancePercent, setAdvancePercent] = useState<25 | 50 | 100>(25);
  const [requirements, setRequirements] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;
  if (packages.length === 0) return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div className="rounded-2xl bg-white p-6 text-center"><h2 className="font-semibold">Request a quote</h2><p className="mt-2 text-sm">This vendor has not published package pricing yet.</p><button className="mt-4 rounded-lg bg-[#173F35] px-4 py-2 text-white" onClick={onClose}>Close</button></div></div>;

  const currentPkg =
    packages.find((p) => p.name === selectedPkgName) || packages[0];
  const totalPrice = currentPkg ? currentPkg.price : (vendor.startingPrice ?? 0);
  const advanceAmount = Math.round(totalPrice * (advancePercent / 100));
  const remainingAmount = totalPrice - advanceAmount;

  const handleProceedToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      // Store pending booking in sessionStorage so user can continue after login
      const pendingData = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorCategory: vendor.category,
        packageName: selectedPkgName,
        eventDate,
        eventCity,
        guestCount,
        totalAmount: totalPrice,
        advancePercentage: advancePercent,
        requirements,
      };
      sessionStorage.setItem("evntora_pending_booking", JSON.stringify(pendingData));
      router.push(`/signin?redirect=/checkout`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorCategory: vendor.category,
          packageName: selectedPkgName,
          eventDate,
          eventCity,
          guestCount,
          totalAmount: totalPrice,
          advancePercentage: advancePercent,
          requirements,
          serviceDetails: {
            features: currentPkg?.features || [],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking.");
      }

      onClose();
      router.push(`/checkout?bookingId=${data.bookingId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking initialization failed";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1E2621] rounded-3xl border border-[#E8E2D7] dark:border-[#344139] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between bg-[#FAF8F3] dark:bg-[#151B18]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E7EFEA] text-[#173F35] dark:bg-[#173F35]/50 dark:text-[#A9C7B2] border border-[#173F35]/20">
                {vendor.category}
              </span>
              <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C6A66B]" />
                Verified Artisan Booking
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Book {vendor.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#77746D] hover:text-[#173F35] dark:text-[#B5B5AA] dark:hover:text-[#F4F0E7] hover:bg-[#E8E2D7]/50 dark:hover:bg-[#232F28] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleProceedToCheckout} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Package Selection */}
          <div className="space-y-2">
            <label className="block text-[#77746D] dark:text-[#B5B5AA] font-bold uppercase tracking-wider text-[11px]">
              Select Curated Package
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((pkg) => {
                const isSelected = pkg.name === selectedPkgName;
                return (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => setSelectedPkgName(pkg.name)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#E7EFEA] dark:bg-[#173F35]/40 border-[#173F35] dark:border-[#A9C7B2] shadow-xs"
                        : "bg-[#FAF8F3] dark:bg-[#151B18] border-[#E8E2D7] dark:border-[#344139] hover:border-[#C6A66B]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#252522] dark:text-[#F4F0E7] text-xs">
                        {pkg.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
                      )}
                    </div>
                    <div className="mt-1 font-serif font-bold text-[#173F35] dark:text-[#A9C7B2] text-sm">
                      {formatINR(pkg.price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">
                Event Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-[#77746D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#151B18] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">
                Celebration City
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-[#77746D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={eventCity}
                  onChange={(e) => setEventCity(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#151B18] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">
                Estimated Guests
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-[#77746D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#151B18] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35]"
                />
              </div>
            </div>
          </div>

          {/* Payment Structure (Advance vs Full) */}
          <div className="space-y-2">
            <label className="block text-[#77746D] dark:text-[#B5B5AA] font-bold uppercase tracking-wider text-[11px]">
              Initial Booking Payment
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { pct: 25 as const, label: "25% Advance Lock" },
                { pct: 50 as const, label: "50% Standard Advance" },
                { pct: 100 as const, label: "100% Full Payment" },
              ].map((opt) => (
                <button
                  key={opt.pct}
                  type="button"
                  onClick={() => setAdvancePercent(opt.pct)}
                  className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                    advancePercent === opt.pct
                      ? "bg-[#173F35] text-white border-[#173F35] shadow-xs"
                      : "bg-[#FAF8F3] dark:bg-[#151B18] border-[#E8E2D7] dark:border-[#344139] text-[#77746D] dark:text-[#B5B5AA]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">
              Event Notes & Special Instructions
            </label>
            <textarea
              rows={2}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="e.g. Traditional royal theme, requires acoustic sound testing at 4 PM..."
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#151B18] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35]"
            />
          </div>

          {/* Price Breakdown Card */}
          <div className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#151B18] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
            <div className="flex items-center justify-between text-[#77746D] dark:text-[#B5B5AA]">
              <span>Agreed Package Rate:</span>
              <span className="font-semibold text-[#252522] dark:text-[#F4F0E7]">
                {formatINR(totalPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#77746D] dark:text-[#B5B5AA]">
              <span>Initial Advance Payable Now ({advancePercent}%):</span>
              <span className="font-bold text-[#173F35] dark:text-[#A9C7B2]">
                {formatINR(advanceAmount)}
              </span>
            </div>
            {advancePercent < 100 && (
              <div className="flex items-center justify-between text-[#77746D] dark:text-[#B5B5AA] border-t border-[#E8E2D7] dark:border-[#344139] pt-1.5 text-[11px]">
                <span>Remaining Balance Due Pre-Event:</span>
                <span className="font-semibold text-[#252522] dark:text-[#F4F0E7]">
                  {formatINR(remainingAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Trust Footnote */}
          <div className="flex items-center gap-2 text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
            <Lock className="w-3.5 h-3.5 text-[#C6A66B] shrink-0" />
            <span>
              Transactions processed via Razorpay Standard Checkout with 256-bit SSL encryption.
            </span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Generating Booking Order...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#C6A66B]" />
                  <span>Proceed to Secure Checkout • Pay {formatINR(advanceAmount)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

