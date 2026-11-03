import { ShieldCheck, Award, Lock, Sparkles, Clock, HeartHandshake } from "lucide-react";

export function Testimonials() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: "Vetted Top 1% Artisans",
      desc: "Every palace venue, culinary master, and cinematographer is verified through rigorous quality standards, on-ground audits, and past client track records.",
      badge: "Quality Guarantee",
    },
    {
      icon: Lock,
      title: "Transparent INR Pricing",
      desc: "Eliminate inflated broker markups and surprise day-of fees. Access honest, direct pricing schedules with verified package deliverables.",
      badge: "Direct Pricing",
    },
    {
      icon: Award,
      title: "Intelligent Milestone Protection",
      desc: "Track vendor payments against documented project milestones, ensuring complete peace of mind and accountability from token to final send-off.",
      badge: "Payment Security",
    },
    {
      icon: Clock,
      title: "Real-Time Master Timelines",
      desc: "Synchronize family rituals, culinary setups, and photographer slots into one coherent minute-by-minute plan accessible by all stakeholders.",
      badge: "Orchestration",
    },
    {
      icon: HeartHandshake,
      title: "Cultural Ritual Mastery",
      desc: "Tailored intelligence for authentic multi-day celebrations: Mehendi, Sangeet, Haldi, Pheras, and Reception with customized dietary requirements.",
      badge: "Heritage Focus",
    },
    {
      icon: Sparkles,
      title: "Dedicated Luxury Concierge",
      desc: "Enjoy access to our dedicated luxury concierge team for bespoke venue negotiations, artist bookings, and emergency on-ground problem solving.",
      badge: "White-Glove Support",
    },
  ];

  return (
    <section className="py-24 bg-[#F8EFE4] dark:bg-[#241918] border-t border-[#EAD2B0] dark:border-[#4D3331] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EAD2B0]/40 dark:bg-[#681B1D]/40 border border-[#EAD2B0] dark:border-[#4D3331] text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B77A36]" />
            <span>The Evntora Standard</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Built On Uncompromising Standards & Trust.
          </h2>
          <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
            Planning life&apos;s most sacred and grand celebrations requires complete confidence. Here is how Evntora ensures an impeccable royal experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36] hover:shadow-xl transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] flex items-center justify-center text-[#681B1D] dark:text-[#EAD2B0]">
                      <Icon className="w-5 h-5 text-[#B77A36]" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#FFFCF6] dark:bg-[#1A1211] text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331]">
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
                    {pillar.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#7D6B63] dark:text-[#D4C3B7] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
