"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EVENT_CATEGORIES } from "@/data/categories";
import { Users, Coins, ArrowRight } from "lucide-react";
import Link from "next/link";

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

export default function ExploreEventsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-16 space-y-16">
        {/* Header with Signature Gold Flourish Motif */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex flex-col items-center justify-center">
            <RoyalFlourishMotif />
            <span className="text-[10px] sm:text-[11.5px] uppercase font-bold tracking-[0.28em] text-[#B77A36] dark:text-[#EAD2B0] mt-1 font-sans">
              CURATED CELEBRATION BLUEPRINTS
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Explore Celebrations Across India.
          </h1>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-base max-w-2xl mx-auto leading-relaxed">
            Discover tailored blueprints for royal weddings, corporate summits, milestone birthdays, and private parties. Each blueprint is pre-calibrated for Indian rituals and production logistics.
          </p>
        </section>

        {/* Categories Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {EVENT_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="group rounded-3xl overflow-hidden bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-64 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/30" />

                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF3E3]/95 dark:bg-[#1A1211]/95 backdrop-blur-md text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs">
                      {category.tagline}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] group-hover:text-[#681B1D] dark:group-hover:text-[#EAD2B0] transition-colors">
                      {category.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#59453E] dark:text-[#D4C3B7] leading-relaxed">
                      {category.description}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-[#EAD2B0]/80 dark:border-[#4D3331] text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[#B77A36]" />
                        <span>Recommended Budget:</span>
                      </span>
                      <span className="font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                        {category.avgBudgetRange}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#B77A36]" />
                        <span>Typical Guest Size:</span>
                      </span>
                      <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3]">
                        {category.typicalGuestRange}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/planner?type=${encodeURIComponent(category.name)}`}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] text-xs font-bold tracking-wide uppercase shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#B77A36]/40"
                    >
                      <span>Plan {category.name}</span>
                      <ArrowRight className="w-4 h-4 text-[#EAD2B0]" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
