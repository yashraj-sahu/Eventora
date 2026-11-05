import Link from "next/link";
import { ArrowRight, Users, Coins } from "lucide-react";
import { EVENT_CATEGORIES } from "@/data/categories";
import { TiltCard } from "@/components/motion/TiltCard";

export function CategoryShowcase() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
            <span className="w-6 h-[1px] bg-[#B77A36]" />
            <span>Celebration Categories</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Curated For India&apos;s Most Sacred & Prestigious Milestones.
          </h2>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
            Every celebration carries its own cultural soul, rituals, and logistical complexity. 
            Evntora adapts its intelligent blueprints to your exact occasion.
          </p>
        </div>

        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:text-[#4B1117] dark:hover:text-[#FFF3E3] transition-colors group shrink-0"
        >
          <span>Explore All 8 Categories</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EVENT_CATEGORIES.map((category) => (
          <TiltCard
            key={category.id}
            className="group relative rounded-3xl overflow-hidden bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            {/* Visual Header with Real Image */}
            <div className="relative h-56 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent"></div>

              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FFF3E3]/95 dark:bg-[#1A1211]/95 backdrop-blur-md text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs">
                  {category.tagline}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] group-hover:text-[#681B1D] dark:group-hover:text-[#EAD2B0] transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#EAD2B0]/80 dark:border-[#4D3331] space-y-2 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>Typical Budget:</span>
                  </span>
                  <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3]">{category.avgBudgetRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>Guest Range:</span>
                  </span>
                  <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3]">{category.typicalGuestRange}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/planner?type=${encodeURIComponent(category.id)}`}
                  className="w-full py-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#1A1211] hover:bg-[#EAD2B0]/40 dark:hover:bg-[#3D2624] text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <span>Plan This Event</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}
