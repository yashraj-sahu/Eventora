import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#FAF8F3] dark:bg-[#151B18] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-10 sm:p-16 rounded-3xl bg-[#173F35] dark:bg-[#232F28] border border-[#C6A66B]/30 dark:border-[#344139] shadow-2xl text-center space-y-8 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#FAF8F3] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>Begin Your Celebration Today</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#FAF8F3] dark:text-[#F4F0E7] tracking-tight leading-tight">
              Ready to Orchestrate Your <br />
              <span className="italic font-normal text-[#C6A66B] dark:text-[#D4B77D]">
                Extraordinary Celebration?
              </span>
            </h2>
            <p className="text-[#E7EFEA] dark:text-[#B5B5AA] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Experience the power of intelligent AI planning. Receive a customized budget model, 
              vetted vendor recommendations, and master day-of timeline in minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/planner"
              className="px-8 py-3.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F0EDE5] text-[#173F35] font-bold text-xs tracking-wider uppercase shadow-lg transition-all flex items-center gap-2 group cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#173F35] group-hover:rotate-12 transition-transform" />
              <span>Start Planning My Event</span>
              <ArrowRight className="w-4 h-4 text-[#173F35] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/vendors"
              className="px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[#FAF8F3] font-semibold text-xs transition-all cursor-pointer"
            >
              <span>Browse Vendor Directory</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs text-[#E7EFEA] dark:text-[#B5B5AA]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#C6A66B]" />
              <span>Complimentary AI Blueprint</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#C6A66B]" />
              <span>Top 1% Verified Indian Artisans</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#C6A66B]" />
              <span>Transparent INR Pricing</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
