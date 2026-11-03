"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, MapPin, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { CITIES } from "@/data/cities";
import { EVENT_CATEGORIES, VENDOR_CATEGORIES } from "@/data/categories";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-[#FAF3E8] dark:bg-[#1A1211] border-t border-[#EAD2B0] dark:border-[#4D3331] pt-16 pb-12 text-[#7D6B63] dark:text-[#D4C3B7] text-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Tier: Brand & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-[#EAD2B0] dark:border-[#4D3331]">
          <div className="lg:col-span-6 space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#681B1D] to-[#4B1117] border border-[#B77A36]/60 flex items-center justify-center font-serif font-bold text-[#EAD2B0] text-xl shadow-sm">
                E
              </div>
              <div className="flex flex-col">
                <span className="font-serif tracking-widest text-2xl font-bold text-[#30221D] dark:text-[#FFF3E3]">
                  EVNTORA
                </span>
                <span className="text-[9px] tracking-wider uppercase text-[#B77A36] dark:text-[#EAD2B0] font-sans">
                  Luxury Event Planning
                </span>
              </div>
            </Link>
            <p className="text-[#30221D] dark:text-[#FFF3E3] max-w-md leading-relaxed text-sm font-medium">
              Every Celebration, Beautifully Planned.
            </p>
            <p className="text-[#7D6B63] dark:text-[#D4C3B7] max-w-md leading-relaxed text-xs">
              India&apos;s luxury AI-powered event planning and verified vendor marketplace platform.
              Crafting unforgettable royal destination weddings, cultural milestones, and bespoke celebrations.
            </p>
            <div className="flex flex-wrap items-center gap-6 text-xs text-[#7D6B63] dark:text-[#D4C3B7] pt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#B77A36]" />
                <span>Pan-India Coverage • 50+ Heritage Cities</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#B77A36]" />
                <span>100% Verified Top 1% Artisans</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-3">
              <div className="flex items-center gap-2 text-[#30221D] dark:text-[#FFF3E3] font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-[#B77A36]" />
                <span>Subscribe to Evntora Royal Edit</span>
              </div>
              <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
                Receive private access to India&apos;s latest heritage palace venues, bridal styling trends, and intelligent budget blueprints.
              </p>
              {subscribed ? (
                <div className="p-3 rounded-xl bg-[#EAD2B0]/40 dark:bg-[#681B1D]/40 border border-[#EAD2B0] text-[#681B1D] dark:text-[#EAD2B0] text-xs flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Welcome to the Royal Edit. Check your inbox for our 2026 Indian Wedding & Gala Blueprint.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-2.5 rounded-full bg-[#FFFCF6] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#9E897F] text-xs focus:outline-none focus:border-[#B77A36]"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm border border-[#B77A36]/40"
                  >
                    <span>Join</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#EAD2B0]" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Middle Tier: Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs">
          {/* Celebrations */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#B77A36] dark:text-[#EAD2B0] tracking-wider uppercase text-[11px]">
              Celebrations
            </h3>
            <ul className="space-y-2">
              {EVENT_CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/events?category=${encodeURIComponent(cat.id)}`} className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Vendors */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#B77A36] dark:text-[#EAD2B0] tracking-wider uppercase text-[11px]">
              Vendor Categories
            </h3>
            <ul className="space-y-2">
              {VENDOR_CATEGORIES.slice(0, 7).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/vendors?category=${encodeURIComponent(cat.id)}`} className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Destinations */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#B77A36] dark:text-[#EAD2B0] tracking-wider uppercase text-[11px]">
              Top Destinations
            </h3>
            <ul className="space-y-2">
              {CITIES.map((city) => (
                <li key={city.id}>
                  <Link href={`/vendors?city=${encodeURIComponent(city.name)}`} className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                    {city.name} ({city.venueCount} Estates)
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Portals */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#B77A36] dark:text-[#EAD2B0] tracking-wider uppercase text-[11px]">
              Portals & Tools
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/planner" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors flex items-center gap-1 font-medium">
                  <span>AI Event Planner</span>
                  <span className="text-[9px] px-1 bg-[#681B1D] text-[#FFF3E3] rounded-full font-bold">AI</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/budget" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  Budget Calculator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/guests" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  Guest & RSVP Manager
                </Link>
              </li>
              <li>
                <Link href="/vendor-portal" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors font-semibold text-[#681B1D] dark:text-[#EAD2B0]">
                  Vendor Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/signin" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  Admin Platform
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-3 col-span-2 md:col-span-1">
            <h3 className="font-bold text-[#B77A36] dark:text-[#EAD2B0] tracking-wider uppercase text-[11px]">
              Company & Offices
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  About Evntora
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  Pricing & Concierge Plans
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
                  Contact & Concierge Desk
                </Link>
              </li>
              <li className="pt-2 text-[#7D6B63] dark:text-[#D4C3B7]">
                BKC, Mumbai • Aerocity, New Delhi
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Tier: Copyright & Disclaimers */}
        <div className="pt-8 border-t border-[#EAD2B0] dark:border-[#4D3331] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} EVNTORA Technologies Pvt. Ltd. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors">
              Security
            </Link>
            <span className="text-[#B77A36] font-medium">Made with pride in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
