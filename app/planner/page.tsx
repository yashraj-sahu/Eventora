"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EVENT_CATEGORIES } from "@/data/categories";
import { CITIES } from "@/data/cities";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import { AIEventBlueprint, EventCategory } from "@/types";
import { SearchableMultiSelect, SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { PlannerDatePicker } from "@/components/planner/PlannerDatePicker";
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

function integerFieldError(value: string, label: string, minimum: number, maximum: number) {
  if (!value.trim()) return `Enter ${label}.`;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) return `${label[0].toUpperCase()}${label.slice(1)} must be a positive whole number.`;
  if (number < minimum || number > maximum) return `Enter ${label} from ${minimum.toLocaleString("en-IN")} to ${maximum.toLocaleString("en-IN")}.`;
  return "";
}

function localTodayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function PlannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, hasRole, isLoading: authLoading, rolesError } = useAuth();

  // Initial params from URL query if available
  const initialType = (searchParams.get("type") as EventCategory) || "Weddings";
  const initialCity = searchParams.get("city") || "";
  const initialGuests = searchParams.get("guests") ?? "";
  const initialBudget = searchParams.get("budget") ?? "";

  // Wizard state
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState<EventCategory>(initialType);
  const [city, setCity] = useState(initialCity);
  const [date, setDate] = useState("");
  const [guestCount, setGuestCount] = useState(initialGuests);
  const [budgetINR, setBudgetINR] = useState(initialBudget);
  const [guestCountTouched, setGuestCountTouched] = useState(false);
  const [budgetTouched, setBudgetTouched] = useState(false);
  const [dateRequiredAttempted, setDateRequiredAttempted] = useState(false);
  const [venuePreference, setVenuePreference] = useState("");
  const [styleTheme, setStyleTheme] = useState("");
  const [requirements, setRequirements] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);

  // Generated Blueprint State
  const [blueprint, setBlueprint] = useState<AIEventBlueprint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedToDashboard, setSavedToDashboard] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [plannerError, setPlannerError] = useState("");

  useEffect(() => {
    if (searchParams.get("resume") !== "1") return;
    try {
      const raw = sessionStorage.getItem("evntora-planner-auth-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as { eventType: EventCategory; city: string; date: string; guestCount: number | string; budgetINR: number | string; venuePreference: string; styleTheme: string; requirements: string; preferences?: string[]; blueprint: AIEventBlueprint | null };
      setEventType(draft.eventType); setCity(draft.city); setDate(draft.date); setGuestCount(String(draft.guestCount ?? "")); setBudgetINR(String(draft.budgetINR ?? ""));
      setVenuePreference(draft.venuePreference); setStyleTheme(draft.styleTheme); setRequirements(draft.requirements); setPreferences(draft.preferences ?? []); setBlueprint(draft.blueprint);
      setStep(draft.blueprint ? 3 : 1); sessionStorage.removeItem("evntora-planner-auth-draft");
    } catch { sessionStorage.removeItem("evntora-planner-auth-draft"); }
  }, [searchParams]);

  const requireCustomerForSave = () => {
    if (authLoading) { setPlannerError("Checking your account access. Please try again in a moment."); return false; }
    if (rolesError) { setPlannerError("We could not verify your account access. Refresh the page or try again shortly."); return false; }
    if (user && hasRole("customer")) return true;
    if (user) { setPlannerError("This account does not have Customer access. Use an account with Customer access to plan and save events."); return false; }
    sessionStorage.setItem("evntora-planner-auth-draft", JSON.stringify({ eventType, city, date, guestCount, budgetINR, venuePreference, styleTheme, requirements, preferences, blueprint }));
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
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const id = sessionStorage.getItem("evntora-planner-ai-conversation");
    if (!id) return;
    setConversationId(id);
    void fetch(`/api/ai/chat?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setChatMessages((data.messages ?? []).map((message: { role: "user" | "assistant"; content: string }) => ({ role: message.role === "assistant" ? "ai" : "user", text: message.content })));
    }).catch(() => {});
  }, []);

  const categoryOptions: SelectOption[] = EVENT_CATEGORIES.map((category) => ({ value: category.id, label: category.name }));
  const cityOptions: SelectOption[] = CITIES.map((item) => ({ value: item.name, label: item.name, description: item.state }));
  const preferenceOptions = (eventType.toLowerCase().includes("corporate")
    ? ["Accessibility support", "Hybrid streaming", "Networking time", "Dietary choices", "Sustainability"]
    : ["Accessibility support", "Jain arrangements", "Vegetarian menu", "Elder-friendly schedule", "Children's activities", "Regional rituals", "Sustainability"])
    .map((value) => ({ value, label: value }));

  const guestCountError = integerFieldError(guestCount, "expected guest count", 10, 5000);
  const budgetError = integerFieldError(budgetINR, "budget", 500000, 100000000);
  const budgetPreviewValue = Number(budgetINR);
  const budgetPreview = budgetINR.trim() && Number.isSafeInteger(budgetPreviewValue) && budgetPreviewValue > 0 ? budgetPreviewValue : 0;

  const handleNextStep = () => {
    setPlannerError("");
    setDateRequiredAttempted(true);
    setGuestCountTouched(true);
    setBudgetTouched(true);
    if (!date || date < localTodayIso() || !city.trim() || guestCountError || budgetError) {
      if (!city.trim()) setPlannerError("Enter a destination city to continue.");
      return;
    }
    setStep(2);
  };

  const handleGenerateBlueprint = async (refinement?: string) => {
    setPlannerError("");
    setDateRequiredAttempted(true); setGuestCountTouched(true); setBudgetTouched(true);
    if (!date || date < localTodayIso() || !city.trim() || guestCountError || budgetError) { setPlannerError("Review the highlighted date, guest count, budget, and destination fields."); return; }
    const guestCountNumber = Number(guestCount);
    const budgetNumber = Number(budgetINR);
    if (!requireCustomerForSave()) return;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/blueprint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: eventType, city, date, guestCount: guestCountNumber, totalBudget: budgetNumber, venuePreference, styleTheme, requirements, preferences, ...(refinement ? { refinement, previousBlueprint: blueprint } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The plan could not be generated.");
      setBlueprint(data.blueprint as AIEventBlueprint);
      setSavedToDashboard(false);
      setStep(3);
    } catch (error) { setPlannerError(error instanceof Error ? error.message : "The plan could not be generated."); }
    finally { setIsGenerating(false); }
  };

  const persistBlueprint = async () => {
    if (!blueprint) return;
    if (!requireCustomerForSave()) return null;
    setPlannerError("");
    try {
      const response = await fetch("/api/ai/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: savedEventId ?? undefined, title: `${eventType} in ${city} for ${Number(guestCount)} Guests`, category: eventType, city, date, guestCount: Number(guestCount), totalBudget: Number(budgetINR), venuePreference, styleTheme, requirements: [requirements, preferences.length ? `Additional preferences: ${preferences.join(", ")}` : ""].filter(Boolean).join("\n"), blueprint }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The event plan could not be saved.");
      setSavedEventId(data.eventId); setSavedToDashboard(true); return data.eventId as string;
    } catch (error) { setPlannerError(error instanceof Error ? error.message : "The event plan could not be saved."); return null; }
  };

  const handleSaveToDashboard = async () => { const eventId = await persistBlueprint(); if (eventId) router.push(`/dashboard/workspace?eventId=${encodeURIComponent(eventId)}`); };

  const handleProceedToMarketplace = async () => {
    if (!blueprint) return;
    if (!requireCustomerForSave()) return;
    if (await persistBlueprint()) router.push("/vendors?city=" + encodeURIComponent(city));
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatBusy) return;
    if (!requireCustomerForSave()) return;
    const userQuery = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userQuery }]);
    setChatInput("");
    setChatBusy(true); setChatError("");
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userQuery, eventId: savedEventId ?? undefined, conversationId: conversationId ?? undefined, ...(blueprint ? { plannerContext: { category: eventType, city, date, guestCount: Number(guestCount), totalBudget: Number(budgetINR), venuePreference, styleTheme, requirements: [requirements, preferences.length ? `Additional preferences: ${preferences.join(", ")}` : ""].filter(Boolean).join("\n"), blueprint } } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assistant could not respond.");
      setConversationId(data.conversationId); sessionStorage.setItem("evntora-planner-ai-conversation", data.conversationId); if (data.blueprint) { setBlueprint(data.blueprint as AIEventBlueprint); setSavedToDashboard(false); }
      setChatMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch (error) { setChatError(error instanceof Error ? error.message : "The assistant is temporarily unavailable."); }
    finally { setChatBusy(false); }
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

        {plannerError && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">{plannerError}</div>}

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
                  <SearchableSelect label="Celebration Category" value={eventType} options={categoryOptions} onChange={(value) => setEventType(value as EventCategory)} allowCustom customLabel="Use category" />

                  {/* Destination City */}
                  <SearchableSelect label="Destination / City" value={city} options={cityOptions} onChange={setCity} allowCustom customLabel="Use city" placeholder="Search or enter a city" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date */}
                  <PlannerDatePicker value={date} onChange={setDate} requiredAttempted={dateRequiredAttempted} />

                  {/* Guests */}
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                      Expected Guest Count
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      step="1"
                      value={guestCount}
                      placeholder="Enter expected guest count"
                      onChange={(e) => { setGuestCount(e.target.value); setGuestCountTouched(true); }}
                      onBlur={() => setGuestCountTouched(true)}
                      aria-invalid={guestCountTouched && Boolean(guestCountError)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    />
                    {guestCountTouched && guestCountError && <p role="alert" className="mt-1.5 text-[11px] text-red-700 dark:text-red-300">{guestCountError}</p>}
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
                      step="1"
                      value={budgetINR}
                      placeholder="Enter your budget in INR"
                      onChange={(e) => { setBudgetINR(e.target.value); setBudgetTouched(true); }}
                      onBlur={() => setBudgetTouched(true)}
                      aria-invalid={budgetTouched && Boolean(budgetError)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] font-medium text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    />
                    {budgetTouched && budgetError && <p role="alert" className="mt-1.5 text-[11px] text-red-700 dark:text-red-300">{budgetError}</p>}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] flex items-center justify-between">
                  <span className="text-[#77746D] dark:text-[#B5B5AA]">Selected Budget:</span>
                  <span className="text-lg font-serif font-bold text-[#173F35] dark:text-[#A9C7B2]">
                    {formatINR(budgetPreview)}
                  </span>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleNextStep}
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
                  {/* <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                    Venue Style & Setting
                  </label> */}
                  <SearchableSelect label="Venue Style & Setting" value={venuePreference} options={["Heritage palace or lakeside lawn", "Luxury hotel ballroom", "Beachfront venue", "Farmhouse estate", "Botanical conservatory", "Community or cultural venue"].map((value) => ({ value, label: value }))} onChange={setVenuePreference} allowCustom customLabel="Use setting" placeholder="Choose or describe a setting" />
                </div>

                <div>
                  {/* <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
                    Aesthetic Style & Theme
                  </label> */}
                  <SearchableSelect label="Aesthetic Style & Theme" value={styleTheme} options={["Royal heritage", "Coastal sunset", "Botanical garden", "Minimalist modern", "Bollywood inspired", "Traditional regional"].map((value) => ({ value, label: value }))} onChange={setStyleTheme} allowCustom customLabel="Use theme" placeholder="Choose or enter your theme" />
                </div>

                <SearchableMultiSelect label="Additional planning preferences" value={preferences} options={preferenceOptions} onChange={setPreferences} allowCustom placeholder="Select any that apply or add your own" />

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
                    onClick={() => void handleGenerateBlueprint()}
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
                      AI Generated
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
                    onClick={handleProceedToMarketplace}
                    className="px-5 py-2.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Explore Vendors</span>
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
                  <p className="text-[11px] text-[#77746D] dark:text-[#B5B5AA]">AI planning estimates and venue formats only. They are not Evntora listings, quotes, or availability. Explore published vendors separately before requesting a booking.</p>
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
                  <span className="text-[10px] text-[#173F35] dark:text-[#A9C7B2] font-semibold">Event planning assistant</span>
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
              {chatBusy && <div role="status" className="mr-auto p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] text-[#77746D]">Thinking…</div>}
            </div>

            {chatError && <p role="alert" className="text-xs text-red-700 dark:text-red-300 py-1">{chatError}</p>}

            <form onSubmit={handleSendChatMessage} className="pt-2 border-t border-[#E8E2D7] dark:border-[#344139] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatBusy}
                placeholder={blueprint ? "Ask a question or request a plan change…" : "Ask about your event…"}
                className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D] dark:placeholder-[#898D84] text-xs focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
              />
              <button
                type="submit"
                disabled={chatBusy || !chatInput.trim()}
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
