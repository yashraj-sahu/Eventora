import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { createServerSupabaseClient } from "@/lib/supabase-server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;
/** Atomically records a request using auth.uid() inside the database function. */
export async function consumeAiRequest(supabase: Supabase) {
  const { data, error } = await supabase.rpc("consume_ai_request");
  if (error) return "unavailable" as const;
  return data ? "ok" as const : "limited" as const;
}

function clientIpFromTrustedProxy(request: Request) {
  // Use only the deployment platform's forwarded client-IP header; do not trust caller-supplied X-Forwarded-For.
  const forwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (!forwarded) return null;
  const address = forwarded.trim().replace(/^\[|\]$/g, "");
  return isIP(address) ? address : null;
}

/** Guest identity is a keyed digest of the platform-provided client IP; the address itself is never persisted. */
export async function consumeGuestAiRequest(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ip = clientIpFromTrustedProxy(request);
  if (!serviceKey || !ip) return "unavailable" as const;
  try {
    const fingerprint = createHmac("sha256", serviceKey).update(ip).digest("hex");
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase.rpc("consume_ai_guest_request", { p_fingerprint: fingerprint });
    if (error) return "unavailable" as const;
    return data ? "ok" as const : "limited" as const;
  } catch {
    return "unavailable" as const;
  }
}

export function isAiRateLimitEnabled() {
  return process.env.AI_RATE_LIMIT_ENABLED !== "false";
}