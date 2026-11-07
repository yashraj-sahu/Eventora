// "use client";

// import { useState, useEffect, Suspense, useRef } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Navbar } from "@/components/layout/Navbar";
// import { Footer } from "@/components/layout/Footer";
// import { EVENT_CATEGORIES } from "@/data/categories";
// import { CITIES } from "@/data/cities";
// import { useAuth } from "@/lib/auth-context";
// import { formatINR } from "@/lib/utils";
// import { AIEventBlueprint, EventCategory } from "@/types";
// import type { AIFeasibilityAssessment } from "@/lib/ai-schemas";
// import { SearchableMultiSelect, SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
// import { PlannerDatePicker } from "@/components/planner/PlannerDatePicker";
// import {
//   Sparkles,
//   MapPin,
//   Coins,
//   Palette,
//   Clock,
//   Utensils,
//   CheckCircle2,
//   ArrowRight,
//   RotateCcw,
//   Save,
//   Check,
//   ShieldCheck,
//   Users,
// } from "lucide-react";

// function integerFieldError(value: string, label: string, minimum: number, maximum: number) {
//   if (!value.trim()) return `Enter ${label}.`;
//   const number = Number(value);
//   if (!Number.isSafeInteger(number) || number <= 0) return `${label[0].toUpperCase()}${label.slice(1)} must be a positive whole number.`;
//   if (number < minimum || number > maximum) return `Enter ${label} from ${minimum.toLocaleString("en-IN")} to ${maximum.toLocaleString("en-IN")}.`;
//   return "";
// }

// function localTodayIso() {
//   const now = new Date();
//   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
// }

// function PlannerContent() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const { user, hasRole, isLoading: authLoading, rolesError } = useAuth();
//   const customerSession = Boolean(user && hasRole("customer"));

//   // Initial params from URL query if available
//   // const rawType = searchParams.get("type");
//   // const matchedCategory = rawType
//   //   ? EVENT_CATEGORIES.find(
//   //       (c) =>
//   //         c.id.toLowerCase() === rawType.toLowerCase() ||
//   //         c.name.toLowerCase() === rawType.toLowerCase()
//   //     )
//   //   : null;
//   // const initialType = rawType ? (matchedCategory ? matchedCategory.name : rawType) : "Weddings & Royal Celebrations";

//   // const initialCity = searchParams.get("city") || "";
//   // const initialGuests = (searchParams.get("guests") ?? "").replace(/[^\d]/g, "");
//   // const initialBudget = (searchParams.get("budget") ?? "").replace(/[^\d]/g, "");

//   // All planner fields start empty by default
//   const initialType = "";
//   const initialCity = "";
//   const initialGuests = "";
//   const initialBudget = "";

//   // Wizard state
//   const [step, setStep] = useState(1);
//   const [eventType, setEventType] = useState<string>(initialType);
//   const [city, setCity] = useState(initialCity);
//   const [date, setDate] = useState("");
//   const [guestCount, setGuestCount] = useState(initialGuests);
//   const [budgetINR, setBudgetINR] = useState(initialBudget);
//   const [guestCountTouched, setGuestCountTouched] = useState(false);
//   const [budgetTouched, setBudgetTouched] = useState(false);
//   const [budgetFocused, setBudgetFocused] = useState(false);
//   const [dateRequiredAttempted, setDateRequiredAttempted] = useState(false);
//   const [venuePreference, setVenuePreference] = useState("");
//   const [styleTheme, setStyleTheme] = useState("");
//   const [requirements, setRequirements] = useState("");
//   const [preferences, setPreferences] = useState<string[]>([]);

//   // Generated Blueprint State
//   const [blueprint, setBlueprint] = useState<AIEventBlueprint | null>(null);
//   const [feasibility, setFeasibility] = useState<AIFeasibilityAssessment | null>(null);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [savedToDashboard, setSavedToDashboard] = useState(false);
//   const [savedEventId, setSavedEventId] = useState<string | null>(null);
//   const [plannerError, setPlannerError] = useState("");
//   const [saveAuthModalOpen, setSaveAuthModalOpen] = useState(false);
//   const [saveAfterResume, setSaveAfterResume] = useState(false);
//   const resumeSaveStarted = useRef(false);

//   useEffect(() => {
//     if (searchParams.get("resume") !== "1") return;
//     try {
//       const raw = sessionStorage.getItem("evntora-planner-auth-draft");
//       if (!raw) return;
//       const draft = JSON.parse(raw) as {
//         eventType: string;
//         city: string;
//         date: string;
//         guestCount: number | string;
//         budgetINR: number | string;
//         venuePreference: string;
//         styleTheme: string;
//         requirements: string;
//         preferences?: string[];
//         blueprint: AIEventBlueprint | null;
//         savedEventId?: string | null;
//       };
//       setEventType(draft.eventType);
//       setCity(draft.city);
//       setDate(draft.date);
//       setGuestCount(String(draft.guestCount ?? ""));
//       setBudgetINR(String(draft.budgetINR ?? ""));
//       setVenuePreference(draft.venuePreference);
//       setStyleTheme(draft.styleTheme);
//       setRequirements(draft.requirements);
//       setPreferences(draft.preferences ?? []);
//       setBlueprint(draft.blueprint);
//       setSavedEventId(draft.savedEventId ?? null);
//       setStep(draft.blueprint ? 3 : 1);
//       if (searchParams.get("save") === "1" && draft.blueprint) setSaveAfterResume(true);
//       else sessionStorage.removeItem("evntora-planner-auth-draft");
//     } catch {
//       sessionStorage.removeItem("evntora-planner-auth-draft");
//     }
//   }, [searchParams]);

//   const isCustomerReadyForSave = () => {
//     if (authLoading) {
//       setPlannerError("Checking your account access. Please try again in a moment.");
//       return false;
//     }
//     if (rolesError) {
//       setPlannerError("We could not verify your account access. Refresh the page or try again shortly.");
//       return false;
//     }
//     if (user && hasRole("customer")) return true;
//     if (user) {
//       setPlannerError("This account does not have Customer access. Use an account with Customer access to plan and save events.");
//       return false;
//     }
//     return false;
//   };

//   const saveDraftForAuthentication = () => {
//     sessionStorage.setItem(
//       "evntora-planner-auth-draft",
//       JSON.stringify({
//         eventType,
//         city,
//         date,
//         guestCount,
//         budgetINR,
//         venuePreference,
//         styleTheme,
//         requirements,
//         preferences,
//         blueprint,
//         savedEventId,
//       })
//     );
//     return `/signin?portal=customer&redirectTo=${encodeURIComponent("/planner?resume=1&save=1")}`;
//   };

//   const categoryOptions: SelectOption[] = EVENT_CATEGORIES.map((category) => ({
//     value: category.name,
//     label: category.name,
//   }));
//   const cityOptions: SelectOption[] = CITIES.map((item) => ({
//     value: item.name,
//     label: item.name,
//     description: item.state,
//   }));
//   const preferenceOptions = (eventType.toLowerCase().includes("corporate")
//     ? ["Accessibility support", "Hybrid streaming", "Networking time", "Dietary choices", "Sustainability"]
//     : ["Accessibility support", "Jain arrangements", "Vegetarian menu", "Elder-friendly schedule", "Children's activities", "Regional rituals", "Sustainability"]
//   ).map((value) => ({ value, label: value }));

//   const guestCountError = integerFieldError(guestCount, "expected guest count", 1, 5000);
//   const budgetError = integerFieldError(budgetINR, "budget", 1, 100000000);

//   const handleNextStep = () => {
//     setPlannerError("");
//     setDateRequiredAttempted(true);
//     setGuestCountTouched(true);
//     setBudgetTouched(true);
//     if (!date || date < localTodayIso() || !city.trim() || guestCountError || budgetError) {
//       if (!city.trim()) setPlannerError("Enter a destination city to continue.");
//       return;
//     }
//     setStep(2);
//   };

