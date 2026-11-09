import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("marketplace_categories").select("id,name,slug").eq("is_active", true).order("sort_order").order("name");
  if (error) return NextResponse.json({ error: "Marketplace categories are unavailable. Apply the platform settings migration." }, { status: 503 });
  return NextResponse.json({ categories: data ?? [] }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
