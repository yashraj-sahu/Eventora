"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  Calendar,
  MapPin,
  Users,
  Coins,
} from "lucide-react";
import { CITIES } from "@/data/cities";
import { EVENT_CATEGORIES } from "@/data/categories";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";

/* Traditional Indian Heritage SVG Motifs */
function RoyalLotusIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12 3C12 7.5 9 11.5 6 13C6 9 8 5 12 3Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 3C12 7.5 15 11.5 18 13C18 9 16 5 12 3Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 4C10.5 8 10 12 12 16C14 12 13.5 8 12 4Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M3 15C5 13 8 13 12 16C16 13 19 13 21 15C19 18 15 19 12 19C9 19 5 18 3 15Z" />
      <path d="M8 19C10 20.5 14 20.5 16 19" />
    </svg>
  );
}

function RoyalHaveliIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 20V9L12 4L20 9V20" />
      <path d="M2 20H22" />
      <path d="M9 20V14C9 12.3431 10.3431 11 12 11C13.6569 11 15 12.3431 15 14V20" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 4V2" />
      <path d="M11 2H13" />
      <path d="M6 10H7" />
      <path d="M17 10H18" />
    </svg>
  );
}

function RoyalScalesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12 3V20" />
      <path d="M8 21H16" />
      <path d="M4 7L12 5L20 7" />
      <path d="M4 7L2 14C2 15.5 3.5 16 4 16C4.5 16 6 15.5 6 14L4 7Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M20 7L18 14C18 15.5 19.5 16 20 16C20.5 16 22 15.5 22 14L20 7Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function RoyalKnotIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12Z" />
      <path d="M12 8C7.5 8 4 9.5 4 12C4 14.5 7.5 16 12 16" />
      <path d="M12 8C16.5 8 20 9.5 20 12C20 14.5 16.5 16 12 16" />
    </svg>
  );
}