//   const handleGenerateBlueprint = async (refinement?: string, confirmLimitations = false) => {
//     setPlannerError("");
//     setDateRequiredAttempted(true);
//     setGuestCountTouched(true);
//     setBudgetTouched(true);
//     if (!date || date < localTodayIso() || !city.trim() || guestCountError || budgetError) {
//       setPlannerError("Review the highlighted date, guest count, budget, and destination fields.");
//       return;
//     }
//     const guestCountNumber = Number(guestCount);
//     const budgetNumber = Number(budgetINR);
//     setIsGenerating(true);
//     try {
//       const response = await fetch("/api/ai/blueprint", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           category: eventType,
//           city: city.trim(),
//           date,
//           guestCount: guestCountNumber,
//           totalBudget: budgetNumber,
//           venuePreference,
//           styleTheme,
//           requirements,
//           preferences,
//           confirmLimitations,
//           ...(refinement ? { refinement, previousBlueprint: blueprint } : {}),
//         }),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "The plan could not be generated.");
//       setFeasibility(data.feasibility ?? null);
//       if (!data.blueprint || (data.feasibility?.status !== "feasible" && !(data.feasibility?.status === "partially_feasible" && confirmLimitations))) {
//         setBlueprint(null);
//         setStep(2);
//         return;
//       }
//       setBlueprint(data.blueprint as AIEventBlueprint);
//       setSavedToDashboard(false);
//       setStep(3);
//     } catch (error) {
//       setPlannerError(error instanceof Error ? error.message : "The plan could not be generated.");
//     } finally {
//       setIsGenerating(false);
//     }
//   };

//   const persistBlueprint = async () => {
//     if (!blueprint) return;
//     if (!isCustomerReadyForSave()) return null;
//     setPlannerError("");
//     try {
//       const response = await fetch("/api/ai/events", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           eventId: savedEventId ?? undefined,
//           title: `${eventType} in ${city} for ${Number(guestCount)} Guests`,
//           category: eventType,
//           city: city.trim(),
//           date,
//           guestCount: Number(guestCount),
//           totalBudget: Number(budgetINR),
//           venuePreference,
//           styleTheme,
//           requirements: [requirements, preferences.length ? `Additional preferences: ${preferences.join(", ")}` : ""]
//             .filter(Boolean)
//             .join("\n"),
//           blueprint,
//         }),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "The event plan could not be saved.");
//       setSavedEventId(data.eventId);
//       setSavedToDashboard(true);
//       return data.eventId as string;
//     } catch (error) {
//       setPlannerError(error instanceof Error ? error.message : "The event plan could not be saved.");
//       return null;
//     }
//   };

//   const handleSaveToDashboard = async () => {
//     if (!user && !authLoading) {
//       setSaveAuthModalOpen(true);
//       return;
//     }
//     if (!isCustomerReadyForSave()) return;
//     const eventId = await persistBlueprint();
//     if (eventId) router.push(`/dashboard/workspace?eventId=${encodeURIComponent(eventId)}`);
//   };

//   const handleProceedToMarketplace = async () => {
//     if (!blueprint) return;
//     if (customerSession && !(await persistBlueprint())) return;
//     router.push("/vendors?city=" + encodeURIComponent(city));
//   };

//   useEffect(() => {
//     if (!saveAfterResume || authLoading || resumeSaveStarted.current) return;
//     if (!user) {
//       setSaveAfterResume(false);
//       setSaveAuthModalOpen(true);
//       return;
//     }
//     if (rolesError) {
//       setPlannerError("We could not verify your account access. Your generated plan is still preserved; please refresh and try again.");
//       setSaveAfterResume(false);
//       return;
//     }
//     if (!hasRole("customer")) {
//       setPlannerError("This account does not have Customer access. Your generated plan is preserved; sign in with Customer access to save it.");
//       setSaveAfterResume(false);
//       return;
//     }
//     resumeSaveStarted.current = true;
//     void (async () => {
//       const eventId = await persistBlueprint();
//       if (eventId) {
//         sessionStorage.removeItem("evntora-planner-auth-draft");
//         setSaveAfterResume(false);
//         router.replace(`/dashboard/workspace?eventId=${encodeURIComponent(eventId)}`);
//       } else {
//         resumeSaveStarted.current = false;
//         setSaveAfterResume(false);
//       }
//     })();
//   }, [saveAfterResume, authLoading, user, rolesError, hasRole, blueprint, router]);

//   return (
//     <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] transition-colors duration-200">
//       <Navbar />

//       <main className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-12">
//         {/* Header — clean, refined, badge & duplicate ask AI button removed */}
//         <div className="border-b border-[#EAD2B0] dark:border-[#4D3331] pb-6 space-y-2">
//           <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
//             <span className="w-6 h-[1px] bg-[#B77A36]" />
//             <span>AI Event Architecture</span>
//           </div>
//           <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
//             AI Event Blueprint Generator
//           </h1>
//           <p className="text-xs sm:text-sm text-[#59453E] dark:text-[#D4C3B7] max-w-2xl leading-relaxed">
//             Comprehensive planning engine engineered for Indian celebration logistics, cultural rituals, budget calibration, and verified vendor matching.
//           </p>
//         </div>

//         {plannerError && (
//           <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/30 px-5 py-3.5 text-xs text-red-800 dark:text-red-200">
//             {plannerError}
//           </div>
//         )}

//         {feasibility && !blueprint && (
//           <section aria-live="polite" className={`max-w-4xl mx-auto rounded-3xl border p-6 sm:p-8 space-y-5 ${feasibility.status === "not_feasible" ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-[#EAD2B0] bg-[#FFF3E3] dark:bg-[#2E1F1E]"}`}>
//             <div>
//               <p className="text-xs uppercase tracking-wider font-bold text-[#B77A36]">Feasibility assessment · {feasibility.confidence} confidence</p>
//               <h2 className="mt-2 text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">{feasibility.status === "partially_feasible" ? "This plan needs adjustments" : "This event is not feasible as described"}</h2>
//               <p className="mt-2 text-sm leading-relaxed text-[#59453E] dark:text-[#D4C3B7]">{feasibility.summary}</p>
//             </div>
//             <div className="rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331] p-4 text-sm text-[#59453E] dark:text-[#D4C3B7]">
//               <strong>Budget estimate range: </strong>{formatINR(feasibility.budgetAssessment.estimatedBudgetRange.low)}–{formatINR(feasibility.budgetAssessment.estimatedBudgetRange.high)}
//               <p className="mt-2">{feasibility.budgetAssessment.explanation}</p>
//               <p className="mt-2 text-xs">Your submitted budget: {formatINR(feasibility.budgetAssessment.proposedBudget)} · {formatINR(feasibility.budgetAssessment.budgetPerGuest)} per guest</p>
//             </div>
//             {feasibility.issues.length > 0 && <div><h3 className="font-semibold text-sm">Considerations</h3><ul className="mt-2 list-disc pl-5 space-y-1 text-sm">{feasibility.issues.map((issue, i) => <li key={i}><strong>{issue.category} ({issue.severity}):</strong> {issue.explanation}</li>)}</ul></div>}
//             {feasibility.suggestedAdjustments.length > 0 && <div><h3 className="font-semibold text-sm">Suggested adjustments</h3><ul className="mt-2 space-y-2 text-sm">{feasibility.suggestedAdjustments.map((item, i) => <li key={i}><strong>{item.title}:</strong> {item.description}</li>)}</ul></div>}
//             {feasibility.assumptions.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-semibold">Planning assumptions</summary><ul className="mt-2 list-disc pl-5">{feasibility.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
//             <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">All figures are planning estimates, not vendor quotes or confirmed availability. Revise your details and submit again for a fresh assessment.</p>
//             <div className="flex flex-wrap gap-3">
//               <button type="button" onClick={() => { setFeasibility(null); setStep(1); }} className="px-5 py-3 rounded-xl bg-[#681B1D] text-[#FFF3E3] font-semibold text-sm">Revise event details</button>
//               {feasibility.status === "partially_feasible" && feasibility.issues.every((issue) => issue.severity !== "critical") && (
//                 <button type="button" disabled={isGenerating} onClick={() => void handleGenerateBlueprint(undefined, true)} className="px-5 py-3 rounded-xl border border-[#B77A36] text-[#681B1D] dark:text-[#EAD2B0] font-semibold text-sm disabled:opacity-50">
//                   {isGenerating ? "Reassessing…" : "I understand these limitations — reassess and continue"}
//                 </button>
//               )}
//             </div>
//           </section>
//         )}

