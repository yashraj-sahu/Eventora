"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  MapPin,
  Users,
  Coins,
  ChevronRight,
  Star,
  CheckCircle2,
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
    <section className="relative overflow-hidden pt-8 pb-20 lg:pt-16 lg:pb-32">
      {/* Background Ambience & Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none">
        <div className="absolute top-12 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px]"></div>
        <div className="absolute top-24 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Header Tag */}
        <div className="text-center space-y-5 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-xs font-medium text-amber-300 shadow-xl shadow-black/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold">Next-Generation AI Event Orchestration</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">Nationwide across India</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white leading-[1.12]">
            Your Event. Your Vision. <br />
            <span className="royal-gradient-text">Perfectlys Orchestrated.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
            From regal palace weddings in Rajasthan to high-octane corporate galas in Bengaluru.
            Evntora pairs intelligent AI blueprints with India&apos;s verified top 1% event artisans.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link
              href="/planner"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-98 transition-all flex items-center gap-2 group"
            >
              <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
              <span>Start Planning My Event</span>
              <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/vendors"
              className="px-7 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <span>Explore Verified Vendors</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Interactive Event Planning Input Bar (Section 4 requirement) */}
        <div className="max-w-5xl mx-auto">
          <div className="p-3 sm:p-4 rounded-2xl glass-panel border border-amber-500/30 shadow-2xl shadow-black/80">
            <form onSubmit={handleQuickPlan} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Event Type */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>Celebration Type</span>
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
                >
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City / Destination */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Destination / City</span>
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
                >
                  {CITIES.map((city) => (
                    <option key={city.id} value={city.name} className="bg-slate-900 text-white">
                      {city.name} ({city.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Count */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>Expected Guests</span>
                </label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
                >
                  <option value="50" className="bg-slate-900 text-white">Intimate (Up to 50)</option>
                  <option value="150" className="bg-slate-900 text-white">Classic (150 Guests)</option>
                  <option value="350" className="bg-slate-900 text-white">Grand (350 Guests)</option>
                  <option value="600" className="bg-slate-900 text-white">Royal (600+ Guests)</option>
                  <option value="1000" className="bg-slate-900 text-white">Monumental (1,000+)</option>
                </select>
              </div>

              {/* Budget Range (INR) */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-colors">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>Budget Range (INR)</span>
                </label>
                <select
                  value={budgetINR}
                  onChange={(e) => setBudgetINR(e.target.value)}
                  className="w-full bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
                >
                  <option value="1000000" className="bg-slate-900 text-white">₹10 Lakhs</option>
                  <option value="2500000" className="bg-slate-900 text-white">₹25 Lakhs</option>
                  <option value="4500000" className="bg-slate-900 text-white">₹45 Lakhs</option>
                  <option value="8500000" className="bg-slate-900 text-white">₹85 Lakhs</option>
                  <option value="15000000" className="bg-slate-900 text-white">₹1.5+ Crores</option>
                </select>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full h-full min-h-[52px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 group cursor-pointer"
              >
                <span>Generate Blueprint</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>

        {/* Social Proof & Metrics */}
        <div className="pt-4 border-t border-white/5 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-white">₹150+ Cr</div>
            <div className="text-xs text-slate-400 mt-0.5">Event Budgets Managed</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-white">500+</div>
            <div className="text-xs text-slate-400 mt-0.5">Luxury Celebrations</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-white">50+</div>
            <div className="text-xs text-slate-400 mt-0.5">Indian Cities & Hubs</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-2xl sm:text-3xl font-serif font-bold text-amber-400">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 inline" />
              <span>4.95</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Client Satisfaction Score</div>
          </div>
        </div>
      </div>
    </section>
  );
}

