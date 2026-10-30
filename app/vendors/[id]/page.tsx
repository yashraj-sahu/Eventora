"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/ui/DemoBanner";
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
  Calendar,
  Users,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Send,
} from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">
      <DemoBanner />
      <Navbar />

      <main className="flex-1 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10">
        {/* Back Link */}
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Vendors</span>
        </Link>

        {/* Hero Visual Header */}
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 h-80 sm:h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vendor.coverImage}
            alt={vendor.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/40 to-black/30"></div>

          <div className="absolute top-6 left-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-amber-400 border border-amber-500/30">
              {vendor.category}
            </span>
            {vendor.isVerified && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Partner
              </span>
            )}
          </div>

          <button
            onClick={() => toggleSaveVendor(vendor.id)}
            className={`absolute top-6 right-6 p-3 rounded-2xl backdrop-blur-md transition-all ${
              isSaved
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-black/60 text-white hover:bg-black/80"
            }`}
          >
            <Bookmark className="w-5 h-5 fill-current" />
          </button>

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white">
                {vendor.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {vendor.address}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {vendor.rating} ({vendor.reviewCount} Reviews)
                </span>
                <span>•</span>
                <span>{vendor.pastEventsCount}+ Celebrations Completed</span>
              </div>
            </div>

            <div className="bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">
                Starting Rate
              </span>
              <span className="text-xl font-bold text-amber-400">
                {formatINR(vendor.startingPrice)}{" "}
                <span className="text-xs text-slate-400 font-normal">/{vendor.priceUnit}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-8 space-y-8">
            {/* Overview */}
            <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
              <h2 className="text-xl font-serif font-bold text-white">About the Artisan</h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {vendor.description}
              </p>
            </div>

            {/* Gallery Images */}
            {vendor.galleryImages.length > 0 && (
              <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
                <h2 className="text-xl font-serif font-bold text-white">Portfolio Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vendor.galleryImages.map((img, idx) => (
                    <div key={idx} className="h-56 rounded-2xl overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="Portfolio showcase" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Offered */}
            <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
              <h2 className="text-xl font-serif font-bold text-white">Signature Services Included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vendor.services.map((svc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{svc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Packages */}
            <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
              <h2 className="text-xl font-serif font-bold text-white">Curated Packages</h2>
              <div className="space-y-4">
                {vendor.packages.map((pkg, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <h3 className="text-base font-bold text-white">{pkg.name}</h3>
                      <span className="text-lg font-serif font-bold text-amber-400">
                        {formatINR(pkg.price)}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {pkg.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Enquiry Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 p-6 sm:p-8 rounded-3xl glass-panel border border-amber-500/30 shadow-2xl space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  Direct Enquiry
                </span>
                <h3 className="text-xl font-serif font-bold text-white">Check Availability</h3>
                <p className="text-xs text-slate-400">
                  Send your requirements directly to {vendor.name}&apos;s team with zero booking markup.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Enquiry Delivered!</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your request has been logged and routed to {vendor.name}. You can review quote updates in your Customer Dashboard under Enquiries.
                  </p>
                  <Link
                    href="/dashboard/enquiries"
                    className="inline-block mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    View in Dashboard
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmitEnquiry} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Event Date</label>
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Guests</label>
                      <input
                        type="number"
                        min="10"
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Specific Requirements</label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. Inquiring for 3-day wedding, requesting quote for mandap setup & Sangeet..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Official Enquiry</span>
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{vendor.contactPhone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>{vendor.contactEmail}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

