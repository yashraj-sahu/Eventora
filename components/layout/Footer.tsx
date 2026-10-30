"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, MapPin, Mail, Phone, Check, ArrowRight, ShieldCheck, Heart } from "lucide-react";
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
    <footer className="w-full bg-[#050608] border-t border-white/10 pt-16 pb-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Tier: Brand & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-white/5">
          <div className="lg:col-span-6 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 flex items-center justify-center font-serif font-black text-slate-950 text-lg shadow-lg shadow-amber-500/20">
                E
              </div>
              <span className="font-serif tracking-widest text-2xl font-bold text-white">
                EVNTORA
              </span>
            </Link>
            <p className="text-slate-400 max-w-md leading-relaxed text-sm">
              India&apos;s luxury AI-powered event planning and verified vendor marketplace platform.
              Crafting unforgettable royal destination weddings, corporate summits, and bespoke private galas.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-400 pt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Pan-India Coverage • 50+ Cities</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Verified Top 1% Vendors</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-white font-medium">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Subscribe to Evntora Royal Edit</span>
              </div>
              <p className="text-xs text-slate-400">
                Receive private access to India&apos;s latest palace venues, bridal styling trends, and intelligent budget allocation blueprints.
              </p>
              {subscribed ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Welcome to the Evntora Edit. Check your inbox for our 2026 Indian Wedding & Gala Blueprint.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
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
            <h3 className="font-semibold text-white tracking-wider uppercase text-[11px]">
              Celebrations
            </h3>
            <ul className="space-y-2">
              {EVENT_CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/events?category=${encodeURIComponent(cat.id)}`} className="hover:text-amber-300 transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Vendors */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white tracking-wider uppercase text-[11px]">
              Vendor Categories
            </h3>
            <ul className="space-y-2">
              {VENDOR_CATEGORIES.slice(0, 7).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/vendors?category=${encodeURIComponent(cat.id)}`} className="hover:text-amber-300 transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Destinations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white tracking-wider uppercase text-[11px]">
              Top Destinations
            </h3>
            <ul className="space-y-2">
              {CITIES.map((city) => (
                <li key={city.id}>
                  <Link href={`/vendors?city=${encodeURIComponent(city.name)}`} className="hover:text-amber-300 transition-colors">
                    {city.name} ({city.venueCount} Venues)
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Portals */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white tracking-wider uppercase text-[11px]">
              Portals & Tools
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/planner" className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>AI Event Planner</span>
                  <span className="text-[9px] px-1 bg-amber-500/20 text-amber-400 rounded">AI</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-amber-300 transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/budget" className="hover:text-amber-300 transition-colors">
                  Budget Calculator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/guests" className="hover:text-amber-300 transition-colors">
                  Guest & RSVP Manager
                </Link>
              </li>
              <li>
                <Link href="/vendor-portal" className="hover:text-amber-300 transition-colors text-amber-400/90 font-medium">
                  Vendor Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-amber-300 transition-colors text-slate-500 hover:text-slate-300">
                  Admin Platform
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-3 col-span-2 md:col-span-1">
            <h3 className="font-semibold text-white tracking-wider uppercase text-[11px]">
              Company & Offices
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-amber-300 transition-colors">
                  About Evntora
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-amber-300 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-amber-300 transition-colors">
                  Pricing & Concierge Plans
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-amber-300 transition-colors">
                  Contact & Concierge Desk
                </Link>
              </li>
              <li className="pt-2 text-slate-500">
                BKC, Mumbai • Aerocity, New Delhi
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Tier: Copyright & Disclaimers */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} EVNTORA Technologies Pvt. Ltd. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="hover:text-slate-300 transition-colors">
              Security
            </Link>
            <span className="text-amber-400/80">Made with passion in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

