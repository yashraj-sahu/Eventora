import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CITIES } from "@/data/cities";

export function DestinationShowcase() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-[#C6A66B] dark:text-[#D4B77D] font-bold">
            Iconic Indian Hubs
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            Popular Destinations & Palace Estates.
          </h2>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm sm:text-base leading-relaxed">
            From the romantic lakes of Udaipur to the vibrant coastal sundowners of Goa and corporate summits in Bengaluru, explore India&apos;s most sought-after event destinations.
          </p>
        </div>

        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#173F35] dark:text-[#A9C7B2] hover:text-[#0F2B24] dark:hover:text-[#F4F0E7] transition-colors group shrink-0"
        >
          <span>View All 50+ Cities</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CITIES.map((city) => (
          <Link
            key={city.id}
            href={`/vendors?city=${encodeURIComponent(city.name)}`}
            className="group relative rounded-3xl overflow-hidden bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#C6A66B] dark:hover:border-[#D4B77D] hover:shadow-xl transition-all duration-300 h-80 flex flex-col justify-end p-6"
          >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>

            {/* Top Badge */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-[#151B18]/90 backdrop-blur-md text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139] shadow-xs">
                {city.state}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/50 backdrop-blur-md text-white/90">
                {city.venueCount} Venues
              </span>
            </div>

            {/* Content Details */}
            <div className="relative z-10 space-y-2">
              <h3 className="text-2xl font-serif font-bold text-white group-hover:text-[#F4EBD9] transition-colors">
                {city.name}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {city.tagline}
              </p>

              <div className="pt-2 flex flex-wrap gap-1.5">
                {city.popularFor.map((item, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-xs text-[#F4EBD9] font-semibold group-hover:translate-x-1 transition-transform">
                <span>Explore Venues in {city.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
