"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useMarketplaceVendors } from "@/lib/use-marketplace";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import {
  Search,
  MapPin,
  ShieldCheck,
  Bookmark,
  ArrowRight,
  Filter,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";
import type { VendorItem } from "@/types";

function RoyalFlourishMotif() {
  return (
    <div className="flex items-center gap-2.5 my-1">
      <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent via-[#B77A36] to-transparent" />
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#B77A36]">
        <path
          d="M12 2C12 7 7 12 2 12C7 12 12 17 12 22C12 17 17 12 22 12C17 12 12 7 12 2Z"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
      <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent via-[#B77A36] to-transparent" />
    </div>
  );
}

export default function VendorsPage() {
  const { vendors, savedIds, loading, error, toggleSaved } = useMarketplaceVendors();
  const { roles } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedVendorForBooking, setSelectedVendorForBooking] = useState<VendorItem | null>(null);
  const [eventId, setEventId] = useState<string | undefined>();
  const [returnTo, setReturnTo] = useState("/dashboard");
  const [managedCategories, setManagedCategories] = useState<string[]>([]);
  const restoredPendingBooking = useRef(false);

  useEffect(() => {
    const city = new URLSearchParams(window.location.search).get("city");
    if (city) setSelectedCity(city);
    const selectedEventId = new URLSearchParams(window.location.search).get("eventId");
    if (selectedEventId) setEventId(selectedEventId);
    const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (requestedReturnTo?.startsWith("/dashboard") && !requestedReturnTo.startsWith("//") && !requestedReturnTo.includes("\\")) setReturnTo(requestedReturnTo);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/marketplace/categories", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (response.ok && active) setManagedCategories((data.categories ?? []).map((item: { name: string }) => item.name));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loading || restoredPendingBooking.current || !roles.includes("customer")) return;
    try {
      const raw = sessionStorage.getItem("evntora_pending_booking");
      if (!raw) return;
      const pending = JSON.parse(raw) as { vendorProfileId?: string; eventId?: string; packageId?: string | null };
      if (!pending.vendorProfileId) return;
      const vendor = vendors.find((item) => item.id === pending.vendorProfileId);
      if (!vendor) return;
      restoredPendingBooking.current = true;
      setEventId(pending.eventId);
      setSelectedVendorForBooking(vendor);
      setBookingModalOpen(true);
    } catch { sessionStorage.removeItem("evntora_pending_booking"); }
  }, [loading, roles, vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.services.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const prices = [v.startingPrice ?? 0, ...v.packages.map((item) => item.price)].filter((price) => price > 0);
      const matchesCity = !selectedCity || v.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesCategory =
        !selectedCategory ||
        v.category.toLowerCase().includes(selectedCategory.toLowerCase().replace(/s$/, "")) ||
        selectedCategory.toLowerCase().includes(v.category.toLowerCase().replace(/s$/, ""));
      const matchesService = !selectedService || v.services.some((service) => service.toLowerCase() === selectedService.toLowerCase());
      const matchesPrice = (!minimumPrice && !maximumPrice) || prices.some((price) => (!minimumPrice || price >= Number(minimumPrice)) && (!maximumPrice || price <= Number(maximumPrice)));
      return matchesSearch && matchesCity && matchesCategory && matchesService && matchesPrice;
    });
  }, [vendors, searchQuery, selectedCity, selectedCategory, selectedService, minimumPrice, maximumPrice]);

  const cityOptions: SelectOption[] = [{ value: "", label: "All published cities" }, ...Array.from(new Set(vendors.map((vendor) => vendor.city).filter(Boolean))).sort().map((city) => ({ value: city, label: city }))];
  const categoryOptions: SelectOption[] = [{ value: "", label: "All published categories" }, ...Array.from(new Set([...managedCategories, ...vendors.map((vendor) => vendor.category).filter(Boolean)])).sort().map((category) => ({ value: category, label: category }))];
  const serviceOptions: SelectOption[] = [{ value: "", label: "All active services" }, ...Array.from(new Set(vendors.flatMap((vendor) => vendor.services).filter(Boolean))).sort().map((service) => ({ value: service, label: service }))];

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCity("");
    setSelectedCategory("");
    setSelectedService("");
    setMinimumPrice("");
    setMaximumPrice("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-12 space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* ── EDITORIAL HEADER ── */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="w-6 h-[1px] bg-[#B77A36]" />
            <span className="text-[11px] uppercase font-bold tracking-[0.25em] text-[#B77A36] dark:text-[#EAD2B0] font-sans">
              CURATED ARTISANS & ESTATES
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Find the right vendors for your event.
          </h1>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base max-w-2xl leading-relaxed">
            Discover exceptional venues, photographers, caterers, decorators, and event professionals selected to bring your celebration to life.
          </p>
          {roles.includes("customer") && <Link href={eventId ? `/dashboard/events/${encodeURIComponent(eventId)}` : returnTo} className="inline-flex items-center gap-2 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:underline"><ArrowRight className="w-3.5 h-3.5 rotate-180"/>Return to {eventId ? "event workspace" : "Customer Dashboard"}</Link>}
        </div>

        {/* ── SEARCH & FILTERS BAR ── */}
        <div className="p-6 rounded-3xl bg-[#FFFCF6]/90 dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] space-y-4 shadow-sm">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by vendor name, service (e.g. Sangeet Mandap, Live Dhol), or keyword..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FFF3E3]/60 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#9E897F] text-sm focus:outline-none focus:border-[#B77A36]"
            />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 items-end">
            <SearchableSelect label="Destination City" value={selectedCity} options={cityOptions} onChange={setSelectedCity} placeholder="All published cities" loading={loading} />
            <SearchableSelect label="Vendor Category" value={selectedCategory} options={categoryOptions} onChange={setSelectedCategory} placeholder="All published categories" loading={loading} />
            <SearchableSelect label="Active Service" value={selectedService} options={serviceOptions} onChange={setSelectedService} placeholder="All active services" loading={loading} />
            <label className="block text-[10px] uppercase font-bold tracking-wider text-[#7D6B63] dark:text-[#D4C3B7]">
              Minimum price (INR)
              <input
                type="number"
                min="0"
                value={minimumPrice}
                onChange={(event) => setMinimumPrice(event.target.value)}
                placeholder="Any"
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#FFF3E3]/60 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-xs text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
              />
            </label>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-[#7D6B63] dark:text-[#D4C3B7]">
              Maximum price (INR)
              <input
                type="number"
                min="0"
                value={maximumPrice}
                onChange={(event) => setMaximumPrice(event.target.value)}
                placeholder="Any"
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#FFF3E3]/60 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-xs text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36]"
              />
            </label>
          </div>

          {/* Active Filter Indicators */}
          <div className="flex items-center justify-between pt-2 border-t border-[#EAD2B0]/60 dark:border-[#4D3331] text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
            <div>
              Showing <span className="font-bold text-[#681B1D] dark:text-[#EAD2B0]">{filteredVendors.length}</span> curated vendor listings.
            </div>
            {(searchQuery || selectedCity || selectedCategory || selectedService || minimumPrice || maximumPrice) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* ── VENDORS GRID OR EMPTY STATE ── */}
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-[#7D6B63]">Loading curated artisans and estates…</p>
        ) : error ? (
          <p role="alert" className="py-12 text-center text-rose-600 text-sm">{error}</p>
        ) : filteredVendors.length === 0 ? (
          <div className="p-16 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-center space-y-4 max-w-lg mx-auto shadow-sm">
            <Filter className="w-8 h-8 text-[#B77A36] mx-auto" />
            <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">No Matching Vendors Found</h3>
            <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] leading-relaxed">
              Try adjusting your city filter or keywords to discover more of our nationwide artisan network.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] font-semibold text-xs cursor-pointer shadow-sm border border-[#B77A36]/40"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => {
              const isSaved = savedIds.includes(vendor.id);
              return (
                <div
                  key={vendor.id}
                  className="group rounded-3xl overflow-hidden bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
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
                      <div className="h-full w-full bg-[#EAD2B0]/30 dark:bg-[#1A1211]" aria-label="No portfolio image available" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/30" />

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

                    <button
                      type="button"
                      onClick={() => void toggleSaved(vendor.id)}
                      className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                        isSaved
                          ? "bg-[#681B1D] text-[#FFF3E3]"
                          : "bg-[#FFF3E3]/90 dark:bg-[#1A1211]/90 text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#FFF3E3]"
                      }`}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      {vendor.rating !== null && (
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                          <span className="font-bold text-[#B77A36]">{vendor.rating}</span>
                          {vendor.reviewCount !== null && <span className="text-white/80">({vendor.reviewCount})</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white">
                        <MapPin className="w-3.5 h-3.5 text-[#B77A36]" />
                        <span>{vendor.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] group-hover:text-[#681B1D] dark:group-hover:text-[#EAD2B0] transition-colors">
                        {vendor.name}
                      </h3>
                      <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] line-clamp-2 leading-relaxed">
                        {vendor.shortBio}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {vendor.services.slice(0, 3).map((svc, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-[#FAF3E8] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] dark:text-[#D4C3B7]"
                        >
                          {svc}
                        </span>
                      ))}
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
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs border border-[#B77A36]/40 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-[#EAD2B0]" />
                          <span>Book</span>
                        </button>
                        <Link
                          href={`/vendors/${vendor.id}${eventId || returnTo ? `?${new URLSearchParams({ ...(eventId ? { eventId } : {}), returnTo }).toString()}` : ""}`}
                          className="px-3 py-2 rounded-xl bg-[#FFFCF6] dark:bg-[#1A1211] hover:bg-[#EAD2B0]/30 text-[#30221D] dark:text-[#FFF3E3] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
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
        )}
      </main>

      {selectedVendorForBooking && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          vendor={selectedVendorForBooking}
          eventId={eventId}
        />
      )}

      <Footer />
    </div>
  );
}