//         {/* Wizard Form vs Blueprint View */}
//         {step < 3 ? (
//           <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl space-y-8">
//             <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-4">
//               <span className="text-xs uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0]">
//                 Step {step} of 2: {step === 1 ? "Event Core Parameters" : "Themes & Special Nuances"}
//               </span>
//               <div className="flex gap-1.5">
//                 <span className={`w-4 h-1.5 rounded-full ${step >= 1 ? "bg-[#681B1D] dark:bg-[#EAD2B0]" : "bg-[#EAD2B0] dark:bg-[#4D3331]"}`} />
//                 <span className={`w-4 h-1.5 rounded-defaultValuefull ${step >= 2 ? "bg-[#681B1D] dark:bg-[#EAD2B0]" : "bg-[#EAD2B0] dark:bg-[#4D3331]"}`} />
//               </div>
//             </div>

//             {step === 1 && (
//               <div className="space-y-6 text-xs animate-in fade-in duration-200">
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   {/* Event Type / Celebration Category */}
//                   <div>
//                     <SearchableSelect
//                       label="Celebration Category"
//                       value={eventType}
//                       options={categoryOptions}
//                       onChange={setEventType}
//                       allowCustom
//                       customLabel="Use custom category"
//                     />
//                   </div>

//                   {/* Destination City */}
//                   <div>
//                     <SearchableSelect
//                       label="Destination / City"
//                       value={city}
//                       options={cityOptions}
//                       onChange={setCity}
//                       allowCustom
//                       customLabel="Use custom city"
//                       placeholder="Search or enter a destination"
//                     />
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                   {/* Date */}
//                   <PlannerDatePicker value={date} onChange={setDate} requiredAttempted={dateRequiredAttempted} />

//                   {/* Guests Input with presets */}
//                   <div>
//                     <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-bold uppercase tracking-wider text-[10px]">
//                       Expected Guest Count
//                     </label>
//                     <input
//                       type="number"
//                       min="10"
//                       max="5000"
//                       step="1"
//                       value={guestCount}
//                       placeholder="e.g. 350"
//                       onChange={(e) => {
//                         setGuestCount(e.target.value);
//                         setGuestCountTouched(true);
//                       }}
//                       onBlur={() => setGuestCountTouched(true)}
//                       aria-invalid={guestCountTouched && Boolean(guestCountError)}
//                       className="w-full px-4 py-3 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-medium text-xs focus:outline-none focus:border-[#B77A36]"
//                     />
//                     <div className="flex flex-wrap gap-1 mt-1.5">
//                       {["50", "150", "350", "600", "1000"].map((preset) => (
//                         <button
//                           key={preset}
//                           type="button"
//                           onClick={() => {
//                             setGuestCount(preset);
//                             setGuestCountTouched(true);
//                           }}
//                           className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${guestCount === preset
//                             ? "bg-[#681B1D] text-[#FFF3E3] border-[#681B1D]"
//                             : "bg-[#FFFCF6]/60 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] hover:border-[#B77A36]"
//                             }`}
//                         >
//                           {preset}
//                         </button>
//                       ))}
//                     </div>
//                     {guestCountTouched && guestCountError && (
//                       <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-300">
//                         {guestCountError}
//                       </p>
//                     )}
//                   </div>

//                   {/* Budget Input with presets */}
//                   <div>
//                     <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-bold uppercase tracking-wider text-[10px]">
//                       Target Budget (INR)
//                     </label>
//                     <input
//                       type="text"
//                       inputMode="numeric"
//                       value={budgetFocused || !budgetINR ? budgetINR : formatINR(Number(budgetINR))}
//                       placeholder="e.g. ₹45,00,000"
//                       onFocus={() => setBudgetFocused(true)}
//                       onChange={(e) => {
//                         setBudgetINR(e.target.value.replace(/[^\d]/g, ""));
//                         setBudgetTouched(true);
//                       }}
//                       onBlur={() => {
//                         setBudgetFocused(false);
//                         setBudgetTouched(true);
//                       }}
//                       aria-invalid={budgetTouched && Boolean(budgetError)}
//                       className="w-full px-4 py-3 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-medium text-xs focus:outline-none focus:border-[#B77A36]"
//                     />
//                     <div className="flex flex-wrap gap-1 mt-1.5">
//                       {[
//                         { label: "₹10L", val: "1000000" },
//                         { label: "₹25L", val: "2500000" },
//                         { label: "₹45L", val: "4500000" },
//                         { label: "₹85L", val: "8500000" },
//                         { label: "₹1.5Cr", val: "15000000" },
//                       ].map((preset) => (
//                         <button
//                           key={preset.val}
//                           type="button"
//                           onClick={() => {
//                             setBudgetINR(preset.val);
//                             setBudgetTouched(true);
//                           }}
//                           className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${budgetINR === preset.val
//                             ? "bg-[#681B1D] text-[#FFF3E3] border-[#681B1D]"
//                             : "bg-[#FFFCF6]/60 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] hover:border-[#B77A36]"
//                             }`}
//                         >
//                           {preset.label}
//                         </button>
//                       ))}
//                     </div>
//                     {budgetTouched && budgetError && (
//                       <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-300">
//                         {budgetError}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 {/* Redundant Selected Budget box has been removed */}

//                 <div className="flex justify-end pt-4">
//                   <button
//                     type="button"
//                     onClick={handleNextStep}
//                     className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md border border-[#B77A36]/50"
//                   >
//                     <span>Next: Themes & Preferences</span>
//                     <ArrowRight className="w-4 h-4 text-[#EAD2B0]" />
//                   </button>
//                 </div>
//               </div>
//             )}

//             {step === 2 && (
//               <div className="space-y-6 text-xs animate-in fade-in duration-200">
//                 <div>
//                   <SearchableSelect
//                     label="Venue Style & Setting"
//                     value={venuePreference}
//                     options={[
//                       "Heritage palace or lakeside lawn",
//                       "Luxury hotel ballroom",
//                       "Beachfront venue",
//                       "Farmhouse estate",
//                       "Botanical conservatory",
//                       "Community or cultural venue",
//                     ].map((value) => ({ value, label: value }))}
//                     onChange={setVenuePreference}
//                     allowCustom
//                     customLabel="Use setting"
//                     placeholder="Choose or describe a setting"
//                   />
//                 </div>

//                 <div>
//                   <SearchableSelect
//                     label="Aesthetic Style & Theme"
//                     value={styleTheme}
//                     options={[
//                       "Royal heritage",
//                       "Coastal sunset",
//                       "Botanical garden",
//                       "Minimalist modern",
//                       "Bollywood inspired",
//                       "Traditional regional",
//                     ].map((value) => ({ value, label: value }))}
//                     onChange={setStyleTheme}
//                     allowCustom
//                     customLabel="Use theme"
//                     placeholder="Choose or enter your theme"
//                   />
//                 </div>

//                 <SearchableMultiSelect
//                   label="Additional planning preferences"
//                   value={preferences}
//                   options={preferenceOptions}
//                   onChange={setPreferences}
//                   allowCustom
//                   placeholder="Select any that apply or add your own"
//                 />

//                 <div>
//                   <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-bold uppercase tracking-wider text-[10px]">
//                     Specific Culinary, Ritual, or AV Requirements
//                   </label>
//                   <textarea
//                     rows={4}
//                     value={requirements}
//                     onChange={(e) => setRequirements(e.target.value)}
//                     placeholder="e.g. Separate Jain counters, live Sufi band for Sangeet, drone video permissions..."
//                     className="w-full px-4 py-3 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#9E897F] text-xs focus:outline-none focus:border-[#B77A36]"
//                   />
//                 </div>

