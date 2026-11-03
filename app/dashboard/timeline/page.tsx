"use client";

import { useEvntoraStore } from "@/lib/store";
import { Clock, MapPin, User, FileText, CheckCircle2 } from "lucide-react";

export default function TimelinePage() {
  const { activeEvent } = useEvntoraStore();
  const timeline = activeEvent?.blueprint?.runOfShowTimeline || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="space-y-1 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" />
          <span>Execution Run of Show</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
          Event Day Timeline & Stage Protocols
        </h1>
        <p className="text-xs text-[#D4C3B7]">
          Chronological minute-by-minute schedule for {activeEvent?.title || "your celebration"}
        </p>
      </div>

      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-8">
        <div className="relative border-l-2 border-amber-500/30 ml-4 space-y-8 pl-6 sm:pl-8">
          {timeline.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-[#08090d] border-2 border-amber-400 group-hover:bg-amber-400 transition-colors"></div>

              <div className="p-6 rounded-2xl bg-[#1A1211]/80 border border-[#4D3331] hover:border-amber-500/30 transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 self-start">
                    {item.time}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#D4C3B7]">
                    <User className="w-3.5 h-3.5 text-[#9E897F]" />
                    <span>Lead: <strong className="text-[#FFF3E3]">{item.responsiblePerson}</strong></span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-serif font-bold text-white">{item.activity}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#D4C3B7]">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.location}</span>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-[#D4C3B7] bg-[#2E1F1E]/60 p-3 rounded-xl border border-[#4D3331] leading-relaxed">
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

