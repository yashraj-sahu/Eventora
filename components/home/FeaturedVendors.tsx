"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  Bookmark,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMarketplaceVendors } from "@/lib/use-marketplace";
import { formatINR } from "@/lib/utils";
import { BookingModal } from "@/components/booking/BookingModal";
import type { VendorItem } from "@/types";
import { TiltCard } from "@/components/motion/TiltCard";

export function FeaturedVendors() {
  const { vendors, savedIds, loading, error, toggleSaved } = useMarketplaceVendors();
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedVendorForBooking, setSelectedVendorForBooking] = useState<VendorItem | null>(null);

  const filterTabs = ["All", "Venues", "Photographers", "Caterers", "Decorators", "DJs"];

  // Filter vendors: allow all approved vendors, sorting featured vendors to the top
  const filteredVendors = vendors
    .filter((v) => {
      if (selectedFilter === "All") return true;
      const cat = (v.category || "").toLowerCase();
      const filter = selectedFilter.toLowerCase();
      const cleanFilter = filter.replace(/s$/, "");
      const cleanCat = cat.replace(/s$/, "");
      return cat === filter || cleanCat === cleanFilter || cat.includes(cleanFilter) || filter.includes(cleanCat);
    })
    .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0))
    .slice(0, 6);

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
            <span className="w-6 h-[1px] bg-[#B77A36]" />
            <span>Curated Artisans & Estates</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Find the right vendors for your event.
          </h2>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
            Browse royal vendor listings approved by the Evntora team. Service details, portfolio images, and package pricing come from each verified vendor profile.
          </p>
        </div>

        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:text-[#4B1117] dark:hover:text-[#FFF3E3] transition-colors group shrink-0"
        >
          <span>Explore All Vendors</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedFilter(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedFilter === tab
                ? "bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] shadow-md border border-[#B77A36]/40"
                : "bg-[#FFF3E3] dark:bg-[#2E1F1E] text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#681B1D] dark:hover:text-[#FFF3E3] border border-[#EAD2B0] dark:border-[#4D3331]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && error && <p role="alert" className="col-span-full py-10 text-center text-sm text-rose-600">{error}</p>}
        {!loading && !error && filteredVendors.length === 0 && <p className="col-span-full py-10 text-center text-sm text-[#7D6B63]">No approved vendors are available in this category yet.</p>}
        {loading && <p className="col-span-full py-10 text-center text-sm text-[#7D6B63]">Loading verified royal vendors…</p>}
        {filteredVendors.map((vendor) => {
          const isSaved = savedIds.includes(vendor.id);
          return (
            <TiltCard
              key={vendor.id}
              className="group rounded-3xl overflow-hidden bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative h-56 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {vendor.coverImage ? (
                  <img
                    src={vendor.coverImage}
                    alt={vendor.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-[#EAD2B0]/30 dark:bg-[#1A1211]" aria-label="No portfolio image available" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/30"></div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF3E3]/95 dark:bg-[#1A1211]/95 backdrop-blur-md text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs">
                    {vendor.category}
                  </span>
                  {vendor.isVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAD2B0]/90 text-[#681B1D] border border-[#B77A36]/40 flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-3 h-3 text-[#B77A36]" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Bookmark Toggle */}
                <button
                  onClick={() => void toggleSaved(vendor.id)}
                  aria-label={isSaved ? "Remove from bookmarks" : "Save to bookmarks"}
                  className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                    isSaved
                      ? "bg-[#681B1D] text-[#FFF3E3]"
                      : "bg-[#FFF3E3]/90 dark:bg-[#1A1211]/90 text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#FFF3E3]"
                  }`}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>

                {/* Rating & Location Tag */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                  {vendor.rating !== null && (
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                      <Star className="w-3.5 h-3.5 fill-[#B77A36] text-[#B77A36]" />
                      <span className="font-bold">{vendor.rating}</span>
                      <span className="text-white/80">({vendor.reviewCount})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white">
                    <MapPin className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>{vendor.city}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] group-hover:text-[#681B1D] dark:group-hover:text-[#EAD2B0] transition-colors">
                    {vendor.name}
                  </h3>
                  <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] line-clamp-2 leading-relaxed">
                    {vendor.shortBio}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#EAD2B0]/80 dark:border-[#4D3331] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] block">
                      Starting From
                    </span>
                    <span className="text-sm font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                      {vendor.startingPrice === null ? "Contact for pricing" : formatINR(vendor.startingPrice)}{" "}
                      {vendor.startingPrice !== null && (
                        <span className="text-[10px] font-sans font-normal text-[#7D6B63] dark:text-[#D4C3B7]">
                          /{vendor.priceUnit}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVendorForBooking(vendor);
                        setBookingModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs border border-[#B77A36]/40 transition-all"
                    >
                      <Sparkles className="w-3 h-3 text-[#EAD2B0]" />
                      <span>Book</span>
                    </button>
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="px-3 py-2 rounded-xl bg-[#FFFCF6] dark:bg-[#1A1211] hover:bg-[#EAD2B0]/30 text-[#30221D] dark:text-[#FFF3E3] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>Profile</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>

      {selectedVendorForBooking && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          vendor={selectedVendorForBooking}
        />
      )}
    </section>
  );
}
