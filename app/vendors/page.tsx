"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SAMPLE_VENDORS } from "@/data/vendors";
import { CITIES } from "@/data/cities";
import { VENDOR_CATEGORIES } from "@/data/categories";
import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import {
  Search,
  MapPin,
  Star,
  ShieldCheck,
  Bookmark,
  ArrowRight,
  Filter,
  RotateCcw,
} from "lucide-react";

export default function VendorsPage() {
  const { state, toggleSaveVendor } = useEvntoraStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState("All");
  const [minRating, setMinRating] = useState(0);

  const filteredVendors = useMemo(() => {
    return SAMPLE_VENDORS.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.services.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCity = selectedCity === "All" || v.city === selectedCity;
      const matchesCategory = selectedCategory === "All" || v.category === selectedCategory;
      const matchesPrice = selectedPriceRange === "All" || v.priceRange === selectedPriceRange;
      const matchesRating = v.rating >= minRating;

      return matchesSearch && matchesCity && matchesCategory && matchesPrice && matchesRating;
    });
  }, [searchQuery, selectedCity, selectedCategory, selectedPriceRange, minRating]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCity("All");
    setSelectedCategory("All");
    setSelectedPriceRange("All");
    setMinRating(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">      <Navbar />

      <main className="flex-1 py-12 space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-amber-300">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Strictly Verified Top 1% Event Artisans & Palaces</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Explore Vendor Marketplace.
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Search verified palace estates, award-winning cinematographers, master royal caterers, and lighting architects across 50+ Indian destinations.
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4 shadow-xl">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by vendor name, service (e.g. Sangeet Mandap, Live Dhol), or keyword..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* City Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Destination City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="All">All Cities (Pan-India)</option>
                {CITIES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Artisan Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="All">All Categories</option>
                {VENDOR_CATEGORIES.map((vc) => (
                  <option key={vc.id} value={vc.id}>
                    {vc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Tier Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Price Tier
              </label>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="All">Any Price Tier</option>
                <option value="₹₹">₹₹ (Moderate)</option>
                <option value="₹₹₹">₹₹₹ (Premium)</option>
                <option value="₹₹₹₹">₹₹₹₹ (Luxury)</option>
                <option value="₹₹₹₹₹">₹₹₹₹₹ (Royal Bespoke)</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Client Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value={0}>Any Rating</option>
                <option value={4.8}>4.8+ Stars</option>
                <option value={4.9}>4.9+ Stars (Top Rated)</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-white">{filteredVendors.length}</span> verified artisans & estates
            </div>
            {(searchQuery || selectedCity !== "All" || selectedCategory !== "All" || selectedPriceRange !== "All" || minRating > 0) && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Vendors Grid or Empty State */}
        {filteredVendors.length === 0 ? (
          <div className="p-16 rounded-3xl glass-card text-center space-y-4 max-w-lg mx-auto">
            <Filter className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-xl font-bold text-white">No Matching Vendors Found</h3>
            <p className="text-xs text-slate-400">
              Try adjusting your city filter or keywords to discover more of our nationwide artisan network.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
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

                    <button
                      onClick={() => toggleSaveVendor(vendor.id)}
                      className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all ${
                        isSaved
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-950/70 text-slate-300 hover:text-white"
                      }`}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>

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

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                        {vendor.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {vendor.shortBio}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {vendor.services.slice(0, 3).map((svc, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          {svc}
                        </span>
                      ))}
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
        )}
      </main>

      <Footer />
    </div>
  );
}

