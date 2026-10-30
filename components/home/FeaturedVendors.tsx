"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  CheckCircle2,
  Bookmark,
  ArrowRight,
  ShieldCheck,
  Building2,
  Camera,
  Utensils,
  Palette,
  Disc,
} from "lucide-react";
import { SAMPLE_VENDORS } from "@/data/vendors";
import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";

export function FeaturedVendors() {
  const { state, toggleSaveVendor } = useEvntoraStore();
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filterTabs = ["All", "Venues", "Photographers", "Caterers", "Decorators", "DJs"];

  const filteredVendors =
    selectedFilter === "All"
      ? SAMPLE_VENDORS.slice(0, 6)
      : SAMPLE_VENDORS.filter((v) => v.category === selectedFilter).slice(0, 6);

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
            Curated Artisans & Estates
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            India&apos;s Top 1% Verified Vendors.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every vendor on Evntora undergoes strict quality auditing, insurance checks, 
            and verified client reference verification. No unvetted third parties.
          </p>
        </div>

        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors group shrink-0"
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedFilter === tab
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
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
              className="group rounded-2xl overflow-hidden glass-card border border-white/10 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative h-56 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vendor.coverImage}
                  alt={vendor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-black/40"></div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-amber-400 border border-amber-500/30">
                    {vendor.category}
                  </span>
                  {vendor.isVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Bookmark Toggle */}
                <button
                  onClick={() => toggleSaveVendor(vendor.id)}
                  aria-label={isSaved ? "Remove from bookmarks" : "Save to bookmarks"}
                  className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all ${
                    isSaved
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>

                {/* Rating & Location Tag */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{vendor.rating}</span>
                    <span className="text-slate-400">({vendor.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{vendor.city}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                    {vendor.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {vendor.shortBio}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      Starting From
                    </span>
                    <span className="text-sm font-bold text-amber-400">
                      {formatINR(vendor.startingPrice)}{" "}
                      <span className="text-[10px] font-normal text-slate-400">
                        /{vendor.priceUnit}
                      </span>
                    </span>
                  </div>

                  <Link
                    href={`/vendors/${vendor.id}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-800 text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