//                 <div className="flex items-center justify-between pt-4">
//                   <button
//                     type="button"
//                     onClick={() => setStep(1)}
//                     className="px-5 py-2.5 rounded-full bg-[#FFFCF6] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#FAF3E8] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold cursor-pointer shadow-xs"
//                   >
//                     Back
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => void handleGenerateBlueprint()}
//                     disabled={isGenerating}
//                     className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-[#B77A36]/50"
//                   >
//                     {isGenerating ? (
//                       <span>Synthesizing Cultural Blueprint...</span>
//                     ) : (
//                       <>
//                         <Sparkles className="w-4 h-4 text-[#EAD2B0]" />
//                         <span>Generate Complete Blueprint</span>
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         ) : (
//           /* Step 3: Generated Blueprint Display */
//           blueprint && (
//             <div className="space-y-8 animate-in fade-in duration-300">
//               {/* Action Banner */}
//               <div className="p-6 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                 <div className="space-y-1">
//                   <div className="flex items-center gap-2">
//                     <span className="text-xs font-mono font-bold text-[#681B1D] dark:text-[#EAD2B0]">
//                       {blueprint.blueprintId}
//                     </span>
//                     <span className="px-2.5 py-0.5 rounded-full bg-[#EAD2B0]/60 dark:bg-[#681B1D]/60 text-[#681B1D] dark:text-[#EAD2B0] text-[10px] font-bold uppercase tracking-wider">
//                       Feasibility: {feasibility?.status ?? "feasible"}
//                     </span>
//                   </div>
//                   <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
//                     {blueprint.title}
//                   </h2>
//                   {feasibility && <p className="max-w-2xl text-xs text-[#59453E] dark:text-[#D4C3B7]">{feasibility.summary} Confidence: {feasibility.confidence}. Estimates are not quotes.</p>}
//                 </div>

//                 <div className="flex items-center gap-3">
//                   <button
//                     onClick={() => setStep(1)}
//                     className="px-4 py-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#1A1211] hover:bg-[#FAF3E8] border border-[#EAD2B0] dark:border-[#4D3331] text-xs text-[#30221D] dark:text-[#FFF3E3] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
//                   >
//                     <RotateCcw className="w-3.5 h-3.5 text-[#B77A36]" />
//                     <span>Recalculate</span>
//                   </button>

//                   <button
//                     onClick={handleSaveToDashboard}
//                     disabled={savedToDashboard}
//                     className="px-5 py-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#1A1211] hover:bg-[#FAF3E8] border border-[#EAD2B0] dark:border-[#4D3331] text-[#681B1D] dark:text-[#EAD2B0] font-bold text-xs tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
//                   >
//                     {savedToDashboard ? (
//                       <>
//                         <Check className="w-4 h-4 text-rose-800" />
//                         <span>Saved to Workspace</span>
//                       </>
//                     ) : (
//                       <>
//                         <Save className="w-4 h-4 text-[#B77A36]" />
//                         <span>Save Workspace</span>
//                       </>
//                     )}
//                   </button>

//                   <button
//                     onClick={handleProceedToMarketplace}
//                     className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all border border-[#B77A36]/40"
//                   >
//                     <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0]" />
//                     <span>Explore Vendors</span>
//                     <ArrowRight className="w-3.5 h-3.5" />
//                   </button>
//                 </div>
//               </div>

//               {/* Section 1: Executive Summary & Budget Allocation */}
//               <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
//                 <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
//                   <Coins className="w-5 h-5 text-[#B77A36]" />
//                   <span>Executive Overview & Budget Allocation</span>
//                 </h3>

//                 <p className="text-sm text-[#59453E] dark:text-[#D4C3B7] leading-relaxed bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 p-5 rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331]">
//                   {blueprint.executiveSummary}
//                 </p>

//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                   {blueprint.recommendedBudget.breakdown.map((item, i) => (
//                     <div key={i} className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
//                       <div className="flex items-center justify-between">
//                         <span className="text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">{item.category}</span>
//                         <span className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0]">{item.percentage}%</span>
//                       </div>
//                       <div className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
//                         {formatINR(item.amount)}
//                       </div>
//                       <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-snug">{item.description}</p>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Section 2: Venue Recommendations & Decor Theme */}
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                 {/* Venues */}
//                 <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
//                   <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
//                     <MapPin className="w-5 h-5 text-[#B77A36]" />
//                     <span>Recommended Venue Options</span>
//                   </h3>
//                   <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7]">
//                     AI planning estimates and venue formats only. They are not Evntora listings, quotes, or availability. Explore published vendors separately before requesting a booking.
//                   </p>
//                   <div className="space-y-4">
//                     {blueprint.venueRecommendations.map((v, i) => (
//                       <div key={i} className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
//                         <div className="flex items-start justify-between">
//                           <h4 className="text-base font-bold text-[#30221D] dark:text-[#FFF3E3]">{v.name}</h4>
//                           <span className="text-xs font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">{v.estimatedCost}</span>
//                         </div>
//                         <div className="flex items-center gap-3 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
//                           <span>{v.type}</span>
//                           <span>•</span>
//                           <span>Capacity: {v.capacity}</span>
//                         </div>
//                         <p className="text-xs text-[#59453E] dark:text-[#D4C3B7] pt-1">{v.highlight}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Decor & Theme */}
//                 <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
//                   <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
//                     <Palette className="w-5 h-5 text-[#B77A36]" />
//                     <span>Aesthetic Moodboard & Florals</span>
//                   </h3>
//                   <div className="space-y-4">
//                     <div className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
//                       <span className="text-xs uppercase font-bold text-[#B77A36] dark:text-[#EAD2B0] tracking-wider">
//                         Color Swatches
//                       </span>
//                       <div className="flex items-center gap-3">
//                         {blueprint.themeAndAtmosphere.colorPalette.map((col, i) => (
//                           <div key={i} className="text-center">
//                             <div
//                               className="w-10 h-10 rounded-full border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs mx-auto"
//                               style={{ backgroundColor: col.hex }}
//                             />
//                             <span className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7] block mt-1">{col.name}</span>
//                           </div>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 text-xs">
//                       <span className="text-[#681B1D] dark:text-[#EAD2B0] font-bold block">Stage & Mandap Concept</span>
//                       <p className="text-[#59453E] dark:text-[#D4C3B7] leading-relaxed">
//                         {blueprint.decorAndFloral.mandapOrStage}
//                       </p>
//                       <span className="text-[#681B1D] dark:text-[#EAD2B0] font-bold block pt-2">Atmospheric Lighting</span>
//                       <p className="text-[#59453E] dark:text-[#D4C3B7] leading-relaxed">
//                         {blueprint.decorAndFloral.lightingConcept}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Section 3: Culinary Strategy & Live Counters */}
//               <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
//                 <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
//                   <Utensils className="w-5 h-5 text-[#B77A36]" />
//                   <span>Culinary Architecture & Artisanal Stations</span>
//                 </h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-3">
//                     <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold">
//                       Interactive Live Counters
//                     </span>
//                     <ul className="space-y-2 text-xs text-[#30221D] dark:text-[#FFF3E3]">
//                       {blueprint.culinaryStrategy.recommendedCounters.map((item, i) => (
//                         <li key={i} className="p-3 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex items-center gap-2.5">
//                           <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0" />
//                           <span>{item}</span>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>

//                   <div className="space-y-3">
//                     <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold">
//                       Signature Beverage Concepts
//                     </span>
//                     <ul className="space-y-2 text-xs text-[#30221D] dark:text-[#FFF3E3]">
//                       {blueprint.culinaryStrategy.beverageHighlights.map((item, i) => (
//                         <li key={i} className="p-3 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex items-center gap-2.5">
//                           <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0" />
//                           <span>{item}</span>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 </div>
//               </div>

//               {/* Section 4: Master Run of Show Timeline */}
//               <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
//                 <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
//                   <Clock className="w-5 h-5 text-[#B77A36]" />
//                   <span>Event Day Minute-by-Minute Run of Show</span>
//                 </h3>
//                 <div className="space-y-3">
//                   {blueprint.runOfShowTimeline.map((item, i) => (
//                     <div
//                       key={i}
//                       className="p-4 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
//                     >
//                       <div className="flex items-center gap-3">
//                         <span className="px-2.5 py-1 rounded-lg bg-[#EAD2B0]/40 text-[#681B1D] border border-[#B77A36]/30 text-xs font-mono font-bold whitespace-nowrap">
//                           {item.time}
//                         </span>
//                         <div>
//                           <h4 className="text-sm font-semibold text-[#30221D] dark:text-[#FFF3E3]">{item.activity}</h4>
//                           <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{item.location}</span>
//                         </div>
//                       </div>

//                       <div className="text-left sm:text-right">
//                         <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-semibold">
//                           Lead: {item.responsiblePerson}
//                         </span>
//                         <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] mt-1">{item.notes}</p>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Section 5: Cultural & Logistical Reminders */}
//               <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-4">
//                 <h3 className="text-lg font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
//                   <ShieldCheck className="w-5 h-5 text-[#B77A36]" />
//                   <span>Important Cultural & Regulatory Safeguards</span>
//                 </h3>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#30221D] dark:text-[#FFF3E3]">
//                   {blueprint.culturalAndLogisticalReminders.map((rem, i) => (
//                     <div key={i} className="p-3.5 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex items-start gap-2.5">
//                       <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0 mt-0.5" />
//                       <span>{rem}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )
//         )}
//       </main>

//       <Footer />

//       {saveAuthModalOpen && (
//         <div
//           className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101713]/65 backdrop-blur-sm p-4"
//           role="presentation"
//           onMouseDown={(event) => {
//             if (event.target === event.currentTarget) setSaveAuthModalOpen(false);
//           }}
//         >
//           <section
//             role="dialog"
//             aria-modal="true"
//             aria-labelledby="save-auth-title"
//             className="w-full max-w-md rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl p-7 sm:p-8"
//           >
//             <div className="w-12 h-12 rounded-2xl bg-[#EAD2B0]/40 text-[#681B1D] dark:text-[#EAD2B0] grid place-items-center mb-5">
//               <Save className="w-5 h-5 text-[#681B1D] dark:text-[#EAD2B0]" />
//             </div>
//             <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B77A36] dark:text-[#EAD2B0]">
//               Your plan is ready
//             </p>
//             <h2 id="save-auth-title" className="mt-2 text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
//               Save it to your workspace
//             </h2>
//             <p className="mt-3 text-sm leading-6 text-[#59453E] dark:text-[#D4C3B7]">
//               Sign in or create a customer account. We’ll keep this exact blueprint and save it automatically when you return.
//             </p>
//             <div className="mt-7 grid gap-3">
//               <button
//                 type="button"
//                 onClick={() => {
//                   const href = saveDraftForAuthentication();
//                   router.push(href);
//                 }}
//                 className="w-full rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] px-5 py-3 font-semibold text-sm cursor-pointer shadow-sm border border-[#B77A36]/40"
//               >
//                 Sign in to save
//               </button>
//               <button
//                 type="button"
//                 onClick={() => {
//                   const destination = "/planner?resume=1&save=1";
//                   sessionStorage.setItem(
//                     "evntora-planner-auth-draft",
//                     JSON.stringify({
//                       eventType,
//                       city,
//                       date,
//                       guestCount,
//                       budgetINR,
//                       venuePreference,
//                       styleTheme,
//                       requirements,
//                       preferences,
//                       blueprint,
//                       savedEventId,
//                     })
//                   );
//                   router.push(`/signup?portal=customer&redirectTo=${encodeURIComponent(destination)}`);
//                 }}
//                 className="w-full rounded-xl border border-[#B77A36] text-[#681B1D] dark:text-[#EAD2B0] px-5 py-3 font-semibold text-sm hover:bg-[#EAD2B0]/30 transition-colors cursor-pointer"
//               >
//                 Create a customer account
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setSaveAuthModalOpen(false)}
//                 className="w-full px-5 py-2.5 text-sm font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#30221D] dark:hover:text-[#FFF3E3] cursor-pointer"
//               >
//                 Continue planning
//               </button>
//             </div>
//           </section>
//         </div>
//       )}
//     </div>
//   );
// }

