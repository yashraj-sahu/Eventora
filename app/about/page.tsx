import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MapPin, ShieldCheck, Heart, Award, ArrowRight } from "lucide-react";
import Link from "next/link";

function RoyalFlourishMotif() {
  return (
    <div className="flex items-center justify-center gap-2.5 my-1">
      <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent via-[#B77A36] to-transparent" />
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#B77A36]">
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

export default function AboutPage() {
  const values = [
    {
      title: "Cultural Reverence & Precision",
      desc: "Indian celebrations are sacred, multi-generational sagas. We engineer AI that understands the emotional and cultural nuances of every ritual—from royal Pheras to modern sangeet afterparties.",
      icon: Heart,
    },
    {
      title: "Zero Hidden Kickbacks",
      desc: "Traditional event planning in India is clouded by opaque middleman markups. Evntora champions 100% transparent pricing and direct pricing parity with our vendor partners.",
      icon: ShieldCheck,
    },
    {
      title: "Vetted Top 1% Artisans",
      desc: "We accept less than 8% of vendor applicants. Every palace estate, caterer, and cinematographer is verified through rigorous past client interviews and on-ground audits.",
      icon: Award,
    },
    {
      title: "Nationwide Pan-India Reach",
      desc: "From the majestic heritage forts of Rajasthan to the beachfront resorts of Goa and high-tech convention centers of Bengaluru, our network spans 50+ Indian destinations.",
      icon: MapPin,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-16 space-y-24">
        {/* ── HERO SECTION WITH EDITORIAL HIERARCHY ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex flex-col items-center justify-center">
            <RoyalFlourishMotif />
            <span className="text-[11px] uppercase font-bold tracking-[0.25em] text-[#B77A36] dark:text-[#EAD2B0] font-sans mt-0.5">
              THE EVNTORA STORY
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight leading-[1.15]">
            Where timeless traditions <br />
            <span className="italic font-normal text-[#681B1D] dark:text-[#EAD2B0]">meet thoughtful innovation.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#59453E] dark:text-[#D4C3B7] max-w-2xl mx-auto leading-relaxed">
            Evntora brings together the artistry of exceptional celebrations and the intelligence of modern planning to create experiences worth remembering.
          </p>
        </section>

        {/* ── NARRATIVE SECTION ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2">
                <span className="w-6 h-[1px] bg-[#B77A36]" />
                <span className="text-[11px] uppercase font-bold tracking-[0.22em] text-[#B77A36] dark:text-[#EAD2B0] font-sans">
                  WHY WE BUILT EVNTORA
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
                Replacing Fragmentation With Complete Clarity.
              </h2>
              <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
                An Indian wedding or milestone gala typically involves managing 25+ independent vendors, 
                negotiating contracts with varying terms, and juggling hundreds of guest travel itineraries. 
                For decades, families and corporate leaders faced high stress, hidden agency commissions, and endless WhatsApp threads.
              </p>
              <p className="text-[#7D6B63] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
                Evntora was born to change that. Our AI planning engine translates your vision into realistic INR budget models, 
                curates vetted vendor shortlists, and generates minute-by-minute run-of-show schedules—giving you peace of mind to actually enjoy every sacred moment.
              </p>
            </div>

            <div className="relative rounded-3xl overflow-hidden bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] p-3 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80"
                alt="Royal Indian celebration"
                className="w-full h-[400px] object-cover rounded-2xl"
              />
            </div>
          </div>
        </section>

        {/* ── VALUES GRID ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2">
              <span className="w-6 h-[1px] bg-[#B77A36]" />
              <span className="text-[11px] uppercase font-bold tracking-[0.25em] text-[#B77A36] dark:text-[#EAD2B0] font-sans">
                OUR VALUES
              </span>
              <span className="w-6 h-[1px] bg-[#B77A36]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
              Our Guiding Principles
            </h2>
            <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm">
              The pillars that steer every line of code and every vendor partnership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((val, i) => {
              const Icon = val.icon;
              return (
                <div
                  key={i}
                  className="p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-lg transition-all space-y-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center text-[#681B1D] dark:text-[#EAD2B0]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">{val.title}</h3>
                  <p className="text-sm text-[#7D6B63] dark:text-[#D4C3B7] leading-relaxed">{val.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
            Begin Planning Your Royal Celebration
          </h2>
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all border border-[#B77A36]/50 cursor-pointer"
          >
            <span>Launch AI Planner</span>
            <ArrowRight className="w-4 h-4 text-[#EAD2B0]" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
