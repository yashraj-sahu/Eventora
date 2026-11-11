import { Suspense } from "react";
import { PlannerContent } from "@/components/planner/PlannerContent";

export default function PlannerPage() {
  return (
    <Suspense fallback={<div role="status" className="min-h-[60vh] grid place-items-center text-sm">Loading AI Planner…</div>}>
      <PlannerContent />
    </Suspense>
  );
}
