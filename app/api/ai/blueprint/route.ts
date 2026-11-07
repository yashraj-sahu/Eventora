import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { generateText, getAiErrorResponse } from "@/lib/ai";

//import { consumeAiRequest, consumeGuestAiRequest } from "@/lib/ai-rate-limit";
import {
  consumeAiRequest,
  consumeGuestAiRequest,
  isAiRateLimitEnabled,
} from "@/lib/ai-rate-limit";
import { blueprintSchema, feasibilitySchema, suggestedEventPlanSchema } from "@/lib/ai-schemas";
import type { AIEventBlueprint } from "@/types";

export const runtime = "nodejs";
const inputSchema = z.object({
  category: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100),
  date: z.string().date(), guestCount: z.number().int().min(1).max(10000),
  totalBudget: z.number().int().min(0).max(1_000_000_000),
  venuePreference: z.string().trim().max(300), styleTheme: z.string().trim().max(300),
  requirements: z.string().trim().max(4000).default(""), preferences: z.array(z.string().trim().min(1).max(100)).max(30).default([]), refinement: z.string().trim().max(2000).optional(),
  previousBlueprint: z.unknown().optional(),
  confirmLimitations: z.boolean().optional().default(false),
});

function parseBlueprintResponse(text: string) {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim());
  const source = (fenced?.[1] ?? text.trim()).trim();
  try {
    return JSON.parse(source) as unknown;
  } catch {
    // Some providers may wrap a valid structured object in short explanatory text.
    // Extract only the outer object, then require the same Zod validation as usual.
    const firstBrace = source.indexOf("{");
    const lastBrace = source.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("Invalid JSON output");
    return JSON.parse(source.slice(firstBrace, lastBrace + 1)) as unknown;
  }
}

function strictOutputJsonSchema(schema: z.ZodType) {
  const jsonSchema = z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<string, unknown>;
  const applyStrictObjects = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    delete node.minLength;
    delete node.maxLength;
    if (node.properties && typeof node.properties === "object" && !Array.isArray(node.properties)) {
      const properties = node.properties as Record<string, unknown>;
      node.required = Object.keys(properties);
      node.additionalProperties = false;
      Object.values(properties).forEach(applyStrictObjects);
    }
    if (node.items) applyStrictObjects(node.items);
    for (const key of ["anyOf", "oneOf", "allOf"]) {
      if (Array.isArray(node[key])) (node[key] as unknown[]).forEach(applyStrictObjects);
    }
  };
  delete jsonSchema.$schema;
  applyStrictObjects(jsonSchema);
  return jsonSchema;
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
  // const data = parsed.data;
  // const quota = user ? await consumeAiRequest(supabase) : await consumeGuestAiRequest(request);
  // if (quota !== "ok") return NextResponse.json({ error: quota === "limited" ? "You have reached the planning request limit. Please wait before generating another blueprint." : "AI request limits are temporarily unavailable. Please try again shortly." }, { status: quota === "limited" ? 429 : 503 });
  const data = parsed.data;

