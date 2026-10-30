import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EVENT_CATEGORIES } from "@/data/categories";
import { Sparkles, Users, Coins, ArrowRight, Calendar, Heart, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ExploreEventsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">      <Navbar />

      <main className="flex-1 py-16 space-y-16">
        {/* Header */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Celebration Blueprints</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight">
            Explore Celebrations Across India.
          </h1>
          <p className="text-slate-300 text-base max-w-2xl mx-auto leading-relaxed">
            Discover tailored blueprints for royal weddings, corporate summits, milestone birthdays, and private parties. Each blueprint is pre-calibrated for Indian rituals and production logistics.
          </p>
        </section>

        {/* Categories Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {EVENT_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="group rounded-3xl overflow-hidden glass-card border border-white/10 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-64 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-black/30"></div>

                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30">
                      {category.tagline}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                      {category.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {category.description}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-white/5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Recommended Budget:</span>
                      </span>
                      <span className="font-bold text-white">{category.avgBudgetRange}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Typical Guest Size:</span>
                      </span>
                      <span className="font-bold text-white">{category.typicalGuestRange}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/planner?type=${encodeURIComponent(category.id)}`}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold tracking-wide uppercase shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
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

