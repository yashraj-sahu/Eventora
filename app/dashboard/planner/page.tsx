import { Suspense } from "react";
import { PlannerContent } from "@/components/planner/PlannerContent";

export default function CustomerPlannerPage() {
  return (
    <Suspense fallback={<div role="status" className="py-16 text-center text-sm">Loading AI Planner…</div>}>
      <PlannerContent embedded />
    </Suspense>
  );
}
