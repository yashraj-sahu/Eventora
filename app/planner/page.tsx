"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EVENT_CATEGORIES } from "@/data/categories";
import { CITIES } from "@/data/cities";
import { generateAIBlueprint } from "@/data/sampleBlueprints";
import { useEvntoraStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import { AIEventBlueprint, EventCategory } from "@/types";
import {
  Sparkles,
  MapPin,
  Coins,
  Palette,
  Clock,
  Utensils,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Bot,
  Send,
  Save,
  Check,
  ShieldCheck,
} from "lucide-react";

function PlannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addEvent } = useEvntoraStore();
  const { user } = useAuth();

  // Initial params from URL query if available
  const initialType = (searchParams.get("type") as EventCategory) || "Weddings";
  const initialCity = searchParams.get("city") || "Udaipur";
  const initialGuests = Number(searchParams.get("guests")) || 350;
  const initialBudget = Number(searchParams.get("budget")) || 4500000;

  // Wizard state
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState<EventCategory>(initialType);
  const [city, setCity] = useState(initialCity);
  const [date, setDate] = useState("2026-11-20");
  const [guestCount, setGuestCount] = useState(initialGuests);
  const [budgetINR, setBudgetINR] = useState(initialBudget);
  const [venuePreference, setVenuePreference] = useState("Heritage Palace & Lakeside Lawn");
  const [styleTheme, setStyleTheme] = useState("Royal Mewari Heritage");
  const [requirements, setRequirements] = useState("Include separate Jain live chaat counter; arrange vintage car for baraat arrival.");

  // Generated Blueprint State
  const [blueprint, setBlueprint] = useState<AIEventBlueprint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedToDashboard, setSavedToDashboard] = useState(false);

  useEffect(() => {
    if (searchParams.get("resume") !== "1") return;
    try {
      const raw = sessionStorage.getItem("evntora-planner-auth-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as { eventType: EventCategory; city: string; date: string; guestCount: number; budgetINR: number; venuePreference: string; styleTheme: string; requirements: string; blueprint: AIEventBlueprint | null };
      setEventType(draft.eventType); setCity(draft.city); setDate(draft.date); setGuestCount(draft.guestCount); setBudgetINR(draft.budgetINR);
      setVenuePreference(draft.venuePreference); setStyleTheme(draft.styleTheme); setRequirements(draft.requirements); setBlueprint(draft.blueprint);
      setStep(draft.blueprint ? 3 : 1); sessionStorage.removeItem("evntora-planner-auth-draft");
    } catch { sessionStorage.removeItem("evntora-planner-auth-draft"); }
  }, [searchParams]);

  const requireCustomerForSave = () => {
    if (user) return true;
    sessionStorage.setItem("evntora-planner-auth-draft", JSON.stringify({ eventType, city, date, guestCount, budgetINR, venuePreference, styleTheme, requirements, blueprint }));
    router.push(`/signin?portal=customer&redirectTo=${encodeURIComponent("/planner?resume=1")}`);
    return false;
  };

  // AI Assistant Chat Drawer State
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    {
      role: "ai",
      text: "Namaste! I am your Evntora AI Event Architect. Once your blueprint is ready, ask me anything about vendor negotiations, menu tastings, cultural protocols, or budget adjustments.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleGenerateBlueprint = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateAIBlueprint({
        category: eventType,
        city,
        date,
        guestCount,
        totalBudget: budgetINR,
        venuePreference,
        styleTheme,
        requirements,
      });
      setBlueprint(generated);
      setIsGenerating(false);
      setStep(3); // Blueprint View Step
    }, 700);
  };

  const handleSaveToDashboard = () => {
    if (!blueprint) return;
    if (!requireCustomerForSave()) return;
    addEvent({
      title: `${eventType} in ${city} for ${guestCount} Guests`,
      category: eventType,
      city,
      date,
      guestCount,
      totalBudget: budgetINR,
      venuePreference,
      styleTheme,
      status: "planning",
      blueprint,
    });
    setSavedToDashboard(true);
    setTimeout(() => {
      router.push("/dashboard/workspace");
    }, 600);
  };

  const handleProceedToBookingBlueprint = async () => {
    if (!blueprint) return;
    if (!requireCustomerForSave()) return;
    addEvent({
      title: `${eventType} in ${city} for ${guestCount} Guests`,
      category: eventType,
      city,
      date,
      guestCount,
      totalBudget: budgetINR,
      venuePreference,
      styleTheme,
      status: "planning",
      blueprint,
    });

    try {
      const primaryVenue = blueprint.venueRecommendations[0]?.name || venuePreference || "Selected Palace Venue";
      const venueCostEstimate = Math.round(budgetINR * 0.35); // 35% venue allocation
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: "v-01",
          vendorName: primaryVenue,
          vendorCategory: "Venues & Royal Estates",
          packageName: `${eventType} Royal Palace Booking`,
          eventDate: date,
          eventCity: city,
          guestCount,
          totalAmount: venueCostEstimate,
          advancePercentage: 25,
          requirements: requirements || `Blueprint booking for ${eventType} in ${city}`,
          serviceDetails: {
            styleTheme,
            venuePreference,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.bookingId) {
        router.push(`/checkout?bookingId=${data.bookingId}`);
      } else {
        router.push("/dashboard/workspace");
      }
    } catch {
      router.push("/dashboard/workspace");
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userQuery = chatInput;
    setChatMessages((prev) => [...prev, { role: "user", text: userQuery }]);
    setChatInput("");

    setTimeout(() => {
      let aiReply = "I have analyzed your event parameters. ";
      const lower = userQuery.toLowerCase();
      if (lower.includes("catering") || lower.includes("food") || lower.includes("jain")) {
        aiReply += "For Indian guest counts of this scale, locking 6 live interactive counters with a 70:30 vegetarian-to-global cuisine ratio is optimal. Ensure you specify separate cookware for Jain items.";
      } else if (lower.includes("budget") || lower.includes("cost") || lower.includes("save")) {
        aiReply += "To trim 10-15% without compromising visual grandeur, transition from imported Holland blooms to fragrant regional Rajnigandha and Marigolds, and book local sound engineers instead of flying crews.";
      } else if (lower.includes("alcohol") || lower.includes("sound") || lower.includes("curfew")) {
        aiReply += "Outdoor sound curfews in most Indian states apply at 22:00 (10 PM). Move the dancefloor to the soundproofed indoor banquet hall for the afterparty.";
      } else {
        aiReply += `For your ${eventType} in ${city}, this aligns seamlessly with current luxury celebration standards. I recommend locking the venue advance contract at least 3 months prior.`;
      }
      setChatMessages((prev) => [...prev, { role: "ai", text: aiReply }]);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D7] dark:border-[#344139] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold border border-[#173F35]/20">
              <Bot className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span>Interactive AI Event Planner • Architecture Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              AI Event Blueprint Generator
            </h1>
            <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              Comprehensive planning engine engineered for Indian luxury celebration logistics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAssistantOpen(!assistantOpen)}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#232F28] hover:bg-[#F0EDE5] dark:hover:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Bot className="w-4 h-4 text-[#C6A66B]" />
              <span>{assistantOpen ? "Hide AI Assistant" : "Ask AI Assistant"}</span>
            </button>
          </div>
        </div>

        {/* Wizard Form vs Blueprint View */}
        {step < 3 ? (
          <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-lg space-y-8">
            <div className="flex items-center justify-between border-b border-[#E8E2D7] dark:border-[#344139] pb-4">
              <span className="text-xs uppercase font-bold tracking-wider text-[#C6A66B] dark:text-[#D4B77D]">
                Step {step} of 2: {step === 1 ? "Event Core Parameters" : "Themes & Special Nuances"}
              </span>
              <div className="flex gap-1.5">
                <span className={`w-3 h-1.5 rounded-full ${step >= 1 ? "bg-[#173F35] dark:bg-[#A9C7B2]" : "bg-[#E8E2D7] dark:bg-[#344139]"}`}></span>
                <span className={`w-3 h-1.5 rounded-full ${step >= 2 ? "bg-[#173F35] dark:bg-[#A9C7B2]" : "bg-[#E8E2D7] dark:bg-[#344139]"}`}></span>
                <span className="w-3 h-1.5 rounded-full bg-[#E8E2D7] dark:bg-[#344139]"></span>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-6 text-xs animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Event Type */}
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                      Celebration Category
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as EventCategory)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] cursor-pointer"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination City */}
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                      Destination / City
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] cursor-pointer"
                    >
                      {CITIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    />
                  </div>

                  {/* Guests */}
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                      Expected Guest Count
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      step="25"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    />
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                      Budget in INR
                    </label>
                    <input
                      type="number"
                      min="500000"
                      max="100000000"
                      step="500000"
                      value={budgetINR}
                      onChange={(e) => setBudgetINR(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between">
                  <span className="text-[#77746D] dark:text-[#B5B5AA]">Selected Budget:</span>
                  <span className="text-lg font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
                    {formatINR(budgetINR)}
                  </span>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Next: Themes & Preferences</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 text-xs animate-in fade-in duration-200">
                <div>
                  <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                    Venue Style & Setting
                  </label>
                  <select
                    value={venuePreference}
                    onChange={(e) => setVenuePreference(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] cursor-pointer"
                  >
                    <option value="Heritage Palace & Lakeside Lawn">Heritage Palace & Lakeside Lawn</option>
                    <option value="5-Star Luxury Pillarless Ballroom">5-Star Luxury Pillarless Ballroom</option>
                    <option value="Beachfront Sunset Deck & Lawn">Beachfront Sunset Deck & Lawn</option>
                    <option value="Sprawling Farmhouse Estate">Sprawling Farmhouse Estate</option>
                    <option value="Contemporary Botanical Conservatory">Contemporary Botanical Conservatory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                    Aesthetic Style & Theme
                  </label>
                  <select
                    value={styleTheme}
                    onChange={(e) => setStyleTheme(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] cursor-pointer"
                  >
                    <option value="Royal Mewari Heritage">Royal Mewari Heritage (Crimson & Antique Gold)</option>
                    <option value="Goan Coastal Sunset Chic">Goan Coastal Sunset Chic (Pastel Coral & Macramé)</option>
                    <option value="Enchanted Glasshouse & Fairy Lights">Enchanted Glasshouse & Fairy Lights (Botanical Emerald)</option>
                    <option value="Minimalist High-Impact Tech Gala">Minimalist High-Impact Tech Gala (Obsidian & Cyan)</option>
                    <option value="Bollywood Starry Night Extravaganza">Bollywood Starry Night Extravaganza (Mirrorwork & Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                    Specific Culinary, Ritual, or AV Requirements
                  </label>
                  <textarea
                    rows={4}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="e.g. Separate Jain counters, live Sufi band for Sangeet, drone video permissions..."
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D] dark:placeholder-[#898D84] text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                  ></textarea>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7] hover:bg-[#E7EFEA] border border-[#E8E2D7] dark:border-[#344139] text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateBlueprint}
                    disabled={isGenerating}
                    className="px-8 py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <span>Synthesizing Cultural Blueprint...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#C6A66B]" />
                        <span>Generate Complete Blueprint</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Step 3: Generated Blueprint Display */
          blueprint && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Action Banner */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#173F35] dark:text-[#A9C7B2]">
                      {blueprint.blueprintId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#E7EFEA] text-[#173F35] text-[10px] font-bold">
                      Calculated Successfully
                    </span>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">{blueprint.title}</h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] hover:bg-[#E7EFEA] border border-[#E8E2D7] dark:border-[#344139] text-xs text-[#252522] dark:text-[#F4F0E7] font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recalculate</span>
                  </button>

                  <button
                    onClick={handleSaveToDashboard}
                    disabled={savedToDashboard}
                    className="px-5 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] hover:bg-[#E7EFEA] border border-[#E8E2D7] dark:border-[#344139] text-[#173F35] dark:text-[#A9C7B2] font-bold text-xs tracking-wide transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savedToDashboard ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Saved to Workspace</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Workspace</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleProceedToBookingBlueprint}
                    className="px-5 py-2.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Book Blueprint • Pay Advance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Section 1: Executive Summary & Budget Allocation */}
              <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-6">
                <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Executive Overview & Budget Allocation</span>
                </h3>

                <p className="text-sm text-[#252522] dark:text-[#F4F0E7] leading-relaxed bg-[#FAF8F3] dark:bg-[#1C2520] p-5 rounded-2xl border border-[#E8E2D7] dark:border-[#344139]">
                  {blueprint.executiveSummary}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blueprint.recommendedBudget.breakdown.map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#77746D] dark:text-[#B5B5AA]">{item.category}</span>
                        <span className="text-xs font-bold text-[#173F35] dark:text-[#A9C7B2]">{item.percentage}%</span>
                      </div>
                      <div className="text-lg font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
                        {formatINR(item.amount)}
                      </div>
                      <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] leading-snug">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Venue Recommendations & Decor Theme */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Venues */}
                <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-6">
                  <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#173F35] dark:text-[#A9C7B2]" />
                    <span>Recommended Venue Options</span>
                  </h3>
                  <div className="space-y-4">
                    {blueprint.venueRecommendations.map((v, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-base font-bold text-[#252522] dark:text-[#F4F0E7]">{v.name}</h4>
                          <span className="text-xs font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">{v.estimatedCost}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#77746D] dark:text-[#B5B5AA]">
                          <span>{v.type}</span>
                          <span>•</span>
                          <span>Capacity: {v.capacity}</span>
                        </div>
                        <p className="text-xs text-[#252522] dark:text-[#F4F0E7] pt-1">{v.highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decor & Theme */}
                <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-6">
                  <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#173F35] dark:text-[#A9C7B2]" />
                    <span>Aesthetic Moodboard & Florals</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-3">
                      <span className="text-xs uppercase font-bold text-[#C6A66B] dark:text-[#D4B77D] tracking-wider">
                        Color Swatches
                      </span>
                      <div className="flex items-center gap-3">
                        {blueprint.themeAndAtmosphere.colorPalette.map((col, i) => (
                          <div key={i} className="text-center">
                            <div
                              className="w-10 h-10 rounded-full border border-[#E8E2D7] dark:border-[#344139] shadow-xs mx-auto"
                              style={{ backgroundColor: col.hex }}
                            ></div>
                            <span className="text-[10px] text-[#77746D] dark:text-[#B5B5AA] block mt-1">{col.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-2 text-xs">
                      <span className="text-[#173F35] dark:text-[#A9C7B2] font-bold block">Stage & Mandap Concept</span>
                      <p className="text-[#252522] dark:text-[#F4F0E7] leading-relaxed">
                        {blueprint.decorAndFloral.mandapOrStage}
                      </p>
                      <span className="text-[#173F35] dark:text-[#A9C7B2] font-bold block pt-2">Atmospheric Lighting</span>
                      <p className="text-[#252522] dark:text-[#F4F0E7] leading-relaxed">
                        {blueprint.decorAndFloral.lightingConcept}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Culinary Strategy & Live Counters */}
              <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-6">
                <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Culinary Architecture & Artisanal Stations</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold">
                      Interactive Live Counters
                    </span>
                    <ul className="space-y-2 text-xs text-[#252522] dark:text-[#F4F0E7]">
                      {blueprint.culinaryStrategy.recommendedCounters.map((item, i) => (
                        <li key={i} className="p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-wider text-[#C6A66B] dark:text-[#D4B77D] font-bold">
                      Signature Beverage Concepts
                    </span>
                    <ul className="space-y-2 text-xs text-[#252522] dark:text-[#F4F0E7]">
                      {blueprint.culinaryStrategy.beverageHighlights.map((item, i) => (
                        <li key={i} className="p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#C6A66B] shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 4: Master Run of Show Timeline */}
              <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-6">
                <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Event Day Minute-by-Minute Run of Show</span>
                </h3>
                <div className="space-y-3">
                  {blueprint.runOfShowTimeline.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#E7EFEA] text-[#173F35] border border-[#173F35]/20 text-xs font-mono font-bold whitespace-nowrap">
                          {item.time}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-[#252522] dark:text-[#F4F0E7]">{item.activity}</h4>
                          <span className="text-xs text-[#77746D] dark:text-[#B5B5AA]">{item.location}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-semibold">
                          Lead: {item.responsiblePerson}
                        </span>
                        <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA] mt-1">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Cultural & Logistical Reminders */}
              <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#173F35] dark:text-[#A9C7B2]" />
                  <span>Important Cultural & Regulatory Safeguards</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#252522] dark:text-[#F4F0E7]">
                  {blueprint.culturalAndLogisticalReminders.map((rem, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0 mt-0.5" />
                      <span>{rem}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* AI Concierge Chat Drawer (Docked on Right) */}
        {assistantOpen && (
          <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#232F28] rounded-3xl border border-[#E8E2D7] dark:border-[#344139] shadow-2xl p-4 z-50 flex flex-col h-[520px] animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between border-b border-[#E8E2D7] dark:border-[#344139] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E7EFEA] text-[#173F35] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#252522] dark:text-[#F4F0E7]">Evntora AI Assistant</h4>
                  <span className="text-[10px] text-[#173F35] dark:text-[#A9C7B2] font-semibold">Online • Event Architect</span>
                </div>
              </div>
              <button
                onClick={() => setAssistantOpen(false)}
                className="text-[#77746D] hover:text-[#252522] dark:text-[#B5B5AA] dark:hover:text-[#F4F0E7] text-xs px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl max-w-[85%] ${
                    msg.role === "user"
                      ? "ml-auto bg-[#173F35] text-[#FAF8F3] font-medium"
                      : "mr-auto bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7]"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} className="pt-2 border-t border-[#E8E2D7] dark:border-[#344139] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about sound curfews, catering splits..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D] dark:placeholder-[#898D84] text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F3] dark:bg-[#151B18] text-[#173F35] dark:text-[#A9C7B2] p-12">Loading AI Planner...</div>}>
      <PlannerContent />
    </Suspense>
  );
}
