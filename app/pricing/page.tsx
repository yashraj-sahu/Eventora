import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, Check, ArrowRight, Crown } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  const customerPlans = [
    {
      name: "Complimentary Discovery",
      badge: "Free Forever",
      price: "₹0",
      cadence: "per event",
      desc: "Perfect for couples and hosts exploring event concepts, locations, and initial budget boundaries.",
      features: [
        "AI Event Blueprint Generation (Single Event)",
        "Nationwide Vendor Directory Browsing",
        "Interactive Budget Allocation Calculator",
        "Direct Vendor Enquiry Routing",
        "Basic Planning Checklist",
      ],
      cta: "Start Free Planning",
      ctaHref: "/planner",
      highlight: false,
    },
    {
      name: "Concierge Elite",
      badge: "Most Popular",
      price: "₹19,999",
      cadence: "per event",
      desc: "Complete digital orchestration for multi-day Indian weddings, milestones, and high-impact galas.",
      features: [
        "Unlimited AI Blueprint Iterations & Variations",
        "Full Event Workspace (Guest, RSVP & Tables)",
        "Detailed Expense & Invoice Tracker in INR",
        "Digital RSVP Manager with Dietary Tracking",
        "Minute-by-Minute Run-of-Show Timelines",
        "Dedicated Virtual Event Concierge (Chat & Call)",
        "Vendor Proposal Comparison Matrix",
      ],
      cta: "Choose Concierge Elite",
      ctaHref: "/signup?plan=elite",
      highlight: true,
    },
    {
      name: "Royal Bespoke",
      badge: "Turnkey Luxury",
      price: "₹75,000",
      cadence: "per event",
      desc: "White-glove hybrid experience pairing AI architecture with a dedicated senior on-ground producer.",
      features: [
        "Everything in Concierge Elite",
        "Dedicated Senior Event Producer Assigned",
        "Direct Contract & Rate Negotiation with Vendors",
        "Custom 3D Decor & Mandap Renderings",
        "Airport VIP Hospitality & Logistics Coordinator",
        "Day-of Ground Coordination Team (3 members)",
        "Complete Post-Event Reconciliation & Auditing",
      ],
      cta: "Apply for Royal Bespoke",
      ctaHref: "/contact?subject=royal-bespoke",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-16 space-y-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>Transparent, Honest Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            Plans Tailored to Every Scale of Celebration.
          </h1>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-base max-w-2xl mx-auto leading-relaxed">
            Choose the level of orchestration you need. Never any hidden agency markups or kickbacks.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {customerPlans.map((plan, i) => (
            <div
              key={i}
              className={`p-8 rounded-3xl flex flex-col justify-between space-y-8 transition-all bg-white dark:bg-[#232F28] ${
                plan.highlight
                  ? "border-2 border-[#173F35] dark:border-[#A9C7B2] shadow-xl relative scale-[1.02]"
                  : "border border-[#E8E2D7] dark:border-[#344139] shadow-sm hover:shadow-md"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#173F35] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Crown className="w-3.5 h-3.5 text-[#C6A66B]" />
                  <span>{plan.badge}</span>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">{plan.name}</h3>
                  <p className="text-xs text-[#77746D] dark:text-[#B5B5AA] leading-relaxed">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">{plan.price}</span>
                  <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">/{plan.cadence}</span>
                </div>

                <div className="pt-4 border-t border-[#E8E2D7] dark:border-[#344139] space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] block">
                    What&apos;s Included
                  </span>
                  <ul className="space-y-2.5 text-xs text-[#252522] dark:text-[#F4F0E7]">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <Link
                  href={plan.ctaHref}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    plan.highlight
                      ? "bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3]"
                      : "bg-[#FAF8F3] dark:bg-[#1C2520] hover:bg-[#E7EFEA] text-[#173F35] dark:text-[#A9C7B2] border border-[#E8E2D7] dark:border-[#344139]"
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Vendor Partner Note */}
        <div className="p-8 rounded-3xl bg-[#F0EDE5] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold">
              For Palace Estates & Artisans
            </span>
            <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Are you a premier event vendor or venue owner in India?
            </h3>
            <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              Apply to join Evntora&apos;s verified top 1% network. Get direct booking inquiries from high-budget couples and enterprise event producers.
            </p>
          </div>
          <Link
            href="/vendor-portal"
            className="px-6 py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs whitespace-nowrap transition-all shadow-xs"
          >
            Explore Vendor Partner Portal
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
