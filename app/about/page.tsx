import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, MapPin, ShieldCheck, Heart, Award, ArrowRight } from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-16 space-y-24">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>The Evntora Story</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight leading-tight">
            Orchestrating India&apos;s Most Sacred <br />
            <span className="italic font-normal text-[#C6A66B] dark:text-[#D4B77D]">& Magnificent Celebrations.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#77746D] dark:text-[#B5B5AA] max-w-3xl mx-auto leading-relaxed">
            Founded with the conviction that luxury celebration planning in India deserves both algorithmic precision and heartfelt hospitality, Evntora bridges cutting-edge AI blueprints with the nation&apos;s finest event artisans.
          </p>
        </section>

        {/* Narrative Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-[#C6A66B] dark:text-[#D4B77D] font-bold">
                Why We Built Evntora
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                Replacing Fragmentation With Complete Clarity.
              </h2>
              <p className="text-[#252522] dark:text-[#F4F0E7] text-sm sm:text-base leading-relaxed">
                An Indian wedding or milestone gala typically involves managing 25+ independent vendors, 
                negotiating contracts with varying terms, and juggling hundreds of guest travel itineraries. 
                For decades, families and corporate leaders faced high stress, hidden agency commissions, and endless WhatsApp threads.
              </p>
              <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm sm:text-base leading-relaxed">
                Evntora was born to change that. Our AI planning engine translates your vision into realistic INR budget models, 
                curates vetted vendor shortlists, and generates minute-by-minute run-of-show schedules—giving you peace of mind to actually enjoy every sacred moment.
              </p>
            </div>

            <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] p-3 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80"
                alt="Royal Indian celebration"
                className="w-full h-[420px] object-cover rounded-2xl"
              />
            </div>
          </div>
        </section>

        {/* Values Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Our Guiding Principles</h2>
            <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm">The pillars that steer every line of code and every vendor partnership.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((val, i) => {
              const Icon = val.icon;
              return (
                <div key={i} className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#C6A66B] dark:hover:border-[#D4B77D] hover:shadow-lg transition-all space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E7EFEA] dark:bg-[#173F35]/50 flex items-center justify-center text-[#173F35] dark:text-[#A9C7B2]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">{val.title}</h3>
                  <p className="text-sm text-[#77746D] dark:text-[#B5B5AA] leading-relaxed">{val.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Experience The New Era of Indian Event Planning</h2>
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <span>Begin Planning Your Celebration</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
