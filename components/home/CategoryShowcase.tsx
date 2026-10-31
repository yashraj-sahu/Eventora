import Link from "next/link";
import { ArrowRight, Users, Coins } from "lucide-react";
import { EVENT_CATEGORIES } from "@/data/categories";

export function CategoryShowcase() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-[#C6A66B] dark:text-[#D4B77D] font-bold">
            Celebration Categories
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            Curated For India&apos;s Most Sacred & Prestigious Milestones.
          </h2>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm sm:text-base leading-relaxed">
            Every celebration carries its own cultural soul, rituals, and logistical complexity. 
            Evntora adapts its intelligent blueprints to your exact occasion.
          </p>
        </div>

        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#173F35] dark:text-[#A9C7B2] hover:text-[#0F2B24] dark:hover:text-[#F4F0E7] transition-colors group shrink-0"
        >
          <span>Explore All 8 Categories</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EVENT_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="group relative rounded-3xl overflow-hidden bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#C6A66B] dark:hover:border-[#D4B77D] hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            {/* Visual Header with Real Image */}
            <div className="relative h-56 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-[#151B18]/90 backdrop-blur-md text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139] shadow-xs">
                  {category.tagline}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] group-hover:text-[#0F2B24] transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-[#77746D] dark:text-[#B5B5AA] line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E8E2D7] dark:border-[#344139] space-y-2 text-xs text-[#77746D] dark:text-[#B5B5AA]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2]" />
                    <span>Typical Budget:</span>
                  </span>
                  <span className="font-semibold text-[#252522] dark:text-[#F4F0E7]">{category.avgBudgetRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2]" />
                    <span>Guest Range:</span>
                  </span>
                  <span className="font-semibold text-[#252522] dark:text-[#F4F0E7]">{category.typicalGuestRange}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/planner?type=${encodeURIComponent(category.id)}`}
                  className="w-full py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] hover:bg-[#E7EFEA] dark:hover:bg-[#173F35]/40 text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <span>Plan This Event</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
