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
    <section className="py-24 bg-[#F0EDE5] dark:bg-[#1C2520] border-t border-[#E8E2D7] dark:border-[#344139] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>The Evntora Standard</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            Built On Uncompromising Standards & Trust.
          </h2>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm sm:text-base leading-relaxed">
            Planning life&apos;s most memorable celebration requires complete confidence. Here is how Evntora ensures an impeccable experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] hover:border-[#C6A66B] dark:hover:border-[#D4B77D] hover:shadow-lg transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-[#E7EFEA] dark:bg-[#173F35]/50 flex items-center justify-center text-[#173F35] dark:text-[#A9C7B2]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#FAF8F3] dark:bg-[#151B18] text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139]">
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                    {pillar.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#77746D] dark:text-[#B5B5AA] leading-relaxed">
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
