import { z } from "zod";

export const blueprintSchema = z.object({
  blueprintId: z.string(), title: z.string(), executiveSummary: z.string(),
  themeAndAtmosphere: z.object({ themeName: z.string(), colorPalette: z.array(z.object({ name: z.string(), hex: z.string() })).max(8), designNotes: z.string() }),
  recommendedBudget: z.object({ total: z.number(), breakdown: z.array(z.object({ category: z.string(), percentage: z.number(), amount: z.number(), description: z.string() })).max(20) }),
  venueRecommendations: z.array(z.object({ name: z.string(), city: z.string(), type: z.string(), capacity: z.string(), estimatedCost: z.string(), highlight: z.string() })).max(6),
  culinaryStrategy: z.object({ cuisineStyle: z.string(), recommendedCounters: z.array(z.string()).max(12), beverageHighlights: z.array(z.string()).max(12) }),
  decorAndFloral: z.object({ mandapOrStage: z.string(), lightingConcept: z.string(), floralSelections: z.array(z.string()).max(12) }),
  photographyGuidelines: z.object({ coverageType: z.string(), mustHaveShots: z.array(z.string()).max(15) }),
  entertainmentProgram: z.object({ welcomeAct: z.string(), mainPerformances: z.array(z.string()).max(12), afterParty: z.string() }),
  runOfShowTimeline: z.array(z.object({ time: z.string(), activity: z.string(), location: z.string(), responsiblePerson: z.string(), notes: z.string() })).max(30),
  planningChecklist: z.array(z.object({ task: z.string(), timeframe: z.string() })).max(30),
  culturalAndLogisticalReminders: z.array(z.string()).max(20),
});

export const suggestedEventPlanSchema = z.object({
    eventScale: z.object({
      guestCount: z.number().int().min(1).max(10_000),
      description: z.string().trim().min(1).max(400),
    }),
    venueType: z.string().trim().min(1).max(300),
    cateringArrangement: z.string().trim().min(1).max(500),
    decorationAlternative: z.string().trim().min(1).max(500),
    photographyAlternative: z.string().trim().min(1).max(500),
    entertainmentAlternative: z.string().trim().min(1).max(500),
    expenseBreakdown: z.array(z.object({
      category: z.string().trim().min(1).max(100),
      estimatedCost: z.number().finite().int().nonnegative().max(1_000_000_000),
      description: z.string().trim().min(1).max(400),
    })).min(1).max(10),
    totalEstimatedCost: z.number().finite().int().nonnegative().max(1_000_000_000),
    remainingBudget: z.number().finite().int().nonnegative().max(1_000_000_000),
    compromises: z.string().trim().min(1).max(1200),
});

export const feasibilitySchema = z.object({
  status: z.enum(["feasible", "partially_feasible", "not_feasible"]),
  summary: z.string().trim().min(1).max(1200),
  budgetAssessment: z.object({
    proposedBudget: z.number().finite().int().nonnegative().max(1_000_000_000),
    estimatedBudgetRange: z.object({
      low: z.number().finite().nonnegative().max(1_000_000_000),
      high: z.number().finite().nonnegative().max(1_000_000_000),
    }),
    budgetPerGuest: z.number().finite().nonnegative().max(1_000_000_000),
    explanation: z.string().trim().min(1).max(1200),
  }),
  issues: z.array(z.object({
    category: z.string().trim().min(1).max(100),
    severity: z.enum(["critical", "warning"]),
    explanation: z.string().trim().min(1).max(800),
  })).max(15),
  suggestedAdjustments: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(600),
  })).max(10),
  assumptions: z.array(z.string().trim().min(1).max(400)).max(15),
  confidence: z.enum(["high", "medium", "low"]),
  suggestedPlan: suggestedEventPlanSchema.nullable(),
}).superRefine((assessment, ctx) => {
  if (assessment.budgetAssessment.estimatedBudgetRange.low > assessment.budgetAssessment.estimatedBudgetRange.high) {
    ctx.addIssue({ code: "custom", path: ["budgetAssessment", "estimatedBudgetRange"], message: "Budget range is reversed" });
  }
  if (assessment.suggestedPlan) {
    const plan = assessment.suggestedPlan;
    const sum = plan.expenseBreakdown.reduce((total, item) => total + item.estimatedCost, 0);
    if (sum > assessment.budgetAssessment.proposedBudget) {
      ctx.addIssue({ code: "custom", path: ["suggestedPlan", "totalEstimatedCost"], message: "Suggested plan must fit the submitted budget" });
    }
  }
});

export type AIFeasibilityAssessment = z.infer<typeof feasibilitySchema>;
