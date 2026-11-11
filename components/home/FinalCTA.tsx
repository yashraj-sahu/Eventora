import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#FFF3E3] dark:bg-[#1A1211] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-10 sm:p-16 rounded-[36px] bg-gradient-to-br from-[#681B1D] to-[#4B1117] border border-[#B77A36]/50 shadow-2xl text-center space-y-8 relative overflow-hidden">
          {/* Subtle gold ornamentation */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#B77A36]/20 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-radial from-[#EAD2B0]/15 to-transparent blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFFCF6]/10 border border-white/20 text-[#FFF3E3] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0]" />
            <span>Begin Your Royal Journey Today</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#FFF3E3] tracking-tight leading-tight">
              Ready to Orchestrate Your <br />
              <span className="italic font-normal text-[#EAD2B0]">
                Extraordinary Celebration?
              </span>
            </h2>
            <p className="text-[#EAD2B0]/90 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Experience the power of intelligent AI planning. Receive a customized budget model, 
              vetted heritage vendor recommendations, and master day-of timeline in minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/planner"
              className="px-8 py-3.5 rounded-full bg-[#FFF3E3] hover:bg-[#FAF3E8] text-[#681B1D] font-bold text-xs tracking-wider uppercase shadow-lg transition-all flex items-center gap-2 group cursor-pointer border border-[#B77A36]/40"
            >
              <Sparkles className="w-4 h-4 text-[#B77A36] group-hover:rotate-12 transition-transform" />
              <span>Start Planning My Event</span>
              <ArrowRight className="w-4 h-4 text-[#681B1D] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/vendors"
              className="px-7 py-3.5 rounded-full bg-[#FFFCF6]/10 hover:bg-[#FFFCF6]/20 border border-[#EAD2B0]/40 text-[#FFF3E3] font-semibold text-xs transition-all cursor-pointer"
            >
              <span>Browse Vendor Directory</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-white/15 flex flex-wrap items-center justify-center gap-6 text-xs text-[#EAD2B0]/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#EAD2B0]" />
              <span>Complimentary AI Blueprint</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#EAD2B0]" />
              <span>Top 1% Verified Indian Vendors</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#EAD2B0]" />
              <span>Transparent INR Pricing</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
