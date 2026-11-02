import "server-only";
import type { createServerSupabaseClient } from "@/lib/supabase-server";

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;
/** Atomically records a request using auth.uid() inside the database function. */
export async function consumeAiRequest(supabase: Supabase) {
  const { data, error } = await supabase.rpc("consume_ai_request");
  if (error) return "unavailable" as const;
  return data ? "ok" as const : "limited" as const;
}
