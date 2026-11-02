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
