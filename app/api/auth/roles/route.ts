import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export async function POST() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user) return NextResponse.json({ error: "Sign in to enable Customer access." }, { status: 401 });
  const { data, error: rpcError } = await supabase.rpc("enable_customer_access");
  if (rpcError || !data) return NextResponse.json({ error: "Customer access could not be enabled." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
