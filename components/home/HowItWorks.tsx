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
} from "lucide-react";

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

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

  return (
    <section className="py-24 bg-[#F8EFE4] dark:bg-[#241918] border-y border-[#EAD2B0] dark:border-[#4D3331] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
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

              <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
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
    </section>
  );
}
