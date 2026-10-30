import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Users, Coins } from "lucide-react";
import { EVENT_CATEGORIES } from "@/data/categories";

export function CategoryShowcase() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
            Celebration Categories
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Curated For India&apos;s Most Sacred & Prestigious Milestones.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every celebration carries its own cultural soul, rituals, and logistical complexity. 
            Evntora adapts its intelligent blueprints to your exact occasion.
          </p>
        </div>

        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors group shrink-0"
        >
          <span>Explore All 8 Categories</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EVENT_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="group relative rounded-2xl overflow-hidden glass-card border border-white/10 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Visual Header with Real Image */}
            <div className="relative h-56 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/40 to-transparent"></div>

              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 backdrop-blur-md text-amber-300 border border-amber-500/30">
                  {category.tagline}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Typical Budget:</span>
                  </span>
                  <span className="font-semibold text-slate-200">{category.avgBudgetRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Guest Range:</span>
                  </span>
                  <span className="font-semibold text-slate-200">{category.typicalGuestRange}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/planner?type=${encodeURIComponent(category.id)}`}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2"
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

