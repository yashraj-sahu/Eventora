import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HowItWorks as HowItWorksComponent } from "@/components/home/HowItWorks";
import { Sparkles, CheckCircle2, XCircle, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">      <Navbar />

      <main className="flex-1 py-12 space-y-20">
        {/* Header */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Evntora Methodology</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight">
            How Evntora Powers Flawless Celebrations.
          </h1>
          <p className="text-slate-300 text-base max-w-2xl mx-auto">
            A comprehensive, technology-driven approach that replaces fragmentation with intelligent harmony.
          </p>
        </section>

        {/* Embedded Interactive Walkthrough */}
        <HowItWorksComponent />

        {/* Comparison Table */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-serif font-bold text-white">Traditional Planning vs. Evntora</h2>
            <p className="text-slate-400 text-sm">See how modern technology and transparent curation transform the experience.</p>
          </div>

          <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
            <div className="grid grid-cols-12 bg-slate-950/80 p-5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <div className="col-span-4">Capability</div>
              <div className="col-span-4 text-rose-400">Traditional Agency Model</div>
              <div className="col-span-4 text-amber-400">Evntora AI + Concierge</div>
            </div>

            <div className="divide-y divide-white/5">
              {comparison.map((row, i) => (
                <div key={i} className="grid grid-cols-12 p-5 text-xs sm:text-sm items-center hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-4 font-semibold text-white pr-4">{row.feature}</div>
                  <div className="col-span-4 text-slate-400 flex items-start gap-2 pr-4">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{row.traditional}</span>
                  </div>
                  <div className="col-span-4 text-slate-200 flex items-start gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
            <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-amber-400 font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-white">Everything You Need to Know</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
                <h3 className="text-base font-bold text-white">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-serif font-bold text-white">Start Building Your Event Blueprint</h2>
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/20 hover:scale-105 transition-all"
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

