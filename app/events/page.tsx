import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EVENT_CATEGORIES } from "@/data/categories";
import { Sparkles, Users, Coins, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ExploreEventsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-16 space-y-16">
        {/* Header */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>Curated Celebration Blueprints</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            Explore Celebrations Across India.
          </h1>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-base max-w-2xl mx-auto leading-relaxed">
            Discover tailored blueprints for royal weddings, corporate summits, milestone birthdays, and private parties. Each blueprint is pre-calibrated for Indian rituals and production logistics.
          </p>
        </section>

        {/* Categories Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {EVENT_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="group rounded-3xl overflow-hidden bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#C6A66B] dark:hover:border-[#D4B77D] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-64 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>

                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-[#151B18]/90 backdrop-blur-md text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139] shadow-xs">
                      {category.tagline}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] group-hover:text-[#0F2B24] transition-colors">
                      {category.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#77746D] dark:text-[#B5B5AA] leading-relaxed">
                      {category.description}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-[#E8E2D7] dark:border-[#344139] text-xs text-[#77746D] dark:text-[#B5B5AA]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2]" />
                        <span>Recommended Budget:</span>
                      </span>
                      <span className="font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">{category.avgBudgetRange}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2]" />
                        <span>Typical Guest Size:</span>
                      </span>
                      <span className="font-semibold text-[#252522] dark:text-[#F4F0E7]">{category.typicalGuestRange}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/planner?type=${encodeURIComponent(category.id)}`}
                      className="w-full py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] text-xs font-bold tracking-wide uppercase shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Plan {category.name}</span>
                      <ArrowRight className="w-4 h-4" />
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
