"use client";

import { useState } from "react";
import { INSPIRATION_ITEMS } from "@/data/inspirationItems";
import { Palette, Sparkles, Tag, Eye, ShieldCheck, Heart } from "lucide-react";

export default function DesignStudioPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", "Theme", "Decor", "Lighting", "Mandap", "Table Setting"];

  const filteredItems =
    selectedCategory === "All"
      ? INSPIRATION_ITEMS
      : INSPIRATION_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="space-y-1 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
          <Palette className="w-3.5 h-3.5" />
          <span>Visual Design Studio</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
          Aesthetic Inspiration & Moodboard
        </h1>
        <p className="text-xs text-[#D4C3B7]">
          Curated themes, color harmonies, mandap designs, and tablescapes for high-touch Indian celebrations
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-amber-500 text-[#1A1211] font-bold"
                : "bg-[#2E1F1E] text-[#D4C3B7] hover:text-white border border-[#4D3331]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Inspiration Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group rounded-3xl overflow-hidden glass-card border border-white/10 hover:border-amber-500/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="relative h-56 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-black/30"></div>
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-amber-400 border border-amber-500/30">
                {item.category}
              </span>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#D4C3B7] leading-relaxed">
                  {item.description}
                </p>
              </div>

              {item.colors && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9E897F] block">
                    Color Palette Harmony
                  </span>
                  <div className="flex items-center gap-2">
                    {item.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-[#1A1211] px-2 py-1 rounded-lg border border-[#4D3331]">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: c.hex }}
                        ></div>
                        <span className="text-[10px] text-[#D4C3B7]">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-2">
                {item.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#2E1F1E] border border-[#4D3331] text-[#D4C3B7]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

