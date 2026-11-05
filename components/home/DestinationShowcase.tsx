import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CITIES } from "@/data/cities";
import { TiltCard } from "@/components/motion/TiltCard";

export function DestinationShowcase() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
            <span className="w-6 h-[1px] bg-[#B77A36]" />
            <span>Iconic Indian Heritage Hubs</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Popular Destinations & Palace Estates.
          </h2>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
            From the romantic lakes of Udaipur to the regal palaces of Jaipur and royal estates of Delhi, explore India&apos;s most sought-after celebration destinations.
          </p>
        </div>

        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:text-[#4B1117] dark:hover:text-[#FFF3E3] transition-colors group shrink-0"
        >
          <span>View All 50+ Cities</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CITIES.map((city) => (
          <TiltCard key={city.id} className="rounded-3xl">
          <Link
            href={`/vendors?city=${encodeURIComponent(city.name)}`}
            className="group relative rounded-3xl overflow-hidden bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-2xl transition-all duration-300 h-80 flex flex-col justify-end p-6"
          >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
            </div>

            {/* Top Badge */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF3E3]/95 dark:bg-[#1A1211]/95 backdrop-blur-md text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs">
                {city.state}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/60 backdrop-blur-md text-[#FFF3E3] border border-white/10">
                {city.venueCount} Estates
              </span>
            </div>

            {/* Content Details */}
            <div className="relative z-10 space-y-2">
              <h3 className="text-2xl font-serif font-bold text-white group-hover:text-[#EAD2B0] transition-colors">
                {city.name}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {city.tagline}
              </p>

              <div className="pt-2 flex flex-wrap gap-1.5">
                {city.popularFor.map((item, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FFFCF6]/20 backdrop-blur-xs text-[#FFF3E3] border border-white/10"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-xs text-[#EAD2B0] font-semibold group-hover:translate-x-1 transition-transform">
                <span>Explore Venues in {city.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#EAD2B0]" />
              </div>
            </div>
          </Link>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}
