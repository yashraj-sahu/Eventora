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
  ChevronRight,
  Star,
} from "lucide-react";
import { CITIES } from "@/data/cities";
import { EVENT_CATEGORIES } from "@/data/categories";

export function Hero() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("Weddings");
  const [selectedCity, setSelectedCity] = useState("Udaipur");
  const [guestCount, setGuestCount] = useState("350");
  const [budgetINR, setBudgetINR] = useState("4500000");

  const handleQuickPlan = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/planner?type=${encodeURIComponent(selectedType)}&city=${encodeURIComponent(
        selectedCity
      )}&guests=${guestCount}&budget=${budgetINR}`
    );
  };

  return (
    <section className="relative overflow-hidden pt-10 pb-20 lg:pt-16 lg:pb-28">
      {/* Background Ambience & Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none -z-10">
        <div className="absolute top-10 left-1/4 w-[450px] h-[450px] bg-[#E7EFEA]/80 dark:bg-[#173F35]/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-[#F4EBD9]/60 dark:bg-[#C6A66B]/10 rounded-full blur-[130px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Header Tag */}
        <div className="text-center space-y-5 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 dark:border-[#A9C7B2]/30 text-xs font-semibold text-[#173F35] dark:text-[#A9C7B2] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>AI-Powered Luxury Event Architecture</span>
            <span className="text-[#77746D] dark:text-[#B5B5AA]">•</span>
            <span>Pan-India Coverage</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-[#173F35] dark:text-[#F4F0E7] leading-[1.12]">
            Every Celebration, <br />
            <span className="italic font-normal text-[#C6A66B] dark:text-[#D4B77D]">
              Beautifully Planned.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#77746D] dark:text-[#B5B5AA] max-w-2xl mx-auto font-sans leading-relaxed">
            From heritage palace weddings in Rajasthan to modern corporate galas in Bengaluru.
            Evntora pairs intelligent AI blueprints with India&apos;s verified top 1% event artisans.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link
              href="/planner"
              className="px-8 py-3.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition-all flex items-center gap-2 group cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C6A66B] group-hover:rotate-12 transition-transform" />
              <span>Start Planning My Event</span>
              <ArrowRight className="w-4 h-4 text-[#FAF8F3] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/vendors"
              className="px-7 py-3.5 rounded-xl bg-white dark:bg-[#232F28] hover:bg-[#F0EDE5] dark:hover:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Explore Verified Vendors</span>
              <ChevronRight className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA]" />
            </Link>
          </div>
        </div>

        {/* Interactive Event Planning Input Bar */}
        <div className="max-w-5xl mx-auto">
          <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-lg shadow-black/5 dark:shadow-black/20">
            <form onSubmit={handleQuickPlan} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Event Type */}
              <div className="p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#173F35] dark:hover:border-[#A9C7B2] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#77746D] dark:text-[#B5B5AA] mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Celebration</span>
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-transparent text-[#252522] dark:text-[#F4F0E7] font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City / Destination */}
              <div className="p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#173F35] dark:hover:border-[#A9C7B2] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#77746D] dark:text-[#B5B5AA] mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Destination</span>
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-transparent text-[#252522] dark:text-[#F4F0E7] font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  {CITIES.map((city) => (
                    <option key={city.id} value={city.name} className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">
                      {city.name} ({city.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Count */}
              <div className="p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#173F35] dark:hover:border-[#A9C7B2] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#77746D] dark:text-[#B5B5AA] mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Guests</span>
                </label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full bg-transparent text-[#252522] dark:text-[#F4F0E7] font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="50" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">Intimate (Up to 50)</option>
                  <option value="150" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">Classic (150 Guests)</option>
                  <option value="350" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">Grand (350 Guests)</option>
                  <option value="600" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">Royal (600+ Guests)</option>
                  <option value="1000" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">Monumental (1,000+)</option>
                </select>
              </div>

              {/* Budget Range (INR) */}
              <div className="p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#173F35] dark:hover:border-[#A9C7B2] transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#77746D] dark:text-[#B5B5AA] mb-1 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Target Budget</span>
                </label>
                <select
                  value={budgetINR}
                  onChange={(e) => setBudgetINR(e.target.value)}
                  className="w-full bg-transparent text-[#252522] dark:text-[#F4F0E7] font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="1000000" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">₹10 Lakhs</option>
                  <option value="2500000" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">₹25 Lakhs</option>
                  <option value="4500000" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">₹45 Lakhs</option>
                  <option value="8500000" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">₹85 Lakhs</option>
                  <option value="15000000" className="bg-white dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7]">₹1.5+ Crores</option>
                </select>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full h-full min-h-[50px] rounded-2xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-1.5 group cursor-pointer"
              >
                <span>Generate Plan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>

        {/* Social Proof & Metrics */}
        <div className="pt-6 border-t border-[#E8E2D7] dark:border-[#344139] max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">₹150+ Cr</div>
            <div className="text-xs text-[#77746D] dark:text-[#B5B5AA] mt-0.5">Event Budgets Managed</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">500+</div>
            <div className="text-xs text-[#77746D] dark:text-[#B5B5AA] mt-0.5">Luxury Celebrations</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">50+</div>
            <div className="text-xs text-[#77746D] dark:text-[#B5B5AA] mt-0.5">Indian Cities & Hubs</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-2xl sm:text-3xl font-serif font-bold text-[#C6A66B] dark:text-[#D4B77D]">
              <Star className="w-5 h-5 fill-[#C6A66B] dark:fill-[#D4B77D] text-[#C6A66B] dark:text-[#D4B77D] inline" />
              <span>4.95</span>
            </div>
            <div className="text-xs text-[#77746D] dark:text-[#B5B5AA] mt-0.5">Artisan Rating Score</div>
          </div>
        </div>
      </div>
    </section>
  );
}
