import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HowItWorks as HowItWorksComponent } from "@/components/home/HowItWorks";
import { Sparkles, CheckCircle2, XCircle, ArrowRight, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function HowItWorksPage() {
  const comparison = [
    {
      feature: "Budget Planning & Transparency",
      traditional: "Static estimates with frequent 20-30% unexpected cost blowouts",
      evntora: "Dynamic AI budget allocation across 6 pillars with real-time INR tracking",
    },
    {
      feature: "Vendor Discovery & Verification",
      traditional: "Limited to individual planner's informal network & kickbacks",
      evntora: "Strictly vetted top 1% nationwide artisans with verified client audits",
    },
    {
      feature: "Event Blueprint Turnaround",
      traditional: "Takes 2-4 weeks of back-and-forth meetings and spreadsheets",
      evntora: "Generated instantly with tailored culinary, decor, and timeline suggestions",
    },
    {
      feature: "Guest & RSVP Management",
      traditional: "Messy WhatsApp lists, manual phone calls, lost dietary notes",
      evntora: "Centralized digital RSVP tracker with table assignments and dietary alerts",
    },
    {
      feature: "Day-of Run of Show",
      traditional: "Paper printouts that frequently go out of sync during live events",
      evntora: "Live digital master timeline with responsible leads and timeframes",
    },
  ];

  const faqs = [
    {
      q: "How does Evntora's AI generate event blueprints?",
      a: "Our AI engine analyzes hundreds of successful Indian weddings, galas, and private celebrations across 50+ cities. It processes your guest count, budget, ritual requirements, and aesthetic preferences to output a calibrated itinerary, budget split, and vendor requirements in seconds.",
    },
    {
      q: "Are the vendors on Evntora verified?",
      a: "Yes. Every vendor listed in our marketplace passes an audit reviewing past event delivery, client references, insurance compliance, and pricing transparency. We reject over 90% of applicants to protect our users.",
    },
    {
      q: "Can I manage multiple events on Evntora?",
      a: "Absolutely. In your Customer Dashboard, you can track multiple events simultaneously—such as a 3-day wedding, a corporate leadership summit, or a private anniversary party.",
    },
    {
      q: "Does Evntora charge hidden agency commissions?",
      a: "Never. We believe in direct, transparent pricing parity. You pay standard prices directly to vendors, with no hidden broker markups.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-12 space-y-20">
        {/* Header */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>The Evntora Methodology</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            How Evntora Powers Flawless Celebrations.
          </h1>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-base max-w-2xl mx-auto">
            A comprehensive, technology-driven approach that replaces fragmentation with intelligent harmony.
          </p>
        </section>

        {/* Embedded Interactive Walkthrough */}
        <HowItWorksComponent />

        {/* Comparison Table */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Traditional Planning vs. Evntora</h2>
            <p className="text-[#77746D] dark:text-[#B5B5AA] text-sm">See how modern technology and transparent curation transform the experience.</p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 bg-[#FAF8F3] dark:bg-[#1C2520] p-5 text-xs font-bold uppercase tracking-wider text-[#77746D] dark:text-[#B5B5AA] border-b border-[#E8E2D7] dark:border-[#344139]">
              <div className="col-span-4">Capability</div>
              <div className="col-span-4 text-rose-600 dark:text-rose-400">Traditional Agency Model</div>
              <div className="col-span-4 text-[#173F35] dark:text-[#A9C7B2]">Evntora AI + Concierge</div>
            </div>

            <div className="divide-y divide-[#E8E2D7] dark:divide-[#344139]">
              {comparison.map((row, i) => (
                <div key={i} className="grid grid-cols-12 p-5 text-xs sm:text-sm items-center hover:bg-[#FAF8F3]/60 dark:hover:bg-[#1C2520]/60 transition-colors">
                  <div className="col-span-4 font-semibold text-[#252522] dark:text-[#F4F0E7] pr-4">{row.feature}</div>
                  <div className="col-span-4 text-[#77746D] dark:text-[#B5B5AA] flex items-start gap-2 pr-4">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{row.traditional}</span>
                  </div>
                  <div className="col-span-4 text-[#173F35] dark:text-[#A9C7B2] flex items-start gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0 mt-0.5" />
                    <span>{row.evntora}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Everything You Need to Know</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] space-y-2 shadow-2xs">
                <h3 className="text-base font-bold text-[#252522] dark:text-[#F4F0E7]">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-[#77746D] dark:text-[#B5B5AA] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Start Building Your Event Blueprint</h2>
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <span>Launch AI Planner</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