// export default function PlannerPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="min-h-screen bg-[#FFF3E3] dark:bg-[#1A1211] text-[#681B1D] dark:text-[#EAD2B0] p-12">
//           Loading AI Planner...
//         </div>
//       }
//     >
//       <PlannerContent />
//     </Suspense>
//   );
// }

"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EVENT_CATEGORIES } from "@/data/categories";
import { CITIES } from "@/data/cities";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import { AIEventBlueprint, EventCategory } from "@/types";
import type { AIFeasibilityAssessment } from "@/lib/ai-schemas";
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
  Save,
  Check,
  ShieldCheck,
  Users,
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
  const customerSession = Boolean(user && hasRole("customer"));

  // Initial params from URL query if available
  const rawType = searchParams.get("type");
  const matchedCategory = rawType
    ? EVENT_CATEGORIES.find(
        (c) =>
          c.id.toLowerCase() === rawType.toLowerCase() ||
          c.name.toLowerCase() === rawType.toLowerCase()
      )
    : null;
  const initialType = rawType ? (matchedCategory ? matchedCategory.name : rawType) : "Weddings & Royal Celebrations";

  const initialCity = searchParams.get("city") || "";
  const initialGuests = (searchParams.get("guests") ?? "").replace(/[^\d]/g, "");
  const initialBudget = (searchParams.get("budget") ?? "").replace(/[^\d]/g, "");

  // Wizard state
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState<string>(initialType);
  const [city, setCity] = useState(initialCity);
  const [date, setDate] = useState("");
  const [guestCount, setGuestCount] = useState(initialGuests);
  const [budgetINR, setBudgetINR] = useState(initialBudget);
  const [guestCountTouched, setGuestCountTouched] = useState(false);
  const [budgetTouched, setBudgetTouched] = useState(false);
  const [budgetFocused, setBudgetFocused] = useState(false);
  const [dateRequiredAttempted, setDateRequiredAttempted] = useState(false);
  const [venuePreference, setVenuePreference] = useState("");
  const [styleTheme, setStyleTheme] = useState("");
  const [requirements, setRequirements] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);

  // Generated Blueprint State
  const [blueprint, setBlueprint] = useState<AIEventBlueprint | null>(null);
  const [feasibility, setFeasibility] = useState<AIFeasibilityAssessment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedToDashboard, setSavedToDashboard] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [plannerError, setPlannerError] = useState("");
  const [saveAuthModalOpen, setSaveAuthModalOpen] = useState(false);
  const [saveAfterResume, setSaveAfterResume] = useState(false);
  const resumeSaveStarted = useRef(false);

  useEffect(() => {
    if (searchParams.get("resume") !== "1") return;
    try {
      const raw = sessionStorage.getItem("evntora-planner-auth-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        eventType: string;
        city: string;
        date: string;
        guestCount: number | string;
        budgetINR: number | string;
        venuePreference: string;
        styleTheme: string;
        requirements: string;
        preferences?: string[];
        blueprint: AIEventBlueprint | null;
        savedEventId?: string | null;
      };
      setEventType(draft.eventType);
      setCity(draft.city);
      setDate(draft.date);
      setGuestCount(String(draft.guestCount ?? ""));
      setBudgetINR(String(draft.budgetINR ?? ""));
      setVenuePreference(draft.venuePreference);
      setStyleTheme(draft.styleTheme);
      setRequirements(draft.requirements);
      setPreferences(draft.preferences ?? []);
      setBlueprint(draft.blueprint);
      setSavedEventId(draft.savedEventId ?? null);
      setStep(draft.blueprint ? 3 : 1);
      if (searchParams.get("save") === "1" && draft.blueprint) setSaveAfterResume(true);
      else sessionStorage.removeItem("evntora-planner-auth-draft");
    } catch {
      sessionStorage.removeItem("evntora-planner-auth-draft");
    }
  }, [searchParams]);

  const isCustomerReadyForSave = () => {
    if (authLoading) {
      setPlannerError("Checking your account access. Please try again in a moment.");
      return false;
    }
    if (rolesError) {
      setPlannerError("We could not verify your account access. Refresh the page or try again shortly.");
      return false;
    }
    if (user && hasRole("customer")) return true;
    if (user) {
      setPlannerError("This account does not have Customer access. Use an account with Customer access to plan and save events.");
      return false;
    }
    return false;
  };

  const saveDraftForAuthentication = () => {
    sessionStorage.setItem(
      "evntora-planner-auth-draft",
      JSON.stringify({
        eventType,
        city,
        date,
        guestCount,
        budgetINR,
        venuePreference,
        styleTheme,
        requirements,
        preferences,
        blueprint,
        savedEventId,
      })
    );
    return `/signin?portal=customer&redirectTo=${encodeURIComponent("/planner?resume=1&save=1")}`;
  };

  const categoryOptions: SelectOption[] = EVENT_CATEGORIES.map((category) => ({
    value: category.name,
    label: category.name,
  }));
  const cityOptions: SelectOption[] = CITIES.map((item) => ({
    value: item.name,
    label: item.name,
    description: item.state,
  }));
  const preferenceOptions = (eventType.toLowerCase().includes("corporate")
    ? ["Accessibility support", "Hybrid streaming", "Networking time", "Dietary choices", "Sustainability"]
    : ["Accessibility support", "Jain arrangements", "Vegetarian menu", "Elder-friendly schedule", "Children's activities", "Regional rituals", "Sustainability"]
  ).map((value) => ({ value, label: value }));

  const guestCountError = integerFieldError(guestCount, "expected guest count", 1, 5000);
  const budgetError = integerFieldError(budgetINR, "budget", 1, 100000000);

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

  const handleGenerateBlueprint = async (
    refinement?: string,
    confirmLimitations = false
  ) => {
    setPlannerError("");

    if (!confirmLimitations) {
      setFeasibility(null);
    }

    setDateRequiredAttempted(true);
    setGuestCountTouched(true);
    setBudgetTouched(true);

    if (!date || date < localTodayIso() || !city.trim() || guestCountError || budgetError) {
      setPlannerError("Review the highlighted date, guest count, budget, and destination fields.");
      return;
    }

    const guestCountNumber = Number(guestCount);
    const budgetNumber = Number(budgetINR);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: eventType,
          city: city.trim(),
          date,
          guestCount: guestCountNumber,
          totalBudget: budgetNumber,
          venuePreference,
          styleTheme,
          requirements,
          preferences,
          confirmLimitations,
          ...(refinement ? { refinement, previousBlueprint: blueprint } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "The plan could not be generated.");
      }

      // Feasibility may be returned before a blueprint is generated.
      if (!data.blueprint) {
        if (data.feasibility) {
          setFeasibility(data.feasibility as AIFeasibilityAssessment);
          setBlueprint(null);
          setStep(2);
          return;
        }

        throw new Error(
          "The planning service returned an incomplete response. Please try again."
        );
      }

      setBlueprint(data.blueprint as AIEventBlueprint);
      setFeasibility(data.feasibility ?? null);
      setSavedToDashboard(false);
      setStep(3);
    } catch (error) {
      setPlannerError(
        error instanceof Error
          ? error.message
          : "The plan could not be generated."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const persistBlueprint = async () => {
    if (!blueprint) return;
    if (!isCustomerReadyForSave()) return null;
    setPlannerError("");
    try {
      const response = await fetch("/api/ai/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: savedEventId ?? undefined,
          title: `${eventType} in ${city} for ${Number(guestCount)} Guests`,
          category: eventType,
          city: city.trim(),
          date,
          guestCount: Number(guestCount),
          totalBudget: Number(budgetINR),
          venuePreference,
          styleTheme,
          requirements: [requirements, preferences.length ? `Additional preferences: ${preferences.join(", ")}` : ""]
            .filter(Boolean)
            .join("\n"),
          blueprint,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The event plan could not be saved.");
      setSavedEventId(data.eventId);
      setSavedToDashboard(true);
      return data.eventId as string;
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : "The event plan could not be saved.");
      return null;
    }
  };

  const handleSaveToDashboard = async () => {
    if (!user && !authLoading) {
      setSaveAuthModalOpen(true);
      return;
    }
    if (!isCustomerReadyForSave()) return;
    const eventId = await persistBlueprint();
    if (eventId) router.push(`/dashboard/workspace?eventId=${encodeURIComponent(eventId)}`);
  };

  const handleProceedToMarketplace = async () => {
    if (!blueprint) return;
    if (customerSession && !(await persistBlueprint())) return;
    router.push("/vendors?city=" + encodeURIComponent(city));
  };

  useEffect(() => {
    if (!saveAfterResume || authLoading || resumeSaveStarted.current) return;
    if (!user) {
      setSaveAfterResume(false);
      setSaveAuthModalOpen(true);
      return;
    }
    if (rolesError) {
      setPlannerError("We could not verify your account access. Your generated plan is still preserved; please refresh and try again.");
      setSaveAfterResume(false);
      return;
    }
    if (!hasRole("customer")) {
      setPlannerError("This account does not have Customer access. Your generated plan is preserved; sign in with Customer access to save it.");
      setSaveAfterResume(false);
      return;
    }
    resumeSaveStarted.current = true;
    void (async () => {
      const eventId = await persistBlueprint();
      if (eventId) {
        sessionStorage.removeItem("evntora-planner-auth-draft");
        setSaveAfterResume(false);
        router.replace(`/dashboard/workspace?eventId=${encodeURIComponent(eventId)}`);
      } else {
        resumeSaveStarted.current = false;
        setSaveAfterResume(false);
      }
    })();
  }, [saveAfterResume, authLoading, user, rolesError, hasRole, blueprint, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-12">
        {/* Header — clean, refined, badge & duplicate ask AI button removed */}
        <div className="border-b border-[#EAD2B0] dark:border-[#4D3331] pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B77A36] dark:text-[#EAD2B0] font-bold">
            <span className="w-6 h-[1px] bg-[#B77A36]" />
            <span>AI Event Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            AI Event Blueprint Generator
          </h1>
          <p className="text-xs sm:text-sm text-[#59453E] dark:text-[#D4C3B7] max-w-2xl leading-relaxed">
            Comprehensive planning engine engineered for Indian celebration logistics, cultural rituals, budget calibration, and verified vendor matching.
          </p>
        </div>

        {plannerError && (
          <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/30 px-5 py-3.5 text-xs text-red-800 dark:text-red-200">
            {plannerError}
          </div>
        )}

        {/* Wizard Form vs Blueprint View */}
        {step < 3 ? (
          <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl space-y-8">
            <div className="flex items-center justify-between border-b border-[#EAD2B0] dark:border-[#4D3331] pb-4">
              <span className="text-xs uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0]">
                Step {step} of 2: {step === 1 ? "Event Core Parameters" : "Themes & Special Nuances"}
              </span>
              <div className="flex gap-1.5">
                <span className={`w-4 h-1.5 rounded-full ${step >= 1 ? "bg-[#681B1D] dark:bg-[#EAD2B0]" : "bg-[#EAD2B0] dark:bg-[#4D3331]"}`} />
                <span className={`w-4 h-1.5 rounded-full ${step >= 2 ? "bg-[#681B1D] dark:bg-[#EAD2B0]" : "bg-[#EAD2B0] dark:bg-[#4D3331]"}`} />
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-6 text-xs animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Event Type / Celebration Category */}
                  <div>
                    <SearchableSelect
                      label="Celebration Category"
                      value={eventType}
                      options={categoryOptions}
                      onChange={setEventType}
                      allowCustom
                      customLabel="Use custom category"
                    />
                  </div>

                  {/* Destination City */}
                  <div>
                    <SearchableSelect
                      label="Destination / City"
                      value={city}
                      options={cityOptions}
                      onChange={setCity}
                      allowCustom
                      customLabel="Use custom city"
                      placeholder="Search or enter a destination"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date */}
                  <PlannerDatePicker value={date} onChange={setDate} requiredAttempted={dateRequiredAttempted} />

                  {/* Guests Input with presets */}
                  <div>
                    <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-bold uppercase tracking-wider text-[10px]">
                      Expected Guest Count
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      step="1"
                      value={guestCount}
                      placeholder="e.g. 350"
                      onChange={(e) => {
                        setGuestCount(e.target.value);
                        setGuestCountTouched(true);
                      }}
                      onBlur={() => setGuestCountTouched(true)}
                      aria-invalid={guestCountTouched && Boolean(guestCountError)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-medium text-xs focus:outline-none focus:border-[#B77A36]"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["50", "150", "350", "600", "1000"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setGuestCount(preset);
                            setGuestCountTouched(true);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                            guestCount === preset
                              ? "bg-[#681B1D] text-[#FFF3E3] border-[#681B1D]"
                              : "bg-[#FFFCF6]/60 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] hover:border-[#B77A36]"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    {guestCountTouched && guestCountError && (
                      <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-300">
                        {guestCountError}
                      </p>
                    )}
                  </div>

                  {/* Budget Input with presets */}
                  <div>
                    <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-bold uppercase tracking-wider text-[10px]">
                      Target Budget (INR)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={budgetFocused || !budgetINR ? budgetINR : formatINR(Number(budgetINR))}
                      placeholder="e.g. ₹45,00,000"
                      onFocus={() => setBudgetFocused(true)}
                      onChange={(e) => {
                        setBudgetINR(e.target.value.replace(/[^\d]/g, ""));
                        setBudgetTouched(true);
                      }}
                      onBlur={() => {
                        setBudgetFocused(false);
                        setBudgetTouched(true);
                      }}
                      aria-invalid={budgetTouched && Boolean(budgetError)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-medium text-xs focus:outline-none focus:border-[#B77A36]"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        { label: "₹10L", val: "1000000" },
                        { label: "₹25L", val: "2500000" },
                        { label: "₹45L", val: "4500000" },
                        { label: "₹85L", val: "8500000" },
                        { label: "₹1.5Cr", val: "15000000" },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => {
                            setBudgetINR(preset.val);
                            setBudgetTouched(true);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                            budgetINR === preset.val
                              ? "bg-[#681B1D] text-[#FFF3E3] border-[#681B1D]"
                              : "bg-[#FFFCF6]/60 dark:bg-[#1A1211] border-[#EAD2B0] dark:border-[#4D3331] text-[#7D6B63] hover:border-[#B77A36]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {budgetTouched && budgetError && (
                      <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-300">
                        {budgetError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Redundant Selected Budget box has been removed */}

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md border border-[#B77A36]/50"
                  >
                    <span>Next: Themes & Preferences</span>
                    <ArrowRight className="w-4 h-4 text-[#EAD2B0]" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 text-xs animate-in fade-in duration-200">
                <div>
                  <SearchableSelect
                    label="Venue Style & Setting"
                    value={venuePreference}
                    options={[
                      "Heritage palace or lakeside lawn",
                      "Luxury hotel ballroom",
                      "Beachfront venue",
                      "Farmhouse estate",
                      "Botanical conservatory",
                      "Community or cultural venue",
                    ].map((value) => ({ value, label: value }))}
                    onChange={setVenuePreference}
                    allowCustom
                    customLabel="Use setting"
                    placeholder="Choose or describe a setting"
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="Aesthetic Style & Theme"
                    value={styleTheme}
                    options={[
                      "Royal heritage",
                      "Coastal sunset",
                      "Botanical garden",
                      "Minimalist modern",
                      "Bollywood inspired",
                      "Traditional regional",
                    ].map((value) => ({ value, label: value }))}
                    onChange={setStyleTheme}
                    allowCustom
                    customLabel="Use theme"
                    placeholder="Choose or enter your theme"
                  />
                </div>

                <SearchableMultiSelect
                  label="Additional planning preferences"
                  value={preferences}
                  options={preferenceOptions}
                  onChange={setPreferences}
                  allowCustom
                  placeholder="Select any that apply or add your own"
                />

                <div>
                  <label className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-bold uppercase tracking-wider text-[10px]">
                    Specific Culinary, Ritual, or AV Requirements
                  </label>
                  <textarea
                    rows={4}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="e.g. Separate Jain counters, live Sufi band for Sangeet, drone video permissions..."
                    className="w-full px-4 py-3 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#9E897F] text-xs focus:outline-none focus:border-[#B77A36]"
                  />
                </div>

                {feasibility && (
                  <div className="rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFFCF6] dark:bg-[#1A1211] p-6 space-y-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#B77A36]">
                        AI Budget & Feasibility Assessment
                      </p>
                      <h3 className="text-xl font-serif font-bold mt-2">
                        {feasibility.status === "feasible"
                          ? "Your event is within budget"
                          : feasibility.status === "partially_feasible"
                            ? "A few adjustments are recommended"
                            : "Your requested event needs reconsideration"}
                      </h3>
                      <p className="text-sm mt-2 text-[#59453E] dark:text-[#D4C3B7]">
                        {feasibility.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl p-4 bg-[#FFF3E3] dark:bg-[#2E1F1E]">
                        <p className="text-xs text-[#7D6B63]">Submitted budget</p>
                        <p className="font-bold mt-1">{formatINR(feasibility.budgetAssessment.proposedBudget)}</p>
                      </div>
                      <div className="rounded-xl p-4 bg-[#FFF3E3] dark:bg-[#2E1F1E]">
                        <p className="text-xs text-[#7D6B63]">Estimated low</p>
                        <p className="font-bold mt-1">{formatINR(feasibility.budgetAssessment.estimatedBudgetRange.low)}</p>
                      </div>
                      <div className="rounded-xl p-4 bg-[#FFF3E3] dark:bg-[#2E1F1E]">
                        <p className="text-xs text-[#7D6B63]">Estimated high</p>
                        <p className="font-bold mt-1">{formatINR(feasibility.budgetAssessment.estimatedBudgetRange.high)}</p>
                      </div>
                    </div>

                    <p className="text-sm text-[#59453E] dark:text-[#D4C3B7]">
                      {feasibility.budgetAssessment.explanation}
                    </p>

                    {feasibility.issues.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm">Planning considerations</h4>
                        {feasibility.issues.map((issue, index) => (
                          <div key={index} className="rounded-xl border border-[#EAD2B0] dark:border-[#4D3331] p-3">
                            <p className="font-semibold text-xs">{issue.category} · {issue.severity}</p>
                            <p className="text-xs mt-1 text-[#7D6B63] dark:text-[#D4C3B7]">{issue.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {feasibility.suggestedAdjustments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm">Recommended adjustments</h4>
                        {feasibility.suggestedAdjustments.map((item, index) => (
                          <div key={index} className="text-xs rounded-xl bg-[#FFF3E3] dark:bg-[#2E1F1E] p-3">
                            <p className="font-bold">{item.title}</p>
                            <p className="mt-1 text-[#7D6B63] dark:text-[#D4C3B7]">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {feasibility.suggestedPlan && (
                      <div className="rounded-2xl border border-[#B77A36]/50 p-5 space-y-4">
                        <h4 className="font-bold text-base">Suggested plan within your budget</h4>
                        <p className="text-xs text-[#7D6B63]">{feasibility.suggestedPlan.eventScale.description}</p>
                        <div className="space-y-2 text-sm">
                          <p><strong>Guests:</strong> {feasibility.suggestedPlan.eventScale.guestCount}</p>
                          <p><strong>Venue:</strong> {feasibility.suggestedPlan.venueType}</p>
                          <p><strong>Catering:</strong> {feasibility.suggestedPlan.cateringArrangement}</p>
                          <p><strong>Decoration:</strong> {feasibility.suggestedPlan.decorationAlternative}</p>
                          <p><strong>Photography:</strong> {feasibility.suggestedPlan.photographyAlternative}</p>
                          <p><strong>Entertainment:</strong> {feasibility.suggestedPlan.entertainmentAlternative}</p>
                        </div>
                        <div className="border-t border-[#EAD2B0] dark:border-[#4D3331] pt-3 space-y-2">
                          {feasibility.suggestedPlan.expenseBreakdown.map((expense, index) => (
                            <div key={index} className="flex justify-between gap-3 text-xs">
                              <span>{expense.category}</span>
                              <strong>{formatINR(expense.estimatedCost)}</strong>
                            </div>
                          ))}
                          <div className="flex justify-between font-bold border-t border-[#EAD2B0] dark:border-[#4D3331] pt-3">
                            <span>Total estimated cost</span>
                            <span>{formatINR(feasibility.suggestedPlan.totalEstimatedCost)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                            <span>Remaining budget</span>
                            <strong>{formatINR(feasibility.suggestedPlan.remainingBudget)}</strong>
                          </div>
                        </div>
                        <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{feasibility.suggestedPlan.compromises}</p>
                      </div>
                    )}

                    {feasibility.status === "partially_feasible" &&
                      !feasibility.issues.some((issue) => issue.severity === "critical") && (
                        <button
                          type="button"
                          onClick={() => void handleGenerateBlueprint(undefined, true)}
                          disabled={isGenerating}
                          className="w-full rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] font-bold py-3 cursor-pointer disabled:opacity-50"
                        >
                          {isGenerating ? "Generating your blueprint..." : "Confirm & Generate Complete Blueprint"}
                        </button>
                      )}

                    {feasibility.status === "not_feasible" && (
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Please revise your event requirements before generating a blueprint.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 rounded-full bg-[#FFFCF6] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#FAF3E8] border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleGenerateBlueprint()}
                    disabled={isGenerating}
                    className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-[#B77A36]/50"
                  >
                    {isGenerating ? (
                      <span>Synthesizing Cultural Blueprint...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#EAD2B0]" />
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
              <div className="p-6 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                      {blueprint.blueprintId}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EAD2B0]/60 dark:bg-[#681B1D]/60 text-[#681B1D] dark:text-[#EAD2B0] text-[10px] font-bold uppercase tracking-wider">
                      AI Generated
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
                    {blueprint.title}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#1A1211] hover:bg-[#FAF3E8] border border-[#EAD2B0] dark:border-[#4D3331] text-xs text-[#30221D] dark:text-[#FFF3E3] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>Recalculate</span>
                  </button>

                  <button
                    onClick={handleSaveToDashboard}
                    disabled={savedToDashboard}
                    className="px-5 py-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#1A1211] hover:bg-[#FAF3E8] border border-[#EAD2B0] dark:border-[#4D3331] text-[#681B1D] dark:text-[#EAD2B0] font-bold text-xs tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savedToDashboard ? (
                      <>
                        <Check className="w-4 h-4 text-rose-800" />
                        <span>Saved to Workspace</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-[#B77A36]" />
                        <span>Save Workspace</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleProceedToMarketplace}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all border border-[#B77A36]/40"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0]" />
                    <span>Explore Vendors</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Section 1: Executive Summary & Budget Allocation */}
              <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
                <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#B77A36]" />
                  <span>Executive Overview & Budget Allocation</span>
                </h3>

                <p className="text-sm text-[#59453E] dark:text-[#D4C3B7] leading-relaxed bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 p-5 rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331]">
                  {blueprint.executiveSummary}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blueprint.recommendedBudget.breakdown.map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">{item.category}</span>
                        <span className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0]">{item.percentage}%</span>
                      </div>
                      <div className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                        {formatINR(item.amount)}
                      </div>
                      <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] leading-snug">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Venue Recommendations & Decor Theme */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Venues */}
                <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
                  <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#B77A36]" />
                    <span>Recommended Venue Options</span>
                  </h3>
                  <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7]">
                    AI planning estimates and venue formats only. They are not Evntora listings, quotes, or availability. Explore published vendors separately before requesting a booking.
                  </p>
                  <div className="space-y-4">
                    {blueprint.venueRecommendations.map((v, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-base font-bold text-[#30221D] dark:text-[#FFF3E3]">{v.name}</h4>
                          <span className="text-xs font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">{v.estimatedCost}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
                          <span>{v.type}</span>
                          <span>•</span>
                          <span>Capacity: {v.capacity}</span>
                        </div>
                        <p className="text-xs text-[#59453E] dark:text-[#D4C3B7] pt-1">{v.highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decor & Theme */}
                <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
                  <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#B77A36]" />
                    <span>Aesthetic Moodboard & Florals</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
                      <span className="text-xs uppercase font-bold text-[#B77A36] dark:text-[#EAD2B0] tracking-wider">
                        Color Swatches
                      </span>
                      <div className="flex items-center gap-3">
                        {blueprint.themeAndAtmosphere.colorPalette.map((col, i) => (
                          <div key={i} className="text-center">
                            <div
                              className="w-10 h-10 rounded-full border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs mx-auto"
                              style={{ backgroundColor: col.hex }}
                            />
                            <span className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7] block mt-1">{col.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] space-y-2 text-xs">
                      <span className="text-[#681B1D] dark:text-[#EAD2B0] font-bold block">Stage & Mandap Concept</span>
                      <p className="text-[#59453E] dark:text-[#D4C3B7] leading-relaxed">
                        {blueprint.decorAndFloral.mandapOrStage}
                      </p>
                      <span className="text-[#681B1D] dark:text-[#EAD2B0] font-bold block pt-2">Atmospheric Lighting</span>
                      <p className="text-[#59453E] dark:text-[#D4C3B7] leading-relaxed">
                        {blueprint.decorAndFloral.lightingConcept}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Culinary Strategy & Live Counters */}
              <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
                <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#B77A36]" />
                  <span>Culinary Architecture & Artisanal Stations</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold">
                      Interactive Live Counters
                    </span>
                    <ul className="space-y-2 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                      {blueprint.culinaryStrategy.recommendedCounters.map((item, i) => (
                        <li key={i} className="p-3 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-wider text-[#B77A36] dark:text-[#EAD2B0] font-bold">
                      Signature Beverage Concepts
                    </span>
                    <ul className="space-y-2 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                      {blueprint.culinaryStrategy.beverageHighlights.map((item, i) => (
                        <li key={i} className="p-3 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 4: Master Run of Show Timeline */}
              <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-6">
                <h3 className="text-xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#B77A36]" />
                  <span>Event Day Minute-by-Minute Run of Show</span>
                </h3>
                <div className="space-y-3">
                  {blueprint.runOfShowTimeline.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#EAD2B0]/40 text-[#681B1D] border border-[#B77A36]/30 text-xs font-mono font-bold whitespace-nowrap">
                          {item.time}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-[#30221D] dark:text-[#FFF3E3]">{item.activity}</h4>
                          <span className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{item.location}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] font-semibold">
                          Lead: {item.responsiblePerson}
                        </span>
                        <p className="text-[11px] text-[#7D6B63] dark:text-[#D4C3B7] mt-1">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Cultural & Logistical Reminders */}
              <div className="p-8 rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-md space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#B77A36]" />
                  <span>Important Cultural & Regulatory Safeguards</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                  {blueprint.culturalAndLogisticalReminders.map((rem, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#B77A36] shrink-0 mt-0.5" />
                      <span>{rem}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </main>

      <Footer />

      {saveAuthModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101713]/65 backdrop-blur-sm p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSaveAuthModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-auth-title"
            className="w-full max-w-md rounded-3xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-2xl p-7 sm:p-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#EAD2B0]/40 text-[#681B1D] dark:text-[#EAD2B0] grid place-items-center mb-5">
              <Save className="w-5 h-5 text-[#681B1D] dark:text-[#EAD2B0]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B77A36] dark:text-[#EAD2B0]">
              Your plan is ready
            </p>
            <h2 id="save-auth-title" className="mt-2 text-2xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
              Save it to your workspace
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#59453E] dark:text-[#D4C3B7]">
              Sign in or create a customer account. We’ll keep this exact blueprint and save it automatically when you return.
            </p>
            <div className="mt-7 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  const href = saveDraftForAuthentication();
                  router.push(href);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] text-[#FFF3E3] px-5 py-3 font-semibold text-sm cursor-pointer shadow-sm border border-[#B77A36]/40"
              >
                Sign in to save
              </button>
              <button
                type="button"
                onClick={() => {
                  const destination = "/planner?resume=1&save=1";
                  sessionStorage.setItem(
                    "evntora-planner-auth-draft",
                    JSON.stringify({
                      eventType,
                      city,
                      date,
                      guestCount,
                      budgetINR,
                      venuePreference,
                      styleTheme,
                      requirements,
                      preferences,
                      blueprint,
                      savedEventId,
                    })
                  );
                  router.push(`/signup?portal=customer&redirectTo=${encodeURIComponent(destination)}`);
                }}
                className="w-full rounded-xl border border-[#B77A36] text-[#681B1D] dark:text-[#EAD2B0] px-5 py-3 font-semibold text-sm hover:bg-[#EAD2B0]/30 transition-colors cursor-pointer"
              >
                Create a customer account
              </button>
              <button
                type="button"
                onClick={() => setSaveAuthModalOpen(false)}
                className="w-full px-5 py-2.5 text-sm font-medium text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#30221D] dark:hover:text-[#FFF3E3] cursor-pointer"
              >
                Continue planning
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF3E3] dark:bg-[#1A1211] text-[#681B1D] dark:text-[#EAD2B0] p-12">
          Loading AI Planner...
        </div>
      }
    >
      <PlannerContent />
    </Suspense>
  );
}
