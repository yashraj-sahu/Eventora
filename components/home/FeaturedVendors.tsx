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
import { SAMPLE_VENDORS } from "@/data/vendors";
import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { BookingModal } from "@/components/booking/BookingModal";
import type { VendorItem } from "@/types";

export function FeaturedVendors() {
  const { state, toggleSaveVendor } = useEvntoraStore();
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedVendorForBooking, setSelectedVendorForBooking] = useState<VendorItem | null>(null);

  const filterTabs = ["All", "Venues", "Photographers", "Caterers", "Decorators", "DJs"];

  const filteredVendors =
    selectedFilter === "All"
      ? SAMPLE_VENDORS.slice(0, 6)
      : SAMPLE_VENDORS.filter((v) => v.category === selectedFilter).slice(0, 6);

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-[#C6A66B] dark:text-[#D4B77D] font-bold">
            Curated Artisans & Estates
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            India&apos;s Top 1% Verified Vendors.
          </h2>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm sm:text-base leading-relaxed">
            Every vendor on Evntora undergoes strict quality auditing, insurance checks, 
            and verified client reference verification. No unvetted third parties.
          </p>
        </div>

        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#173F35] dark:text-[#A9C7B2] hover:text-[#0F2B24] dark:hover:text-[#F4F0E7] transition-colors group shrink-0"
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedFilter === tab
                ? "bg-[#173F35] text-[#FAF8F3] dark:bg-[#A9C7B2] dark:text-[#151B18] shadow-xs"
                : "bg-white dark:bg-[#232F28] text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#F4F0E7] border border-[#E8E2D7] dark:border-[#344139]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => {
          const isSaved = state.savedVendorIds.includes(vendor.id);
          return (
            <div
              key={vendor.id}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#C6A66B] dark:hover:border-[#D4B77D] hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative h-56 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vendor.coverImage}
                  alt={vendor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-[#151B18]/90 backdrop-blur-md text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139] shadow-xs">
                    {vendor.category}
                  </span>
                  {vendor.isVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7EFEA] text-[#173F35] border border-[#173F35]/20 flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Bookmark Toggle */}
                <button
                  onClick={() => toggleSaveVendor(vendor.id)}
                  aria-label={isSaved ? "Remove from bookmarks" : "Save to bookmarks"}
                  className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                    isSaved
                      ? "bg-[#173F35] text-[#FAF8F3]"
                      : "bg-white/80 dark:bg-[#151B18]/80 text-[#252522] dark:text-[#F4F0E7] hover:bg-white"
                  }`}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>

                {/* Rating & Location Tag */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-[#C6A66B] text-[#C6A66B]" />
                    <span className="font-bold">{vendor.rating}</span>
                    <span className="text-white/80">({vendor.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white">
                    <MapPin className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>{vendor.city}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] group-hover:text-[#0F2B24] transition-colors">
                    {vendor.name}
                  </h3>
                  <p className="text-xs text-[#77746D] dark:text-[#B5B5AA] line-clamp-2 leading-relaxed">
                    {vendor.shortBio}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#77746D] dark:text-[#B5B5AA] block">
                      Starting From
                    </span>
                    <span className="text-sm font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
                      {formatINR(vendor.startingPrice)}{" "}
                      <span className="text-[10px] font-sans font-normal text-[#77746D] dark:text-[#B5B5AA]">
                        /{vendor.priceUnit}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVendorForBooking(vendor);
                        setBookingModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                    >
                      <Sparkles className="w-3 h-3 text-[#C6A66B]" />
                      <span>Book</span>
                    </button>
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] hover:bg-[#E7EFEA] dark:hover:bg-[#173F35]/40 text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>Profile</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
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
