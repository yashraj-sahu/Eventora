"use client";

import { useEffect, useState } from "react";
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
    serviceOptions?: Array<{ id: string; name: string; description: string | null }>;
    packages?: Array<{
      id?: string;
      name: string;
      price: number;
      features: string[];
    }>;
  };
  initialPackageName?: string;
  initialServiceId?: string;
  eventId?: string;
}

const NO_PACKAGES: NonNullable<BookingModalProps["vendor"]["packages"]> = [];

export function BookingModal({
  isOpen,
  onClose,
  vendor,
  initialPackageName,
  initialServiceId,
  eventId,
}: BookingModalProps) {
  const router = useRouter();
  const { isAuthenticated, profile } = useAuth();

  const packages = vendor.packages ?? NO_PACKAGES;

  const [selectedPkgName, setSelectedPkgName] = useState(
    initialPackageName || packages[0]?.name || "Standard Package"
  );
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCity, setEventCity] = useState(vendor.city || "");
  const [guestCount, setGuestCount] = useState(100);
  const [advancePercent, setAdvancePercent] = useState<25 | 50 | 100>(25);
  const [requirements, setRequirements] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingRequestReference, setBookingRequestReference] = useState<string | null>(null);
  const [bookingIdempotencyKey, setBookingIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = sessionStorage.getItem("evntora_pending_booking");
      if (!raw) return;
      const pending = JSON.parse(raw) as { vendorProfileId?: string; eventDate?: string; eventCity?: string; guestCount?: number; packageId?: string | null; serviceId?: string | null; idempotencyKey?: string; requirements?: string; advancePercentage?: 25 | 50 | 100 };
      if (pending.vendorProfileId !== vendor.id) return;
      if (pending.eventDate) setEventDate(pending.eventDate);
      if (pending.eventCity) setEventCity(pending.eventCity);
      if (typeof pending.guestCount === "number") setGuestCount(pending.guestCount);
      if (pending.requirements) setRequirements(pending.requirements);
      if (pending.advancePercentage && [25, 50, 100].includes(pending.advancePercentage)) setAdvancePercent(pending.advancePercentage);
      if (pending.packageId) {
        const restored = packages.find((item) => item.id === pending.packageId);
        if (restored) setSelectedPkgName(restored.name);
      }
      if (pending.serviceId) setSelectedServiceId(pending.serviceId);
      if (pending.idempotencyKey && /^[0-9a-f-]{36}$/i.test(pending.idempotencyKey)) setBookingIdempotencyKey(pending.idempotencyKey);
    } catch { sessionStorage.removeItem("evntora_pending_booking"); }
  }, [isOpen, vendor.id, packages]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedServiceId(initialServiceId || "");
    if (initialPackageName) setSelectedPkgName(initialPackageName);
  }, [isOpen, initialServiceId, initialPackageName]);

  if (!isOpen) return null;

  const currentPkg = selectedServiceId ? undefined : packages.find((p) => p.name === selectedPkgName) || packages[0];
  const totalPrice = currentPkg ? currentPkg.price : 0;
  const advanceAmount = Math.round(totalPrice * (advancePercent / 100));
  const remainingAmount = totalPrice - advanceAmount;

  const handleProceedToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      const pendingData = {
        vendorProfileId: vendor.id,
        ...(eventId ? { eventId } : {}),
        packageId: currentPkg?.id ?? null,
        serviceId: selectedServiceId || null,
        eventDate,
        eventCity,
        guestCount,
        advancePercentage: advancePercent,
        idempotencyKey: bookingIdempotencyKey,
        requirements,
      };
      sessionStorage.setItem("evntora_pending_booking", JSON.stringify(pendingData));
      router.push(`/signin?redirect=${encodeURIComponent(`/vendors${eventId ? `?eventId=${eventId}` : ""}`)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorProfileId: vendor.id,
          ...(eventId ? { eventId } : {}),
          packageId: currentPkg?.id ?? null,
          serviceId: selectedServiceId || null,
          eventDate,
          eventCity,
          guestCount,
          advancePercentage: advancePercent,
          requirements,
          idempotencyKey: bookingIdempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking.");
      }

      setBookingRequestReference(data.bookingReference);
      sessionStorage.removeItem("evntora_pending_booking");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking initialization failed";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#FFF3E3] dark:bg-[#2E1F1E] rounded-3xl border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-between bg-[#FAF3E8] dark:bg-[#1A1211]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EAD2B0]/60 text-[#681B1D] dark:bg-[#681B1D]/60 dark:text-[#EAD2B0] border border-[#B77A36]/40">
                {vendor.category}
              </span>
              <span className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B77A36]" />
                Verified Artisan Booking
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
              Book {vendor.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#7D6B63] hover:text-[#681B1D] dark:text-[#D4C3B7] dark:hover:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleProceedToCheckout} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {bookingRequestReference && (
            <div role="status" className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium">
              Booking request {bookingRequestReference} has been saved. {packages.length ? "Payment becomes available after vendor acceptance." : "The vendor can now prepare a quotation for your request."} <a className="underline font-bold" href="/dashboard/payments?tab=bookings">View booking</a>
            </div>
          )}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Service and package selection */}
          {!!vendor.serviceOptions?.length && <div className="space-y-2"><label className="block text-[#7D6B63] dark:text-[#D4C3B7] font-bold uppercase tracking-wider text-[11px]">Requested service (optional)</label><select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} className="w-full rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-3 text-sm"><option value="">Choose a listed service</option>{vendor.serviceOptions.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>{selectedServiceId && <p className="text-[#7D6B63]">Final service price will be sent as a vendor quotation for your approval.</p>}</div>}
          {/* Package Selection */}
          <div className="space-y-2">
            <label className="block text-[#7D6B63] dark:text-[#D4C3B7] font-bold uppercase tracking-wider text-[11px]">
              {packages.length ? "Select Curated Package" : "Request a Custom Quotation"}
            </label>
            {!packages.length && <p className="text-[#7D6B63] dark:text-[#D4C3B7]">This vendor has not published package pricing. Submit your event details and the vendor can send a quotation for review.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((pkg) => {
                const isSelected = !selectedServiceId && pkg.name === selectedPkgName;
                return (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => { setSelectedServiceId(""); setSelectedPkgName(pkg.name); }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#EAD2B0]/50 dark:bg-[#3D2624] border-[#681B1D] dark:border-[#EAD2B0] shadow-xs"
                        : "bg-[#FFFCF6]/80 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#30221D] dark:text-[#FFF3E3] text-xs">
                        {pkg.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
                      )}
                    </div>
                    <div className="mt-1 font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0] text-sm">
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
              <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-semibold">
                Event Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-[#7D6B63] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-semibold">
                Celebration City
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-[#7D6B63] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={eventCity}
                  onChange={(e) => setEventCity(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-semibold">
                Estimated Guests
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-[#7D6B63] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                />
              </div>
            </div>
          </div>

          {currentPkg && <>
          {/* Payment Structure (Advance vs Full) */}
          <div className="space-y-2">
            <label className="block text-[#7D6B63] dark:text-[#D4C3B7] font-bold uppercase tracking-wider text-[11px]">
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
                      ? "bg-[#681B1D] text-[#FFF3E3] border-[#681B1D] shadow-xs"
                      : "bg-[#FFFCF6]/80 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] dark:text-[#D4C3B7] hover:border-[#B77A36]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-semibold">
              Event Notes & Special Instructions
            </label>
            <textarea
              rows={2}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="e.g. Traditional royal theme, requires acoustic sound testing at 4 PM..."
              className="w-full px-3 py-2 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
            />
          </div>

          {/* Price Breakdown Card */}
          <div className="p-4 rounded-2xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
            <div className="flex items-center justify-between text-[#7D6B63] dark:text-[#D4C3B7]">
              <span>Agreed Package Rate:</span>
              <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3]">
                {formatINR(totalPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#7D6B63] dark:text-[#D4C3B7]">
                <span>Initial Payment After Acceptance ({advancePercent}%):</span>
              <span className="font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                {formatINR(advanceAmount)}
              </span>
            </div>
            {advancePercent < 100 && (
              <div className="flex items-center justify-between text-[#7D6B63] dark:text-[#D4C3B7] border-t border-[#EAD2B0]/60 dark:border-[#4D3331] pt-1.5 text-[11px]">
                <span>Remaining Balance After Initial Payment:</span>
                <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3]">
                  {formatINR(remainingAmount)}
                </span>
              </div>
            )}
          </div>
          </>}

          {/* Trust Footnote */}
          <div className="flex items-center gap-2 text-[11px] text-[#7D6B63] dark:text-[#D4C3B7]">
            <Lock className="w-3.5 h-3.5 text-[#B77A36] shrink-0" />
            <span>
              Transactions processed via Razorpay Standard Checkout with 256-bit SSL encryption.
            </span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || Boolean(bookingRequestReference)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-[#B77A36]/40"
            >
              {isSubmitting ? (
                <span>Generating Booking Order...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0]" />
                <span>{bookingRequestReference ? "Request Sent" : currentPkg ? `Send Booking Request · ${formatINR(advanceAmount)} due after acceptance` : "Request a Vendor Quotation"}</span>
                  <ArrowRight className="w-4 h-4 text-[#EAD2B0]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
