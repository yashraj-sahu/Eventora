import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export async function PATCH(request: Request) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Invalid vendor profile" }, { status: 400 });
  const required = ["business_name", "business_category", "city"] as const;
  for (const key of required) if (typeof body[key] !== "string" || !String(body[key]).trim() || String(body[key]).length > (key === "business_name" ? 160 : 120)) return NextResponse.json({ error: `Valid ${key.replaceAll("_", " ")} required` }, { status: 400 });
  const coverImageUrl = typeof body.cover_image_url === "string" ? body.cover_image_url.trim() : "";
  if (coverImageUrl) {
    try { const parsed = new URL(coverImageUrl, new URL(request.url).origin); if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(); }
    catch { return NextResponse.json({ error: "Provide a valid business cover image URL." }, { status: 400 }); }
  }
  const { data, error } = await supabase.from("vendor_profiles").update({
    business_name: String(body.business_name).trim(), business_category: String(body.business_category).trim(), city: String(body.city).trim(),
    business_description: typeof body.business_description === "string" ? body.business_description.trim().slice(0, 5000) : null,
    address: typeof body.address === "string" ? body.address.trim().slice(0, 300) : null,
    contact_phone: typeof body.contact_phone === "string" ? body.contact_phone.trim().slice(0, 40) : null,
    contact_email: typeof body.contact_email === "string" ? body.contact_email.trim().toLowerCase().slice(0, 254) : null,
    short_bio: typeof body.short_bio === "string" ? body.short_bio.trim().slice(0, 300) : null,
    cover_image_url: coverImageUrl || null,
  }).eq("id", body.id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Unable to update vendor profile" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
