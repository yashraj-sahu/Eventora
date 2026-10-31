"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SAMPLE_VENDORS } from "@/data/vendors";
import { useEvntoraStore } from "@/lib/store";
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
  const vendor = SAMPLE_VENDORS.find((v) => v.id === resolvedParams.id);
  const { state, toggleSaveVendor, addEnquiry } = useEvntoraStore();

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

  if (!vendor) {
    return notFound();
  }

  const isSaved = state.savedVendorIds.includes(vendor.id);

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
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10">
        {/* Back Link */}
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Vendors</span>
        </Link>

        {/* Hero Visual Header */}
        <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] h-80 sm:h-96 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vendor.coverImage}
            alt={vendor.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>

          <div className="absolute top-6 left-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 dark:bg-[#151B18]/90 backdrop-blur-md text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139] shadow-xs">
              {vendor.category}
            </span>
            {vendor.isVerified && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E7EFEA] text-[#173F35] border border-[#173F35]/20 flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Partner
              </span>
            )}
          </div>

          <button
            onClick={() => toggleSaveVendor(vendor.id)}
            className={`absolute top-6 right-6 p-3 rounded-2xl backdrop-blur-md transition-all cursor-pointer ${
              isSaved
                ? "bg-[#173F35] text-[#FAF8F3] font-bold"
                : "bg-white/80 dark:bg-[#151B18]/80 text-[#252522] dark:text-[#F4F0E7] hover:bg-white"
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
                  <MapPin className="w-3.5 h-3.5 text-[#C6A66B]" />
                  {vendor.address}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-[#C6A66B]">
                  <Star className="w-4 h-4 fill-[#C6A66B] text-[#C6A66B]" />
                  {vendor.rating} ({vendor.reviewCount} Reviews)
                </span>
                <span>•</span>
                <span>{vendor.pastEventsCount}+ Celebrations Completed</span>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
              <span className="text-[10px] uppercase text-white/80 block font-bold">
                Starting Rate
              </span>
              <span className="text-xl font-serif font-bold text-white">
                {formatINR(vendor.startingPrice)}{" "}
                <span className="text-xs text-white/70 font-sans font-normal">/{vendor.priceUnit}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-8 space-y-8">
            {/* Overview */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-4">
              <h2 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">About the Artisan</h2>
              <p className="text-[#252522] dark:text-[#F4F0E7] text-sm leading-relaxed whitespace-pre-line">
                {vendor.description}
              </p>
            </div>

            {/* Gallery Images */}
            {vendor.galleryImages.length > 0 && (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-4">
                <h2 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Portfolio Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vendor.galleryImages.map((img, idx) => (
                    <div key={idx} className="h-56 rounded-2xl overflow-hidden border border-[#E8E2D7] dark:border-[#344139]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="Portfolio showcase" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Offered */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-4">
              <h2 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Signature Services Included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vendor.services.map((svc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-center gap-2.5 text-xs text-[#252522] dark:text-[#F4F0E7]">
                    <CheckCircle2 className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0" />
                    <span>{svc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Packages */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-6">
              <h2 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Curated Packages</h2>
              <div className="space-y-4">
                {vendor.packages.map((pkg, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D7] dark:border-[#344139] pb-3">
                      <h3 className="text-base font-bold text-[#252522] dark:text-[#F4F0E7]">{pkg.name}</h3>
                      <span className="text-lg font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
                        {formatINR(pkg.price)}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-[#77746D] dark:text-[#B5B5AA]">
                      {pkg.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#C6A66B]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-3 border-t border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between">
                      <span className="text-[11px] text-[#77746D] dark:text-[#B5B5AA]">25% advance lock available</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackageForModal(pkg.name);
                          setBookingModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
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
            <div className="sticky top-28 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xl space-y-6">
              {/* Direct Booking Card */}
              <div className="p-5 rounded-2xl bg-[#E7EFEA] dark:bg-[#173F35]/40 border border-[#173F35]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#173F35] dark:text-[#A9C7B2]">
                    Verified Booking
                  </span>
                  <span className="text-[11px] font-bold text-[#173F35] dark:text-[#A9C7B2]">
                    25% Advance Lock
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackageForModal(undefined);
                    setBookingModalOpen(true);
                  }}
                  className="w-full py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#C6A66B]" />
                  <span>Book This Artisan Now</span>
                </button>
                <div className="text-[10px] text-center text-[#77746D] dark:text-[#B5B5AA] flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-[#C6A66B]" />
                  <span>Secure Razorpay Escrow Guarantee</span>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E8E2D7] dark:border-[#344139]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#77746D] dark:text-[#B5B5AA]">Or Send Custom Brief</span>
                <div className="flex-grow border-t border-[#E8E2D7] dark:border-[#344139]"></div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#C6A66B] dark:text-[#D4B77D]">
                  Direct Enquiry
                </span>
                <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Check Availability</h3>
                <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                  Send your requirements directly to {vendor.name}&apos;s team with zero booking markup.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/30 space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#173F35] dark:text-[#A9C7B2] mx-auto" />
                  <h4 className="text-sm font-bold text-[#173F35] dark:text-[#A9C7B2]">Enquiry Delivered!</h4>
                  <p className="text-xs text-[#252522] dark:text-[#F4F0E7] leading-relaxed">
                    Your request has been logged and routed to {vendor.name}. You can review quote updates in your Customer Dashboard under Enquiries.
                  </p>
                  <Link
                    href="/dashboard/enquiries"
                    className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#173F35] text-[#FAF8F3] font-bold text-xs"
                  >
                    View in Dashboard
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmitEnquiry} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Email</label>
                      <input
                        type="email"
                        required
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Phone</label>
                      <input
                        type="tel"
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Event Date</label>
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Guests</label>
                      <input
                        type="number"
                        min="10"
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Specific Requirements</label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. Inquiring for 3-day wedding, requesting quote for mandap setup & Sangeet..."
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D] dark:placeholder-[#898D84] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Official Enquiry</span>
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-[#E8E2D7] dark:border-[#344139] space-y-1.5 text-[11px] text-[#77746D] dark:text-[#B5B5AA]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>{vendor.contactPhone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2]" />
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