if (isAiRateLimitEnabled()) {
  const quota = user
    ? await consumeAiRequest(supabase)
    : await consumeGuestAiRequest(request);

  if (quota !== "ok") {
    return NextResponse.json(
      {
        error:
          quota === "limited"
            ? "You have reached the planning request limit. Please wait before generating another blueprint."
            : "AI request limits are temporarily unavailable. Please try again shortly.",
      },
      { status: quota === "limited" ? 429 : 503 },
    );
  }
}
  const context = { category: data.category, city: data.city, date: data.date, guestCount: data.guestCount, totalBudgetINR: data.totalBudget, budgetPerGuestINR: data.totalBudget / data.guestCount, venuePreference: data.venuePreference, styleTheme: data.styleTheme, requirements: data.requirements, preferences: data.preferences };
  const validateFeasibility = (text: string) => {
    try {
      const result = feasibilitySchema.safeParse(parseBlueprintResponse(text));
      if (!result.success) return { valid: false, issues: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.code}`) };
      const alternativeCost = result.data.suggestedPlan?.expenseBreakdown.reduce((total, expense) => total + expense.estimatedCost, 0);
      if (alternativeCost !== undefined && alternativeCost > data.totalBudget) return { valid: false, issues: ["suggestedPlan.expenseBreakdown: exceeds submitted budget"] };
      return { valid: true };
    }
    catch { return { valid: false, issues: ["response: invalid JSON"] }; }
  };
  const feasibilityJsonSchema = strictOutputJsonSchema(feasibilitySchema);
  const blueprintJsonSchema = strictOutputJsonSchema(blueprintSchema);
  let feasibility: ReturnType<typeof feasibilitySchema.parse>;
  try {
    const assessmentPrompt = `You are Evntora's budget-aware event feasibility planner for India. Assess the submitted event as a whole: event category/type, city, date and seasonal/logistical constraints, guest count, submitted INR budget and per-guest amount, venue preference, style/theme, requested food, decor, photography, entertainment, and every customer-specific requirement.

Before deciding feasibility, actively optimize a credible plan for the submitted budget. Start with practical, lower-cost choices where appropriate: community or cultural halls, modest banquet halls, outdoor/community spaces, standard catering, simple attractive decor, essential photography coverage, and local or low-cost entertainment. Do not presume a luxury hotel/resort, premium catering, elaborate florals, premium photography, or live performers are mandatory. Treat the user's explicit premium preference or requirement as requested; if it exceeds the budget, identify that exact preference and offer a lower-cost substitute with the trade-off. Avoid asking for a higher budget when changing optional preferences could solve the mismatch.

Use city and event-specific reasoning rather than a universal minimum or generic wedding assumptions. Estimate essential costs separately from optional upgrades and consider likely local variation. Give a plausible range and explicit assumptions; figures are planning estimates, never guaranteed prices, vendor quotes, or availability. Do not fabricate low estimates merely to call an event feasible.

Use feasible when a complete, reasonable version of the event fits the submitted budget, including after choosing practical affordable alternatives consistent with the user's requirements. Use partially_feasible when the core event can happen but one or more requested services, venue tiers, decor, catering, entertainment, photography, or other preferences need substitution or scale adjustment to fit. Even if the customer describes a premium service as required, that service is not an essential event requirement: use partially_feasible when the event remains possible with a clear disclosed substitute. In this case, return a structured suggestedPlan within budget whenever one can be estimated responsibly, and name each requested item that changes along with its trade-off. Use not_feasible only when non-negotiable core constraints make any responsible version impossible or fundamentally contradictory, such as a hard venue capacity below a simultaneous required guest count. Before returning not_feasible, try a budget-compatible alternative that preserves the event category and as many core requirements as possible; if a reasonable version exists, use partially_feasible and provide it. A low budget alone is not enough for not_feasible. A zero budget cannot cover essential event costs.

Return only JSON matching {"status":"feasible|partially_feasible|not_feasible","summary":"...","budgetAssessment":{"proposedBudget":number,"estimatedBudgetRange":{"low":number,"high":number},"budgetPerGuest":number,"explanation":"..."},"issues":[{"category":"...","severity":"critical|warning","explanation":"..."}],"suggestedAdjustments":[{"title":"...","description":"..."}],"assumptions":["..."],"confidence":"high|medium|low","suggestedPlan":null|{"eventScale":{"guestCount":integer,"description":"..."},"venueType":"...","cateringArrangement":"...","decorationAlternative":"...","photographyAlternative":"...","entertainmentAlternative":"...","expenseBreakdown":[{"category":"...","estimatedCost":integer,"description":"..."}],"totalEstimatedCost":integer,"remainingBudget":integer,"compromises":"..."}}. Provide suggestedPlan whenever a practical alternative can fit the submitted budget; set it to null only when there is no responsible affordable plan. The plan total must equal its expense breakdown and fit within the submitted budget; remainingBudget must equal submitted budget minus plan total. Keep issues and adjustments specific to this request; use warning for adjustable scope and critical only for genuinely impossible essentials. Context: ${JSON.stringify(context)}`;
    const raw = await generateText(assessmentPrompt, true, validateFeasibility, "blueprint", feasibilityJsonSchema);
    feasibility = feasibilitySchema.parse(parseBlueprintResponse(raw));
    feasibility.budgetAssessment.proposedBudget = data.totalBudget;
    feasibility.budgetAssessment.budgetPerGuest = data.totalBudget / data.guestCount;
    if (feasibility.suggestedPlan) {
      feasibility.suggestedPlan.totalEstimatedCost = feasibility.suggestedPlan.expenseBreakdown.reduce((total, expense) => total + expense.estimatedCost, 0);
      feasibility.suggestedPlan.remainingBudget = data.totalBudget - feasibility.suggestedPlan.totalEstimatedCost;
    }
    if (feasibility.status === "not_feasible" && !feasibility.suggestedPlan && data.totalBudget > 0) {
      const alternativeJsonSchema = strictOutputJsonSchema(suggestedEventPlanSchema);
      const validateAlternative = (text: string) => {
        try {
          const candidate = suggestedEventPlanSchema.safeParse(parseBlueprintResponse(text));
          if (!candidate.success) return { valid: false, issues: candidate.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.code}`) };
          const total = candidate.data.expenseBreakdown.reduce((sum, expense) => sum + expense.estimatedCost, 0);
          return total <= data.totalBudget ? { valid: true } : { valid: false, issues: ["expenseBreakdown: exceeds submitted budget"] };
        } catch { return { valid: false, issues: ["response: invalid JSON"] }; }
      };
      try {
        const alternativePrompt = `The initial assessment marked this event not feasible. Make one final event-specific attempt to find a realistic alternative within the exact submitted budget by substituting premium optional services and, only if needed, reducing guest scale. Preserve the event category, date, city, and as many core requirements as possible. A luxury venue, premium catering, elaborate decor, premium photography, or celebrity entertainment are not essential to holding an event; propose reasonable lower-cost choices for those when relevant. Respect physically or explicitly non-negotiable constraints, and return no alternative by returning null only if no credible plan can fit them. Do not fabricate prices. Provide only JSON shaped as {"suggestedPlan":null|{"eventScale":{"guestCount":integer,"description":"..."},"venueType":"...","cateringArrangement":"...","decorationAlternative":"...","photographyAlternative":"...","entertainmentAlternative":"...","expenseBreakdown":[{"category":"...","estimatedCost":integer,"description":"..."}],"totalEstimatedCost":integer,"remainingBudget":integer,"compromises":"..."}}. Expense items must sum approximately to the total, and the proposed plan must fit within the budget. Event details: ${JSON.stringify(context)}. Initial reasons this did not fit: ${JSON.stringify(feasibility.issues)}.`;
        const rawAlternative = await generateText(alternativePrompt, true, validateAlternative, "blueprint", alternativeJsonSchema);
        const parsedAlternative = z.object({ suggestedPlan: suggestedEventPlanSchema.nullable() }).safeParse(parseBlueprintResponse(rawAlternative));
        if (parsedAlternative.success && parsedAlternative.data.suggestedPlan) {
          const plan = parsedAlternative.data.suggestedPlan;
          plan.totalEstimatedCost = plan.expenseBreakdown.reduce((sum, expense) => sum + expense.estimatedCost, 0);
          plan.remainingBudget = data.totalBudget - plan.totalEstimatedCost;
          feasibility.suggestedPlan = plan;
          feasibility.status = "partially_feasible";
          feasibility.summary = "The requested scope exceeds the submitted budget, but the event can proceed with the alternative below.";
          feasibility.issues = feasibility.issues.map((issue) => ({ ...issue, severity: "warning" as const }));
          if (feasibility.suggestedAdjustments.length === 0) feasibility.suggestedAdjustments = [{ title: "Use the budget-fit alternative", description: plan.compromises }];
        }
      } catch (error) {
        console.info("[ai-blueprint] stage=alternative unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
      }
    }
    if (data.totalBudget === 0 && feasibility.status === "feasible") { feasibility.status = "not_feasible"; feasibility.summary = "A zero budget cannot cover essential event costs."; }
    const hasCriticalIssues = feasibility.issues.some((issue) => issue.severity === "critical");
    if (feasibility.status === "not_feasible" || (feasibility.status === "partially_feasible" && (!data.confirmLimitations || hasCriticalIssues))) {
      return NextResponse.json({ feasibility, blueprint: null });
    }
  } catch (error) {
    console.error("[ai-blueprint] stage=feasibility failed", { errorType: error instanceof Error ? error.name : "unknown" });
    const failure = getAiErrorResponse(error, "planning");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
  const prompt = `You are Evntora's budget-aware event planning assistant. Create a personalized, practical event blueprint for India that fits the submitted total budget. Allocate the budget first to essential event costs, then use the remaining amount for optional items. Prefer affordable practical options when needed: community/modest banquet venues, standard catering, simple attractive decor, essential photography coverage, and cost-effective entertainment. Honor the customer's explicit requirements; if this request is a refinement, revise the existing plan and make only requested changes. Never invent real vendors or venues. For venueRecommendations.name use generic venue formats, not a business name. All amounts are uncertain planning estimates, never quotes, listings, confirmed availability, or booked services. Do not invent implausibly low costs to force fit; if the requested scope cannot fit, explain that clearly in the plan and recommend reasonable substitutions. Follow legal/local cautions conservatively and advise checking with local authorities. Budget allocations should sum approximately to the submitted total. Do not claim any action or booking has happened.
Event context: ${JSON.stringify({ category: data.category, city: data.city, date: data.date, guestCount: data.guestCount, totalBudgetINR: data.totalBudget, venuePreference: data.venuePreference, theme: data.styleTheme, requirements: data.requirements, preferences: data.preferences })}
${data.previousBlueprint ? `Existing plan to refine: ${JSON.stringify(data.previousBlueprint).slice(0, 18000)}` : ""}
${data.refinement ? `Customer refinement request: ${data.refinement}` : ""}
Return this exact shape: {"blueprintId":"string","title":"string","executiveSummary":"string","themeAndAtmosphere":{"themeName":"string","colorPalette":[{"name":"string","hex":"#RRGGBB"}],"designNotes":"string"},"recommendedBudget":{"total":number,"breakdown":[{"category":"string","percentage":number,"amount":number,"description":"string"}]},"venueRecommendations":[{"name":"generic venue type, never a real business","city":"string","type":"string","capacity":"string","estimatedCost":"rough estimate label","highlight":"string"}],"culinaryStrategy":{"cuisineStyle":"string","recommendedCounters":["string"],"beverageHighlights":["string"]},"decorAndFloral":{"mandapOrStage":"string","lightingConcept":"string","floralSelections":["string"]},"photographyGuidelines":{"coverageType":"string","mustHaveShots":["string"]},"entertainmentProgram":{"welcomeAct":"string","mainPerformances":["string"],"afterParty":"string"},"runOfShowTimeline":[{"time":"string","activity":"string","location":"string","responsiblePerson":"string","notes":"string"}],"planningChecklist":[{"task":"string","timeframe":"string"}],"culturalAndLogisticalReminders":["string"]}. Include meaningful recommendations in each array. Keep the budget amounts and percentages consistent with the supplied total.`;
  try {
    const rawText = await generateText(prompt, true, validateBlueprintOutput, "blueprint", blueprintJsonSchema);
    const json = parseBlueprintResponse(rawText);
    const blueprint = blueprintSchema.safeParse(json);
    if (!blueprint.success) {
      // The shared provider validator should catch this; keep a defensive safe response here.
      console.error("[ai-blueprint] stage=final_validation issues", blueprint.error.issues.map((issue) => `${issue.path.join(".") || "response"}: ${issue.code}`));
      return NextResponse.json({ error: "The planning service could not create a complete plan. Please try again." }, { status: 502 });
    }
    const safeBlueprint: AIEventBlueprint = { ...blueprint.data, venueRecommendations: blueprint.data.venueRecommendations.map((venue, index) => ({ ...venue, name: `Venue format ${index + 1}` })) };
    return NextResponse.json({ feasibility, blueprint: safeBlueprint });
  } catch (error) {
    console.error("[ai-blueprint] stage=generation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    const failure = getAiErrorResponse(error, "planning");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
