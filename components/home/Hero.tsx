"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Coins,
} from "lucide-react";
import { CITIES } from "@/data/cities";
import { EVENT_CATEGORIES } from "@/data/categories";
import { EditableCombobox, type ComboboxOption } from "@/components/ui/EditableCombobox";

/* Traditional Indian Heritage SVG Motifs */
function RoyalLotusIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function RoyalHaveliIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function RoyalScalesIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function RoyalKnotIcon({ className = "w-4 h-4" }: { className?: string }) {
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
    <div className="flex items-center justify-center gap-2.5 my-0.5">
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

export function Hero() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budgetINR, setBudgetINR] = useState("");
  const [quickPlanError, setQuickPlanError] = useState("");

  const categoryOptions: ComboboxOption[] = EVENT_CATEGORIES.map((category) => ({
    value: category.name,
    label: category.name,
    description: category.tagline,
  }));

  const cityOptions: ComboboxOption[] = CITIES.map((city) => ({
    value: city.name,
    label: city.name,
    description: city.state,
  }));

  const guestOptions: ComboboxOption[] = [
    { value: "50", label: "Intimate (50 guests)", description: "Close family & friends" },
    { value: "150", label: "Classic (150 guests)", description: "Standard celebration" },
    { value: "350", label: "Grand (350 guests)", description: "Multi-ceremony wedding" },
    { value: "600", label: "Royal (600+ guests)", description: "Extravagant gala" },
    { value: "1000", label: "Monumental (1,000+)", description: "Palace spectacle" },
  ];

  const budgetOptions: ComboboxOption[] = [
    { value: "1000000", label: "₹10 Lakhs", description: "Boutique private event" },
    { value: "2500000", label: "₹25 Lakhs", description: "Premium wedding celebration" },
    { value: "4500000", label: "₹45 Lakhs", description: "Luxury destination wedding" },
    { value: "8500000", label: "₹85 Lakhs", description: "Grand heritage palace spectacle" },
    { value: "15000000", label: "₹1.5+ Crores", description: "Bespoke royal extravaganza" },
  ];

  const handleQuickPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBudget = budgetINR.replace(/[^\d]/g, "");
    const cleanGuests = guestCount.replace(/[^\d]/g, "");
    const guestsNumber = Number(cleanGuests);
    const budgetNumber = Number(cleanBudget);
    if (!selectedType.trim() || selectedType.trim().length < 2 || selectedType.length > 80) {
      setQuickPlanError("Enter a celebration type between 2 and 80 characters.");
      return;
    }
    if (!selectedCity.trim() || selectedCity.trim().length < 2 || selectedCity.length > 100) {
      setQuickPlanError("Enter a destination between 2 and 100 characters.");
      return;
    }
    if (!Number.isInteger(guestsNumber) || guestsNumber < 1 || guestsNumber > 5000) {
      setQuickPlanError("Enter a guest count from 1 to 5,000.");
      return;
    }
    if (!Number.isSafeInteger(budgetNumber) || budgetNumber < 500 || budgetNumber > 100000000) {
      setQuickPlanError("Enter a budget from ₹500 to ₹10,00,00,000.");
      return;
    }
    setQuickPlanError("");

    router.push(
      `/planner?type=${encodeURIComponent(selectedType)}&city=${encodeURIComponent(
        selectedCity
      )}&guests=${encodeURIComponent(cleanGuests)}&budget=${encodeURIComponent(cleanBudget)}`
    );
  };

  return (
    <section className="relative isolate w-full min-h-[72vh] lg:min-h-[76vh] flex flex-col justify-between pt-2 pb-6 lg:pt-4 lg:pb-8 overflow-visible">
      {/* ── BACKGROUND PHOTOGRAPHIC HERITAGE SCENE WITH NATURAL MULTI-LAYER BLEND ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-palace-heritage.jpg"
          alt="Royal Udaipur Palace lake terrace at sunset"
          className="w-full h-full object-cover object-center filter brightness-[1.0] contrast-[1.02]"
        />

        {/* Layer 1: Seamless top transition from navbar warm ivory background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF3E3] via-transparent to-transparent opacity-90 h-32" />

        {/* Layer 2: Focused radial illumination directly behind heading & description for 100% text contrast */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,243,227,0.68)_0%,_rgba(255,243,227,0.36)_48%,_rgba(255,243,227,0.12)_72%,_transparent_100%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(26,18,17,0.76)_0%,_rgba(26,18,17,0.48)_48%,_rgba(26,18,17,0.22)_72%,_transparent_100%)]" />

        {/* Layer 3: Warm golden hour aesthetic tint preserving palace details */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF3E3]/35 via-transparent to-[#FFF3E3] dark:from-[#1A1211]/45 dark:via-transparent dark:to-[#1A1211]" />

        {/* Layer 4: Flawless bottom blend into website cream background */}
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#FFF3E3] via-[#FFF3E3]/85 to-transparent dark:from-[#1A1211] dark:via-[#1A1211]/85" />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-center space-y-6 lg:space-y-8 my-auto">
        {/* ── CENTER HEADLINE & BRANDING ── */}
        <div className="text-center space-y-3 max-w-4xl mx-auto pt-1">
          {/* Eyebrow Flourish Badge */}
          <div className="inline-flex flex-col items-center justify-center">
            <RoyalFlourishMotif />
            <span className="text-[10px] sm:text-[11.5px] uppercase font-bold tracking-[0.28em] text-[#B77A36] dark:text-[#EAD2B0] mt-0.5 font-sans">
              AI-POWERED EVENT PLANNING
            </span>
          </div>

          {/* Main Heritage Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-[#2A1810] dark:text-[#FFF3E3] leading-[1.12]">
            Plan Celebrations Rooted <br />
            <span className="relative inline-block font-serif italic font-normal text-[#681B1D] dark:text-[#EAD2B0] mt-1">
              in Tradition
              {/* Calligraphy underline swash */}
              <svg
                className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3 sm:h-4 text-[#B77A36] dark:text-[#EAD2B0] overflow-visible"
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

          {/* High-Contrast Description */}
          <p className="text-sm sm:text-base lg:text-[17px] text-[#3D2C26] dark:text-[#EAD2B0] max-w-2xl mx-auto font-sans font-medium leading-relaxed pt-1">
            From royal weddings to elegant cultural gatherings, EVNTORA blends traditional
            charm with smart planning tools and a trusted vendor network.
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/planner"
              className="px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-semibold text-xs sm:text-sm tracking-wide shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border border-[#B77A36]/60 group cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#EAD2B0] group-hover:rotate-6 transition-transform" />
              <span>Start Planning My Event</span>
              <ArrowRight className="w-4 h-4 text-[#EAD2B0] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/vendors"
              className="px-6 sm:px-7 py-3 rounded-full bg-[#FFF3E3]/95 dark:bg-[#2E1F1E]/95 hover:bg-[#FAF3E8] dark:hover:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
            >
              <RoyalHaveliIcon className="w-4 h-4 text-[#B77A36]" />
              <span>Explore Verified Vendors</span>
            </Link>
          </div>
        </div>

        {/* ── SIGNATURE FLOATING QUICK PLANNER BAR WITH GENUINE EDITABLE INPUTS ── */}
        <div className="max-w-[62rem] mx-auto w-full pt-1 relative z-30">
          <div className="relative px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-3xl bg-[#FFF3E3]/95 dark:bg-[#2E1F1E]/95 backdrop-blur-md border border-[#EAD2B0] dark:border-[#4D3331] shadow-[0_16px_40px_-8px_rgba(75,17,23,0.18),0_2px_10px_rgba(183,122,54,0.10)]">
            <form
              onSubmit={handleQuickPlan}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center"
            >
              {/* 1. Celebration Editable Combobox */}
              <div className="lg:col-span-3">
                <EditableCombobox
                  label="Celebration"
                  icon={<RoyalLotusIcon className="w-3.5 h-3.5" />}
                  value={selectedType}
                  onChange={setSelectedType}
                  options={categoryOptions}
                  placeholder="e.g. Royal Wedding"
                />
              </div>

              {/* 2. Destination Editable Combobox */}
              <div className="lg:col-span-3">
                <EditableCombobox
                  label="Destination"
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  value={selectedCity}
                  onChange={setSelectedCity}
                  options={cityOptions}
                  placeholder="e.g. Udaipur, Lake Palace"
                />
              </div>

              {/* 3. Guests Editable Combobox */}
              <div className="lg:col-span-2">
                <EditableCombobox
                  label="Guests"
                  icon={<Users className="w-3.5 h-3.5" />}
                  value={guestCount}
                  onChange={setGuestCount}
                  options={guestOptions}
                  placeholder="e.g. 275"
                />
              </div>

              {/* 4. Target Budget Editable Combobox */}
              <div className="lg:col-span-2">
                <EditableCombobox
                  label="Target Budget"
                  icon={<Coins className="w-3.5 h-3.5" />}
                  value={budgetINR}
                  onChange={setBudgetINR}
                  options={budgetOptions}
                  placeholder="e.g. ₹18,75,000"
                  formatAsCurrency
                />
              </div>

              {/* 5. Generate Plan CTA Button */}
              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="w-full h-[58px] rounded-2xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border border-[#B77A36]/60 group cursor-pointer"
                >
                  <span>Generate Plan</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0] group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </form>
            {quickPlanError && (
              <p role="alert" className="mt-2 px-2 text-xs font-medium text-[#681B1D] dark:text-[#EAD2B0]">
                {quickPlanError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM HERITAGE VALUE PILLARS & TRUST BAR (LOWER Z-INDEX Z-10) ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-3.5 border-t border-b border-[#EAD2B0]/70 dark:border-[#4D3331]/80 bg-[#FFF3E3]/70 dark:bg-[#1A1211]/70 backdrop-blur-sm rounded-2xl px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalLotusIcon className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
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
            <div className="w-8 h-8 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalHaveliIcon className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
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
            <div className="w-8 h-8 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalScalesIcon className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
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
            <div className="w-8 h-8 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center shrink-0">
              <RoyalKnotIcon className="w-4 h-4 text-[#681B1D] dark:text-[#EAD2B0]" />
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
