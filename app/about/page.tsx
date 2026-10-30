import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, MapPin, ShieldCheck, Heart, Award, Users, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">      <Navbar />

      <main className="flex-1 py-16 space-y-24">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Evntora Story</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
            Orchestrating India&apos;s Most Sacred <br />
            <span className="royal-gradient-text">& Magnificent Celebrations.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Founded with the conviction that luxury celebration planning in India deserves both algorithmic precision and heartfelt hospitality, Evntora bridges cutting-edge AI blueprints with the nation&apos;s finest event artisans.
          </p>
        </section>

        {/* Narrative Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                Why We Built Evntora
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                Replacing Fragmentation With Complete Clarity.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                An Indian wedding or milestone gala typically involves managing 25+ independent vendors, 
                negotiating contracts with varying terms, and juggling hundreds of guest travel itineraries. 
                For decades, families and corporate leaders faced high stress, hidden agency commissions, and endless WhatsApp threads.
              </p>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Evntora was born to change that. Our AI planning engine translates your vision into realistic INR budget models, 
                curates vetted vendor shortlists, and generates minute-by-minute run-of-show schedules—giving you peace of mind to actually enjoy every sacred moment.
              </p>
            </div>

            <div className="relative rounded-3xl overflow-hidden glass-card border border-amber-500/30 p-2">
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
            <h2 className="text-3xl font-serif font-bold text-white">Our Guiding Principles</h2>
            <p className="text-slate-400 text-sm">The pillars that steer every line of code and every vendor partnership.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((val, i) => {
              const Icon = val.icon;
              return (
                <div key={i} className="p-8 rounded-2xl glass-card border border-white/10 hover:border-amber-500/30 transition-all space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white">{val.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{val.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-serif font-bold text-white">Experience The Future Of Event Planning</h2>
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/20 hover:scale-105 transition-all"
          >
            <span>Start Planning With AI</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

