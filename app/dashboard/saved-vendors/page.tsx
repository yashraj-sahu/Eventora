"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMarketplaceVendors } from "@/lib/use-marketplace";
import { formatINR } from "@/lib/utils";
import { Bookmark, Star, MapPin, ShieldCheck, ArrowRight, Trash2, Sparkles } from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";
import type { VendorItem } from "@/types";

export default function SavedVendorsPage() {
  const eventId = useSearchParams().get("eventId") ?? undefined;
  const { vendors, savedIds, loading, error, toggleSaved } = useMarketplaceVendors();
  const savedVendors = vendors.filter((vendor) => savedIds.includes(vendor.id));
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedVendorForBooking, setSelectedVendorForBooking] = useState<VendorItem | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Shortlisted Vendors</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            Saved Vendors & Palace Estates
          </h1>
          <p className="text-xs text-[#D4C3B7]">
            Compare packages, request customized proposals, and track booked partners
          </p>
        </div>

        <Link
          href="/dashboard/vendors?returnTo=%2Fdashboard%2Fsaved-vendors"
          className="px-5 py-2.5 rounded-xl bg-[#2E1F1E] hover:bg-[#4D3331] border border-[#4D3331] text-[#FFF3E3] font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0"
        >
          <span>Discover More Vendors</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? <p className="p-12 text-center">Loading saved vendors…</p> : error ? <p className="p-12 text-center text-rose-400">{error}</p> : savedVendors.length === 0 ? (
        <div className="p-16 text-center glass-card rounded-3xl space-y-4">
          <Bookmark className="w-8 h-8 text-[#9E897F] mx-auto" />
          <h3 className="text-xl font-bold text-white">No Saved Vendors Yet</h3>
          <p className="text-xs text-[#D4C3B7] max-w-sm mx-auto">
            Browse our nationwide directory and click the bookmark icon to save venues, caterers, or photographers here.
          </p>
          <Link
            href="/dashboard/vendors?returnTo=%2Fdashboard%2Fsaved-vendors"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-[#1A1211] font-bold text-xs"
          >
            Explore Vendors
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="p-6 rounded-3xl glass-card border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="relative h-44 rounded-2xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {vendor.coverImage ? <img src={vendor.coverImage} alt={vendor.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#4D3331]" aria-label="No portfolio image" />}
                  <button
                    onClick={() => void toggleSaved(vendor.id)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-amber-400 hover:text-white backdrop-blur-md"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-amber-300 font-bold uppercase tracking-wider backdrop-blur-md">
                    {vendor.category}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-serif font-bold text-white">{vendor.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#D4C3B7] mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {vendor.city}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {vendor.rating === null ? "No reviews" : vendor.rating}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#D4C3B7]">
                  <span className="text-[#9E897F] block text-[10px] uppercase font-bold">Starting Rate</span>
                  <span className="font-serif font-bold text-amber-400 text-sm">
                    {vendor.startingPrice === null ? "Contact for pricing" : formatINR(vendor.startingPrice)}{" "}
                    {vendor.startingPrice !== null && <span className="text-[10px] font-normal text-[#D4C3B7]">/{vendor.priceUnit}</span>}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendorForBooking(vendor);
                    setBookingModalOpen(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-white font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#B77A36]" />
                  <span>Book Now</span>
                </button>
                <Link
                  href={eventId ? `/vendors/${vendor.id}?eventId=${encodeURIComponent(eventId)}` : `/vendors/${vendor.id}?returnTo=${encodeURIComponent("/dashboard/saved-vendors")}`}
                  className="py-2.5 px-3 rounded-xl bg-[#2E1F1E] hover:bg-[#4D3331] text-[#FFF3E3] border border-[#4D3331] text-xs font-semibold text-center transition-all flex items-center justify-center gap-1"
                >
                  <span>Profile</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVendorForBooking && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          vendor={selectedVendorForBooking}
          eventId={eventId}
        />
      )}
    </div>
  );
}

