"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calculator,
  Store,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const steps = [
    {
      num: "01",
      title: "Input Vision & Parameters",
      icon: Sparkles,
      tagline: "Occasion, Destination, Guest Count & Budget",
      desc: "Tell Evntora your occasion, destination city (from Udaipur palaces to Goa beaches), guest count, and INR budget. Specify themes like Royal Rajasthani, Contemporary Chic, or Bollywood Glam.",
      features: [
        "Deep understanding of Indian multi-day rituals (Mehendi, Sangeet, Pheras)",
        "City-specific logistics and seasonal weather insights",
        "Direct input for strict dietary preferences (Jain, Sattvic, Vegan)",
      ],
      previewHeadline: "Generating Tailored Event Blueprint...",
      previewSub: "Synthesizing 45+ cultural variables & location metrics.",
    },
    {
      num: "02",
      title: "Intelligent Budget Allocation",
      icon: Calculator,
      tagline: "Dynamic Fiscal Calibration in INR",
      desc: "Evntora distributes your budget across Venues (35%), Catering (28%), Haute Decor (16%), Cinematography (9%), Entertainment (7%), and Logistics (5%), preventing costly overruns.",
      features: [
        "Real-time INR budget calculations and variance warnings",
        "Transparent price ranges without hidden middleman markups",
        "Payment milestone schedules aligned with vendor contracts",
      ],
      previewHeadline: "Budget Model: ₹45,00,000 Total Allocation",
      previewSub: "Optimal allocation for 350 guests in Udaipur.",
    },
    {
      num: "03",
      title: "Curated Vendor Matching",
      icon: Store,
      tagline: "Top 1% Verified Indian Artisans",
      desc: "Discover vetted heritage venues, award-winning cinematographers, master royal caterers, and renowned DJs. Send direct enquiries, review portfolios, and book with confidence.",
      features: [
        "Strict 100% verification of past events and client testimonials",
        "Direct inquiry routing with no agency commissions",
        "Package comparisons with transparent inclusion lists",
      ],
      previewHeadline: "Matching Top 1% Verified Artisans",
      previewSub: "Direct access to palace estates & master caterers.",
    },
    {
      num: "04",
      title: "Flawless Concierge Execution",
      icon: Clock,
      tagline: "Minute-by-Minute Run of Show & RSVPs",
      desc: "Manage RSVPs, seating charts, task checklists, and hour-by-hour event day timelines in your dedicated customer workspace for stress-free celebration day.",
      features: [
        "Hour-by-hour master timeline with responsible coordinators",
        "Real-time guest RSVP tracking and dietary logs",
        "Exportable PDF briefs for your on-ground event crew",
      ],
      previewHeadline: "Day-of Run of Show Active",
      previewSub: "Minute-by-minute synchronization across all teams.",
    },
  ];

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
    <section
      id="how-it-works"
      className="py-24 bg-[#F8EFE4] dark:bg-[#241918] border-y border-[#EAD2B0] dark:border-[#4D3331] transition-colors duration-200 scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {/* ── SECTION 1: HEADER & 4-STEP METHODOLOGY ── */}
        <div className="space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
              <span className="w-6 h-[1px] bg-[#B77A36]" />
              <span>The Evntora Method</span>
              <span className="w-6 h-[1px] bg-[#B77A36]" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
              How Evntora Transforms Chaos Into Royal Elegance.
            </h2>
            <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm sm:text-base leading-relaxed">
              Planning a grand celebration in India used to mean endless phone calls, ambiguous pricing, and fragmented spreadsheets. 
              We replaced that with seamless AI intelligence rooted in tradition.
            </p>
          </div>

          {/* Interactive Step Switcher */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Step Navigation Cards */}
            <div className="lg:col-span-5 space-y-3">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;
                return (
                  <div
                    key={step.num}
                    onClick={() => setActiveStep(idx)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                      isActive
                        ? "bg-[#FFF3E3] dark:bg-[#2E1F1E] border-[#681B1D] dark:border-[#EAD2B0] shadow-md scale-[1.01]"
                        : "bg-[#FFF3E3]/60 dark:bg-[#1A1211]/60 border-[#EAD2B0] dark:border-[#4D3331] opacity-80 hover:opacity-100 hover:border-[#B77A36]"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`font-serif text-2xl font-bold ${
                          isActive ? "text-[#681B1D] dark:text-[#EAD2B0]" : "text-[#7D6B63] dark:text-[#9E897F]"
                        }`}
                      >
                        {step.num}
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`w-4 h-4 ${
                              isActive ? "text-[#681B1D] dark:text-[#EAD2B0]" : "text-[#7D6B63] dark:text-[#9E897F]"
                            }`}
                          />
                          <h3 className="text-base font-bold text-[#30221D] dark:text-[#FFF3E3]">{step.title}</h3>
                        </div>
                        <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{step.tagline}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Preview Card */}
            <div className="lg:col-span-7">
              <div className="p-8 sm:p-10 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl relative overflow-hidden space-y-6">
                <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-4">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0]">
                    Step {steps[activeStep].num} Deep-Dive
                  </span>
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#EAD2B0]/40 dark:bg-[#681B1D]/40 text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331]">
                    Interactive Preview
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
                    {steps[activeStep].title}
                  </h3>
                  <p className="text-sm text-[#59453E] dark:text-[#D4C3B7] leading-relaxed">
                    {steps[activeStep].desc}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
                  <div className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0] uppercase tracking-wider">
                    Key Capabilities
                  </div>
                  <div className="space-y-2">
                    {steps[activeStep].features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                        <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Link
                    href="/planner"
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer border border-[#B77A36]/40"
                  >
                    <span>Experience AI Planner</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#EAD2B0]" />
                  </Link>

                  <div className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
                    Step {activeStep + 1} of 4
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: COMPARISON TABLE (TRADITIONAL VS EVNTORA) ── */}
        <div className="space-y-8 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
              <span className="w-6 h-[1px] bg-[#B77A36]" />
              <span>Comparative Advantage</span>
              <span className="w-6 h-[1px] bg-[#B77A36]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
              Traditional Planning vs. Evntora
            </h2>
            <p className="text-[#59453E] dark:text-[#D4C3B7] text-sm">
              See how modern technology and transparent curation transform the celebration experience.
            </p>
          </div>

          <div className="rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] overflow-hidden shadow-lg">
            <div className="grid grid-cols-12 bg-[#EAD2B0]/40 dark:bg-[#1A1211] p-4 sm:p-5 text-xs font-bold uppercase tracking-wider text-[#7D6B63] dark:text-[#D4C3B7] border-b border-[#EAD2B0] dark:border-[#4D3331]">
              <div className="col-span-12 sm:col-span-4">Capability</div>
              <div className="col-span-12 sm:col-span-4 text-rose-700 dark:text-rose-400">Traditional Agency Model</div>
              <div className="col-span-12 sm:col-span-4 text-[#681B1D] dark:text-[#EAD2B0]">Evntora AI + Concierge</div>
            </div>

            <div className="divide-y divide-[#EAD2B0]/60 dark:divide-[#4D3331]">
              {comparison.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 p-4 sm:p-5 text-xs sm:text-sm items-center hover:bg-[#FFFCF6]/40 dark:hover:bg-[#FFFCF6]/5 transition-colors gap-3 sm:gap-0"
                >
                  <div className="col-span-12 sm:col-span-4 font-semibold text-[#30221D] dark:text-[#FFF3E3] pr-4 font-serif">
                    {row.feature}
                  </div>
                  <div className="col-span-12 sm:col-span-4 text-[#7D6B63] dark:text-[#D4C3B7] flex items-start gap-2 pr-4 text-xs">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{row.traditional}</span>
                  </div>
                  <div className="col-span-12 sm:col-span-4 text-[#681B1D] dark:text-[#EAD2B0] flex items-start gap-2 font-medium text-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0 mt-0.5" />
                    <span>{row.evntora}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTION 3: FREQUENTLY ASKED QUESTIONS (FAQS) ── */}
        <div className="max-w-4xl mx-auto space-y-8 pt-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>Celebration Queries</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#7D6B63] dark:text-[#D4C3B7]">
              Everything you need to know about planning your celebration with Evntora
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-[#30221D] dark:text-[#FFF3E3] font-serif">
                      {faq.q}
                    </h3>
                    <ChevronDown
                      className={`w-4 h-4 text-[#B77A36] shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-[#59453E] dark:text-[#D4C3B7] leading-relaxed border-t border-[#EAD2B0]/40 dark:border-[#4D3331]/40 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
