"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useEvntoraStore } from "@/lib/store";
import { useMarketplaceVendors } from "@/lib/use-marketplace";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import {
  Star,
  MapPin,
  ShieldCheck,
  Bookmark,
  Check,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle2,
  Send,
  Sparkles,
  Lock,
} from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { vendors, savedIds, loading, error, toggleSaved } = useMarketplaceVendors();
  const vendor = vendors.find((v) => v.id === resolvedParams.id);
  const { state, addEnquiry } = useEvntoraStore();
  const { profile: signedInProfile } = useAuth();

  const [clientName, setClientName] = useState(state.currentUser.name || "");
  const [clientEmail, setClientEmail] = useState(state.currentUser.email || "");
  const [clientPhone, setClientPhone] = useState(state.currentUser.phone || "+91 ");
  const [eventType, setEventType] = useState("Weddings");
  const [eventDate, setEventDate] = useState("2026-11-20");
  const [guestCount, setGuestCount] = useState(250);
  const [estimatedBudget, setEstimatedBudget] = useState(2500000);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState<string | undefined>(undefined);
  const [claimMessage, setClaimMessage] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [confirmClaim, setConfirmClaim] = useState(false);

  if (loading) return <main className="min-h-screen grid place-items-center">Loading vendor…</main>;
  if (error) return <main className="min-h-screen grid place-items-center">Unable to load this vendor right now.</main>;
  if (!vendor) return notFound();

  const isSaved = savedIds.includes(vendor.id);
  const claimListing = async () => {
    setClaiming(true); setClaimMessage("");
    const response = await fetch("/api/vendors/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId: vendor.id, confirmRoleChange: true }) });
    if (response.status === 401) { window.location.assign(`/signin?redirectTo=${encodeURIComponent(`/vendors/${vendor.id}`)}`); return; }
    if (response.ok) { window.location.assign("/vendor-portal"); return; }
    setClaimMessage("This listing can only be claimed by an account with its verified business contact email.");
    setClaiming(false);
  };

  const handleSubmitEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    addEnquiry({
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorCategory: vendor.category,
      clientName,
      clientEmail,
      clientPhone,
      eventType,
      eventDate,
      guestCount,
      estimatedBudget,
      message: message || `Inquiring about availability and packages for ${vendor.name}.`,
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10">
        {/* Back Link */}
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#30221D]/70 dark:text-[#FFF3E3]/70 hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Vendors</span>
        </Link>
        {vendor.claimable && signedInProfile?.role !== "admin" && <div className="flex flex-col items-start gap-2"><button disabled={claiming} onClick={() => setConfirmClaim(true)} className="rounded-xl border border-[#681B1D] dark:border-[#EAD2B0] px-4 py-2 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:bg-[#681B1D]/10 disabled:opacity-50 transition-colors">Claim this business</button>{confirmClaim && <div className="max-w-xl rounded-2xl border border-amber-300 bg-amber-50 dark:bg-[#2A1810] dark:border-amber-600/40 p-4 text-sm text-[#30221D] dark:text-[#FFF3E3]"><p>Claiming associates this listing with your account after we verify that your confirmed email matches the business contact email. Customer access stays available. Continue only if this email belongs to the business.</p><div className="mt-3 flex gap-2"><button disabled={claiming} onClick={() => void claimListing()} className="rounded-lg bg-[#681B1D] hover:bg-[#4B1117] px-3 py-2 text-xs font-semibold text-white transition-colors">{claiming ? "Verifying ownership…" : "Confirm verified claim"}</button><button disabled={claiming} onClick={() => setConfirmClaim(false)} className="rounded-lg border border-[#EAD2B0] dark:border-[#4D3331] px-3 py-2 text-xs">Cancel</button></div></div>}{claimMessage && <span role="status" className="text-xs text-[#B77A36]">{claimMessage}</span>}</div>}

        {/* Hero Visual Header */}
        <div className="relative rounded-3xl overflow-hidden bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] h-80 sm:h-96 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {vendor.coverImage ? <img
            src={vendor.coverImage}
            alt={vendor.name}
            className="w-full h-full object-cover"
          /> : <div className="h-full w-full bg-[#EAD2B0]/20 dark:bg-[#2A1810]" aria-label="No portfolio image available" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>

          <div className="absolute top-6 left-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFF3E3]/95 dark:bg-[#1A1211]/95 backdrop-blur-md text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs">
              {vendor.category}
            </span>
            {vendor.isVerified && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#681B1D]/20 backdrop-blur-md text-[#FFF3E3] border border-[#B77A36]/40 flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#EAD2B0]" />
                Verified Partner
              </span>
            )}
          </div>

          <button
            onClick={() => void toggleSaved(vendor.id)}
            className={`absolute top-6 right-6 p-3 rounded-2xl backdrop-blur-md transition-all cursor-pointer ${
              isSaved
                ? "bg-[#681B1D] text-[#FFF3E3] font-bold shadow-md"
                : "bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#FFFCF6] dark:hover:bg-[#1A1211]"
            }`}
          >
            <Bookmark className="w-5 h-5 fill-current" />
          </button>

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white">
                {vendor.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#EAD2B0]" />
                  {vendor.address}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-[#EAD2B0]">
                  <Star className="w-4 h-4 fill-[#B77A36] text-[#B77A36]" />
                  {vendor.rating !== null ? `${vendor.rating}${vendor.reviewCount !== null ? ` (${vendor.reviewCount} Reviews)` : ""}` : "No reviews yet"}
                </span>
                <span>•</span>
                {vendor.pastEventsCount > 0 && <span>{vendor.pastEventsCount} Celebrations Completed</span>}
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
              <span className="text-[10px] uppercase text-white/80 block font-bold">
                Starting Rate
              </span>
              <span className="text-xl font-serif font-bold text-white">
                {vendor.startingPrice === null ? "Contact for pricing" : formatINR(vendor.startingPrice)}{" "}
                {vendor.startingPrice !== null && <span className="text-xs text-white/70 font-sans font-normal">/{vendor.priceUnit}</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-8 space-y-8">
            {/* Overview */}
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-4">
              <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">About the Artisan</h2>
              <p className="text-[#30221D] dark:text-[#FFF3E3] text-sm leading-relaxed whitespace-pre-line">
                {vendor.description}
              </p>
            </div>

            {/* Gallery Images */}
            {vendor.galleryImages.length > 0 && (
              <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-4">
                <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Portfolio Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vendor.galleryImages.map((img, idx) => (
                    <div key={idx} className="h-56 rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="Portfolio showcase" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Offered */}
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-4">
              <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Signature Services Included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vendor.services.map((svc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center gap-2.5 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                    <CheckCircle2 className="w-4 h-4 text-[#B77A36] dark:text-[#EAD2B0] shrink-0" />
                    <span>{svc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Packages */}
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-6">
              <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Curated Packages</h2>
              <div className="space-y-4">
                {vendor.packages.map((pkg, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
                      <h3 className="text-base font-bold text-[#30221D] dark:text-[#FFF3E3]">{pkg.name}</h3>
                      <span className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                        {formatINR(pkg.price)}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-[#30221D]/80 dark:text-[#FFF3E3]/80">
                      {pkg.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#B77A36]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-3 border-t border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-between">
                      <span className="text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70">25% advance lock available</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackageForModal(pkg.name);
                          setBookingModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0]" />
                        <span>Book Package</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Enquiry Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl space-y-6">
              {/* Direct Booking Card */}
              <div className="p-5 rounded-2xl bg-[#681B1D]/10 dark:bg-[#681B1D]/30 border border-[#B77A36]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#681B1D] dark:text-[#EAD2B0]">
                    Verified Booking
                  </span>
                  <span className="text-[11px] font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                    25% Advance Lock
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackageForModal(undefined);
                    setBookingModalOpen(true);
                  }}
                  className="w-full py-3 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#EAD2B0]" />
                  <span>Book This Artisan Now</span>
                </button>
                <div className="text-[10px] text-center text-[#30221D]/70 dark:text-[#FFF3E3]/70 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-[#B77A36]" />
                  <span>Secure Razorpay Escrow Guarantee</span>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#EAD2B0] dark:border-[#4D3331]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#30221D]/60 dark:text-[#FFF3E3]/60">Or Send Custom Brief</span>
                <div className="flex-grow border-t border-[#EAD2B0] dark:border-[#4D3331]"></div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0]">
                  Direct Enquiry
                </span>
                <h3 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Check Availability</h3>
                <p className="text-xs text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                  Send your requirements directly to {vendor.name}&apos;s team with zero booking markup.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-[#681B1D]/10 dark:bg-[#681B1D]/30 border border-[#B77A36]/30 space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#B77A36] dark:text-[#EAD2B0] mx-auto" />
                  <h4 className="text-sm font-bold text-[#681B1D] dark:text-[#EAD2B0]">Enquiry Delivered!</h4>
                  <p className="text-xs text-[#30221D] dark:text-[#FFF3E3] leading-relaxed">
                    Your request has been logged and routed to {vendor.name}. You can review quote updates in your Customer Dashboard under Enquiries.
                  </p>
                  <Link
                    href="/dashboard/enquiries"
                    className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] font-bold text-xs transition-colors"
                  >
                    View in Dashboard
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmitEnquiry} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Email</label>
                      <input
                        type="email"
                        required
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Phone</label>
                      <input
                        type="tel"
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Event Date</label>
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Guests</label>
                      <input
                        type="number"
                        min="10"
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Specific Requirements</label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. Inquiring for 3-day wedding, requesting quote for mandap setup & Sangeet..."
                      className="w-full px-3 py-2 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#30221D]/40 dark:placeholder-[#FFF3E3]/40 focus:outline-none focus:border-[#B77A36]"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] font-bold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Official Enquiry</span>
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-1.5 text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#B77A36]" />
                  <span>{vendor.contactPhone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#B77A36]" />
                  <span>{vendor.contactEmail}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        vendor={vendor}
        initialPackageName={selectedPackageForModal}
      />

      <Footer />
    </div>
  );
}
