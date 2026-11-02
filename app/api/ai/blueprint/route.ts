import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { generateText, getGeminiErrorResponse } from "@/lib/gemini";
import { consumeAiRequest } from "@/lib/ai-rate-limit";
import { blueprintSchema } from "@/lib/ai-schemas";

export const runtime = "nodejs";
const inputSchema = z.object({
  category: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100),
  date: z.string().date(), guestCount: z.number().int().min(1).max(10000),
  totalBudget: z.number().int().min(0).max(1_000_000_000),
  venuePreference: z.string().trim().max(300), styleTheme: z.string().trim().max(300),
  requirements: z.string().trim().max(4000).default(""), preferences: z.array(z.string().trim().min(1).max(100)).max(30).default([]), refinement: z.string().trim().max(2000).optional(),
  previousBlueprint: z.unknown().optional(),
});
export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in with Customer access to use the planner." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "We could not verify your account access. Please try again." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access to create an event plan." }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the event details and try again." }, { status: 400 });
  const data = parsed.data;
  const quota = await consumeAiRequest(supabase);
  if (quota !== "ok") return NextResponse.json({ error: quota === "limited" ? "You have reached the planning request limit. Please wait a minute and try again." : "AI request limits are temporarily unavailable. Please try again." }, { status: quota === "limited" ? 429 : 503 });
  const prompt = `You are Evntora's event planning assistant. Create a personalized, practical event blueprint for India. Return only JSON matching the requested keys and types. Never invent or name real vendors or venues. For venueRecommendations.name use generic venue formats such as "Heritage hotel venue type" or "Outdoor lawn venue type", not a business name. Estimated costs are rough planning estimates and must be labeled as estimates, never as real quotes, listing prices, availability, or booked services. Follow legal/local cautions conservatively and advise checking with local authorities. INR amounts must add approximately to total budget. Use supplied event context; if this is a refinement, revise the existing plan rather than starting over. Do not claim any action or booking has happened.
Event context: ${JSON.stringify({ category: data.category, city: data.city, date: data.date, guestCount: data.guestCount, totalBudgetINR: data.totalBudget, venuePreference: data.venuePreference, theme: data.styleTheme, requirements: data.requirements, preferences: data.preferences })}
${data.previousBlueprint ? `Existing plan to refine: ${JSON.stringify(data.previousBlueprint).slice(0, 18000)}` : ""}
${data.refinement ? `Customer refinement request: ${data.refinement}` : ""}
Use these keys: blueprintId,title,executiveSummary,themeAndAtmosphere{themeName,colorPalette[{name,hex}],designNotes},recommendedBudget{total,breakdown[{category,percentage,amount,description}]},venueRecommendations[{name,city,type,capacity,estimatedCost,highlight}],culinaryStrategy{cuisineStyle,recommendedCounters[],beverageHighlights[]},decorAndFloral{mandapOrStage,lightingConcept,floralSelections[]},photographyGuidelines{coverageType,mustHaveShots[]},entertainmentProgram{welcomeAct,mainPerformances[],afterParty},runOfShowTimeline[{time,activity,location,responsiblePerson,notes}],planningChecklist[{task,timeframe}],culturalAndLogisticalReminders[].`;
  try {
    const text = await generateText(prompt, true);
    let json: unknown;
    try { json = JSON.parse(text); } catch { return NextResponse.json({ error: "The planning service returned an unreadable plan. Please try again." }, { status: 502 }); }
    const blueprint = blueprintSchema.safeParse(json);
    if (!blueprint.success) return NextResponse.json({ error: "The planning service could not create a complete plan. Please try again." }, { status: 502 });
    const safeBlueprint = { ...blueprint.data, venueRecommendations: blueprint.data.venueRecommendations.map((venue, index) => ({ ...venue, name: `Venue format ${index + 1}` })) };
    return NextResponse.json({ blueprint: safeBlueprint });
  } catch (error) {
    const failure = getGeminiErrorResponse(error, "planning");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