function RoyalFlourishMotif() {
  return (
    <div className="flex items-center justify-center gap-2.5 my-1">
      <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent via-[#B77A36] to-transparent" />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#B77A36]">
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

export function Hero() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("Weddings & Royal Celebrations");
  const [selectedCity, setSelectedCity] = useState("Udaipur");
  const [guestCount, setGuestCount] = useState("350");
  const [budgetINR, setBudgetINR] = useState("4500000");

  const categoryOptions: SelectOption[] = EVENT_CATEGORIES.map((category) => ({
    value: category.name,
    label: category.name,
  }));
  const cityOptions: SelectOption[] = CITIES.map((city) => ({
    value: city.name,
    label: city.name,
    description: city.state,
  }));

  const handleQuickPlan = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/planner?type=${encodeURIComponent(selectedType)}&city=${encodeURIComponent(
        selectedCity
      )}&guests=${guestCount}&budget=${budgetINR}`
    );
  };

  return (
    <section className="relative overflow-hidden w-full min-h-[92vh] flex flex-col justify-between pt-6 pb-8 lg:pt-10 lg:pb-12">
      {/* ── BACKGROUND PHOTOGRAPHIC HERITAGE SCENE ── */}
      <div className="absolute inset-0 -z-20 w-full h-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-palace-heritage.jpg"
          alt="Royal Udaipur Palace lake terrace at sunset"
          className="w-full h-full object-cover object-center filter brightness-[0.98] contrast-[1.02]"
        />

        {/* Soft, delicate warm overlay preserving text readability while letting the architectural palace shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF3E3]/40 via-[#FFF3E3]/20 to-[#FFF3E3]/95 dark:from-[#1A1211]/55 dark:via-[#1A1211]/45 dark:to-[#1A1211]/95" />
        
        {/* Subtle royal vignette */}
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#681B1D]/5 to-[#4B1117]/25 pointer-events-none" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-center space-y-10 my-auto">
        {/* ── CENTER HEADLINE & BRANDING ── */}
        <div className="text-center space-y-4 max-w-4xl mx-auto pt-2">
          {/* Eyebrow Flourish Badge */}
          <div className="inline-flex flex-col items-center justify-center">
            <RoyalFlourishMotif />
            <span className="text-[10px] sm:text-[11.5px] uppercase font-bold tracking-[0.28em] text-[#B77A36] dark:text-[#EAD2B0] mt-1 font-sans">
              AI-POWERED EVENT PLANNING
            </span>
          </div>

          {/* Main Heritage Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-[#30221D] dark:text-[#FFF3E3] leading-[1.12]">
            Plan Celebrations Rooted <br />
            <span className="relative inline-block font-serif italic font-normal text-[#681B1D] dark:text-[#EAD2B0] mt-1">
              in Tradition
              {/* Calligraphy underline swash */}
              <svg
                className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3 sm:h-4 text-[#B77A36]/80 dark:text-[#EAD2B0]/80 overflow-visible"
                viewBox="0 0 260 18"
                fill="none"
              >
                <path
                  d="M2 12C60 2 180 2 258 14C190 7 80 8 2 12Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </h1>

          {/* Elegant Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-[#59453E] dark:text-[#D4C3B7] max-w-2xl mx-auto font-sans leading-relaxed pt-2">
            From royal weddings to elegant cultural gatherings, EVNTORA blends traditional
            charm with smart planning tools and a trusted vendor network.
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <Link
              href="/planner"
              className="px-6 sm:px-8 py-3.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-semibold text-xs sm:text-sm tracking-wide shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 border border-[#B77A36]/50 group cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#EAD2B0] group-hover:rotate-6 transition-transform" />
              <span>Start Planning My Event</span>
              <ArrowRight className="w-4 h-4 text-[#EAD2B0] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/vendors"
              className="px-6 sm:px-7 py-3.5 rounded-full bg-[#FFF3E3]/95 dark:bg-[#2E1F1E]/95 hover:bg-[#FAF3E8] dark:hover:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-semibold text-xs sm:text-sm transition-all flex items-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer"
            >
              <RoyalHaveliIcon className="w-4 h-4 text-[#B77A36]" />
              <span>Explore Verified Vendors</span>
            </Link>
          </div>
        </div>

        {/* ── THE SIGNATURE FLOATING HERITAGE EVENT PLANNER BAR ── */}
        <div className="max-w-5xl mx-auto w-full pt-2">
          {/* Ornate Rajasthani Bracket Architecture Silhouette */}
          <div className="relative p-2.5 sm:p-3 rounded-3xl sm:rounded-[32px] bg-[#FFF3E3]/95 dark:bg-[#2E1F1E]/95 backdrop-blur-md border border-[#EAD2B0] dark:border-[#4D3331] shadow-[0_16px_40px_-8px_rgba(75,17,23,0.15),0_2px_10px_rgba(183,122,54,0.08)]">
            <form onSubmit={handleQuickPlan} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              
              {/* 1. Celebration Selector */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#1A1211]/90 border border-[#EAD2B0]/80 dark:border-[#4D3331] hover:border-[#B77A36] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] mb-1 flex items-center gap-1.5">
                  <RoyalLotusIcon className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#EAD2B0]" />
                  <span>Celebration</span>
                </label>
                <SearchableSelect
                  label="Celebration"
                  labelClassName="sr-only"
                  value={selectedType}
                  options={categoryOptions}
                  onChange={setSelectedType}
                  allowCustom
                  customLabel="Use category"
                />
              </div>

              {/* 2. Destination Selector */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#1A1211]/90 border border-[#EAD2B0]/80 dark:border-[#4D3331] hover:border-[#B77A36] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#EAD2B0]" />
                  <span>Destination</span>
                </label>
                <SearchableSelect
                  label="Destination"
                  labelClassName="sr-only"
                  value={selectedCity}
                  options={cityOptions}
                  onChange={setSelectedCity}
                  allowCustom
                  customLabel="Use city"
                />
              </div>

              {/* 3. Guests Selector */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#1A1211]/90 border border-[#EAD2B0]/80 dark:border-[#4D3331] hover:border-[#B77A36] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#EAD2B0]" />
                  <span>Guests</span>
                </label>
                <SearchableSelect
                  label="Guest count"
                  labelClassName="sr-only"
                  value={guestCount}
                  options={[
                    { value: "50", label: "Intimate (50 guests)" },
                    { value: "150", label: "Classic (150 guests)" },
                    { value: "350", label: "Grand (350 guests)" },
                    { value: "600", label: "Royal (600+ guests)" },
                    { value: "1000", label: "Monumental (1,000+)" },
                  ]}
                  onChange={setGuestCount}
                />
              </div>

              {/* 4. Target Budget Selector */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#1A1211]/90 border border-[#EAD2B0]/80 dark:border-[#4D3331] hover:border-[#B77A36] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] mb-1 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#EAD2B0]" />
                  <span>Target Budget</span>
                </label>
                <SearchableSelect
                  label="Target budget"
                  labelClassName="sr-only"
                  value={budgetINR}
                  options={[
                    { value: "1000000", label: "₹10 Lakhs" },
                    { value: "2500000", label: "₹25 Lakhs" },
                    { value: "4500000", label: "₹45 Lakhs" },
                    { value: "8500000", label: "₹85 Lakhs" },
                    { value: "15000000", label: "₹1.5+ Crores" },
                  ]}
                  onChange={setBudgetINR}
                />
              </div>

              {/* 5. Generate Plan CTA Button */}
              <button
                type="submit"
                className="w-full h-full min-h-[48px] rounded-2xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border border-[#B77A36]/60 group cursor-pointer"
              >
                <span>Generate Plan</span>
                <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0] group-hover:rotate-12 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── BOTTOM HERITAGE VALUE PILLARS & TRUST BAR ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-4 border-t border-b border-[#EAD2B0]/60 dark:border-[#4D3331]/80 bg-[#FFF3E3]/60 dark:bg-[#1A1211]/60 backdrop-blur-sm rounded-2xl px-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalLotusIcon className="w-5 h-5 text-[#681B1D] dark:text-[#EAD2B0]" />
            </div>
            <div>
              <p className="text-xs sm:text-[13px] font-semibold text-[#30221D] dark:text-[#FFF3E3] leading-snug">
                AI-Assisted
              </p>
              <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-tight">
                Event Planning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalHaveliIcon className="w-5 h-5 text-[#681B1D] dark:text-[#EAD2B0]" />
            </div>
            <div>
              <p className="text-xs sm:text-[13px] font-semibold text-[#30221D] dark:text-[#FFF3E3] leading-snug">
                Curated
              </p>
              <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-tight">
                Verified Vendors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalScalesIcon className="w-5 h-5 text-[#681B1D] dark:text-[#EAD2B0]" />
            </div>
            <div>
              <p className="text-xs sm:text-[13px] font-semibold text-[#30221D] dark:text-[#FFF3E3] leading-snug">
                Intelligent Budget
              </p>
              <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-tight">
                Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalKnotIcon className="w-5 h-5 text-[#681B1D] dark:text-[#EAD2B0]" />
            </div>
            <div>
              <p className="text-xs sm:text-[13px] font-semibold text-[#30221D] dark:text-[#FFF3E3] leading-snug">
                End-to-End
              </p>
              <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-tight">
                Event Support
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
