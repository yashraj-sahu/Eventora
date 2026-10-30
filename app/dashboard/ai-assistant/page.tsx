"use client";

import { useState } from "react";
import { useEvntoraStore } from "@/lib/store";
import { Bot, Send, Sparkles, User, ShieldCheck } from "lucide-react";

export default function AIAssistantPage() {
  const { activeEvent } = useEvntoraStore();
  const [messages, setMessages] = useState<Array<{ role: "ai" | "user"; text: string }>>([
    {
      role: "ai",
      text: `Namaste! I am your Evntora AI Event Concierge. I have full context on your ${activeEvent?.title || "celebration"} in ${activeEvent?.city || "India"}. How can I assist your planning today?`,
    },
  ]);
  const [input, setInput] = useState("");

  const suggestedPrompts = [
    "How should I split our catering budget between live counters and plated service?",
    "What are the sound curfew and music license (PPL/IPRS) rules in Rajasthan?",
    "Suggest 3 signature welcome mocktails using regional Indian botanical spices.",
    "How do we structure guest transport from the airport to Udaipur lakefront hotels?",
  ];

  const handleSend = (userText: string) => {
    if (!userText.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");

    setTimeout(() => {
      let reply = "";
      const lower = userText.toLowerCase();
      if (lower.includes("catering") || lower.includes("counters") || lower.includes("food")) {
        reply = "For high-touch Indian celebrations, allocating 60% of catering to interactive live counters (e.g. Artisanal Chaat, Dim Sum, Woodfired Flatbreads) and 40% to royal regional main courses (Awadhi Dum Biryani, Dal Bukhara) ensures zero buffet queuing and maximum culinary delight.";
      } else if (lower.includes("curfew") || lower.includes("license") || lower.includes("sound")) {
        reply = "In Rajasthan and Maharashtra, outdoor loud music curfews strictly apply at 22:00 (10:00 PM). Ensure your PPL and IPRS licenses are filed 14 days prior through your sound contractor. We recommend transferring the celebration to a soundproofed ballroom for the late-night DJ set.";
      } else if (lower.includes("mocktail") || lower.includes("drink") || lower.includes("beverage")) {
        reply = "Top trending celebration elixirs: 1) Smoked Rosemary Jamun Shrub with roasted cumin; 2) Saffron & Cardamom Coconut Cold Brew; 3) Star Anise & Hibiscus Sparkling Tonic. These provide luxury non-alcoholic experiences for both elders and younger guests.";
      } else {
        reply = `Analyzing your event parameters in ${activeEvent?.city || "India"}: To maintain harmony and fiscal discipline within your ${activeEvent?.totalBudget ? `₹${(activeEvent.totalBudget / 100000).toFixed(0)} Lakh` : "allotted"} budget, lock your core production leads 90 days out and verify all vendor meal inclusions in contracts.`;
      }
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    }, 500);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-14rem)] flex flex-col animate-in fade-in duration-200">
      <div className="space-y-1 border-b border-white/10 pb-4 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
          <Bot className="w-3.5 h-3.5" />
          <span>Intelligent Event Advisory</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          Evntora AI Concierge Desk
        </h1>
        <p className="text-xs text-slate-400">
          Trained on Indian wedding etiquette, regulatory licenses, budget optimization, and vendor negotiation protocols
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {suggestedPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-amber-300 whitespace-nowrap transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 p-6 rounded-3xl glass-card border border-white/10 overflow-y-auto space-y-4 scrollbar-thin">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-amber-500 text-slate-950 font-bold text-xs"
                  : "bg-slate-800 border border-slate-700 text-amber-400"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-amber-500 text-slate-950 font-medium"
                  : "bg-slate-950/80 border border-slate-800 text-slate-200"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about vendor contracts, timelines, ritual nuances, or budget cuts..."
          className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

