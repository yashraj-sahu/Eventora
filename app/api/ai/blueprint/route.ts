import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { generateText, getAiErrorResponse } from "@/lib/gemini";
import { consumeAiRequest, consumeGuestAiRequest } from "@/lib/ai-rate-limit";
import { blueprintSchema } from "@/lib/ai-schemas";
import type { AIEventBlueprint } from "@/types";

export const runtime = "nodejs";
const inputSchema = z.object({
  category: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100),
  date: z.string().date(), guestCount: z.number().int().min(1).max(10000),
  totalBudget: z.number().int().min(0).max(1_000_000_000),
  venuePreference: z.string().trim().max(300), styleTheme: z.string().trim().max(300),
  requirements: z.string().trim().max(4000).default(""), preferences: z.array(z.string().trim().min(1).max(100)).max(30).default([]), refinement: z.string().trim().max(2000).optional(),
  previousBlueprint: z.unknown().optional(),
});

function parseBlueprintResponse(text: string) {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim());
  const source = fenced?.[1] ?? text.trim();
  return JSON.parse(source) as unknown;
}

function validateBlueprintOutput(text: string) {
  try {
    const result = blueprintSchema.safeParse(parseBlueprintResponse(text));
    return result.success
      ? { valid: true }
      : { valid: false, issues: result.error.issues.map((issue) => `${issue.path.join(".") || "response"}: ${issue.code}`) };
  } catch {
    return { valid: false, issues: ["response: invalid JSON"] };
  }
}

export async function POST(request: Request) {
  const { user: authenticatedUser, supabase } = await getAuthenticatedUser(request);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the event details and try again." }, { status: 400 });
  let user = authenticatedUser;
  if (authenticatedUser) {
    const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", authenticatedUser.id).eq("is_active", true);
    if (roleError) return NextResponse.json({ error: "We could not verify your account access. Please try again." }, { status: 503 });
    if (!roles?.some((role) => role.role === "customer")) user = null;
  }
  const data = parsed.data;
  const quota = user ? await consumeAiRequest(supabase) : await consumeGuestAiRequest(request);
  if (quota !== "ok") return NextResponse.json({ error: quota === "limited" ? "You have reached the planning request limit. Please wait before generating another blueprint." : "AI request limits are temporarily unavailable. Please try again shortly." }, { status: quota === "limited" ? 429 : 503 });
  const prompt = `You are Evntora's event planning assistant. Create a personalized, practical event blueprint for India. Return exactly one JSON object, with no markdown or prose outside JSON. Every listed key is required and must match the requested type. Never invent or name real vendors or venues. For venueRecommendations.name use generic venue formats such as "Heritage hotel venue type" or "Outdoor lawn venue type", not a business name. Estimated costs are rough planning estimates and must be labeled as estimates, never as real quotes, listing prices, availability, or booked services. Follow legal/local cautions conservatively and advise checking with local authorities. INR amounts must add approximately to total budget. Use supplied event context; if this is a refinement, revise the existing plan rather than starting over. Do not claim any action or booking has happened.
Event context: ${JSON.stringify({ category: data.category, city: data.city, date: data.date, guestCount: data.guestCount, totalBudgetINR: data.totalBudget, venuePreference: data.venuePreference, theme: data.styleTheme, requirements: data.requirements, preferences: data.preferences })}
${data.previousBlueprint ? `Existing plan to refine: ${JSON.stringify(data.previousBlueprint).slice(0, 18000)}` : ""}
${data.refinement ? `Customer refinement request: ${data.refinement}` : ""}
Return this exact shape: {"blueprintId":"string","title":"string","executiveSummary":"string","themeAndAtmosphere":{"themeName":"string","colorPalette":[{"name":"string","hex":"#RRGGBB"}],"designNotes":"string"},"recommendedBudget":{"total":number,"breakdown":[{"category":"string","percentage":number,"amount":number,"description":"string"}]},"venueRecommendations":[{"name":"generic venue type, never a real business","city":"string","type":"string","capacity":"string","estimatedCost":"rough estimate label","highlight":"string"}],"culinaryStrategy":{"cuisineStyle":"string","recommendedCounters":["string"],"beverageHighlights":["string"]},"decorAndFloral":{"mandapOrStage":"string","lightingConcept":"string","floralSelections":["string"]},"photographyGuidelines":{"coverageType":"string","mustHaveShots":["string"]},"entertainmentProgram":{"welcomeAct":"string","mainPerformances":["string"],"afterParty":"string"},"runOfShowTimeline":[{"time":"string","activity":"string","location":"string","responsiblePerson":"string","notes":"string"}],"planningChecklist":[{"task":"string","timeframe":"string"}],"culturalAndLogisticalReminders":["string"]}. Include meaningful recommendations in each array. Keep the budget amounts and percentages consistent with the supplied total.`;
  try {
    const rawText = await generateText(prompt, true, validateBlueprintOutput);
    const json = parseBlueprintResponse(rawText);
    const blueprint = blueprintSchema.safeParse(json);
    if (!blueprint.success) {
      // The shared provider validator should catch this; keep a defensive safe response here.
      console.error("[ai-blueprint] stage=final_validation issues", blueprint.error.issues.map((issue) => `${issue.path.join(".") || "response"}: ${issue.code}`));
      return NextResponse.json({ error: "The planning service could not create a complete plan. Please try again." }, { status: 502 });
    }
    const safeBlueprint: AIEventBlueprint = { ...blueprint.data, venueRecommendations: blueprint.data.venueRecommendations.map((venue, index) => ({ ...venue, name: `Venue format ${index + 1}` })) };
    return NextResponse.json({ blueprint: safeBlueprint });
  } catch (error) {
    console.error("[ai-blueprint] stage=generation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    const failure = getAiErrorResponse(error, "planning");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
