import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-access";

const input = z.object({ reviewId: z.string().uuid(), action: z.enum(["hide", "restore"]), reason: z.string().trim().min(3).max(1000) }).strict();

export async function PATCH(request: Request) {
  const access = await requireAdminPermission("support_read", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a review action and provide a reason." }, { status: 400 });
  const { data, error } = await access.supabase.rpc("moderate_vendor_review", {
    p_review_id: parsed.data.reviewId,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason,
  });
  if (error || !data) return NextResponse.json({ error: error?.code === "42501" ? "Review moderation is not permitted." : "The review could not be updated." }, { status: error?.code === "42501" ? 403 : error?.code === "P0002" ? 404 : 503 });
  const result = typeof data === "object" && data !== null ? data as { moderation_status?: string } : {};
  return NextResponse.json({ review: { id: parsed.data.reviewId, moderation_status: result.moderation_status } });
}
