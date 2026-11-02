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
    <footer className="w-full bg-[#F0EDE5] dark:bg-[#151B18] border-t border-[#E8E2D7] dark:border-[#344139] pt-16 pb-12 text-[#77746D] dark:text-[#B5B5AA] text-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Tier: Brand & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-[#E8E2D7] dark:border-[#344139]">
          <div className="lg:col-span-6 space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-[#173F35] flex items-center justify-center font-serif font-bold text-[#C6A66B] text-xl shadow-sm">
                E
              </div>
              <span className="font-serif tracking-widest text-2xl font-bold text-[#173F35] dark:text-[#A9C7B2]">
                EVNTORA
              </span>
            </Link>
            <p className="text-[#252522] dark:text-[#F4F0E7] max-w-md leading-relaxed text-sm font-medium">
              Every Celebration, Beautifully Planned.
            </p>
            <p className="text-[#77746D] dark:text-[#B5B5AA] max-w-md leading-relaxed text-xs">
              India&apos;s luxury AI-powered event planning and verified vendor marketplace platform.
              Crafting unforgettable royal destination weddings, corporate summits, and bespoke private galas.
            </p>
            <div className="flex flex-wrap items-center gap-6 text-xs text-[#77746D] dark:text-[#B5B5AA] pt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
                <span>Pan-India Coverage • 50+ Cities</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]" />
                <span>100% Verified Top 1% Vendors</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#252522] dark:text-[#F4F0E7] font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-[#C6A66B]" />
                <span>Subscribe to Evntora Luxury Edit</span>
              </div>
              <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
                Receive private access to India&apos;s latest palace venues, bridal styling trends, and intelligent budget blueprints.
              </p>
              {subscribed ? (
                <div className="p-3 rounded-xl bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/30 text-[#173F35] dark:text-[#A9C7B2] text-xs flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Welcome to the Evntora Edit. Check your inbox for our 2026 Indian Wedding & Gala Blueprint.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D] dark:placeholder-[#898D84] text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <span>Join</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
            <h3 className="font-bold text-[#173F35] dark:text-[#A9C7B2] tracking-wider uppercase text-[11px]">
              Celebrations
            </h3>
            <ul className="space-y-2">
              {EVENT_CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/events?category=${encodeURIComponent(cat.id)}`} className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Vendors */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#173F35] dark:text-[#A9C7B2] tracking-wider uppercase text-[11px]">
              Vendor Categories
            </h3>
            <ul className="space-y-2">
              {VENDOR_CATEGORIES.slice(0, 7).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/vendors?category=${encodeURIComponent(cat.id)}`} className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Destinations */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#173F35] dark:text-[#A9C7B2] tracking-wider uppercase text-[11px]">
              Top Destinations
            </h3>
            <ul className="space-y-2">
              {CITIES.map((city) => (
                <li key={city.id}>
                  <Link href={`/vendors?city=${encodeURIComponent(city.name)}`} className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                    {city.name} ({city.venueCount} Venues)
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Portals */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#173F35] dark:text-[#A9C7B2] tracking-wider uppercase text-[11px]">
              Portals & Tools
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/planner" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors flex items-center gap-1">
                  <span>AI Event Planner</span>
                  <span className="text-[9px] px-1 bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] rounded font-bold">AI</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/budget" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  Budget Calculator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/guests" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  Guest & RSVP Manager
                </Link>
              </li>
              <li>
                <Link href="/vendor-portal" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors font-semibold text-[#173F35] dark:text-[#A9C7B2]">
                  Vendor Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/signin" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  Admin Platform
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-3 col-span-2 md:col-span-1">
            <h3 className="font-bold text-[#173F35] dark:text-[#A9C7B2] tracking-wider uppercase text-[11px]">
              Company & Offices
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  About Evntora
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  Pricing & Concierge Plans
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
                  Contact & Concierge Desk
                </Link>
              </li>
              <li className="pt-2 text-[#77746D] dark:text-[#B5B5AA]">
                BKC, Mumbai • Aerocity, New Delhi
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Tier: Copyright & Disclaimers */}
        <div className="pt-8 border-t border-[#E8E2D7] dark:border-[#344139] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#77746D] dark:text-[#B5B5AA]">
          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} EVNTORA Technologies Pvt. Ltd. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="hover:text-[#173F35] dark:hover:text-[#A9C7B2] transition-colors">
              Security
            </Link>
            <span className="text-[#C6A66B] font-medium">Made with pride in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
