import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { user, supabase: client, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.vendorId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.vendorId) || !["service", "package"].includes(String(body.kind)))
    return NextResponse.json({ error: "Invalid vendor item" }, { status: 400 });
  const { data: vendor } = await client.from("vendor_profiles").select("id").eq("id", body.vendorId).eq("user_id", user.id).maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Vendor listing not found" }, { status: 404 });
  const table = body.kind === "service" ? "vendor_services" : "vendor_packages";
  if (["activate", "deactivate"].includes(String(body.action)) && typeof body.id === "string") {
    const { error } = await client.from(table).update({ is_active: body.action === "activate" }).eq("id", body.id).eq("vendor_profile_id", vendor.id);
    if (error) return NextResponse.json({ error: "Unable to update item status" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (body.action === "delete" && typeof body.id === "string") {
    const { error } = await client.from(table).delete().eq("id", body.id).eq("vendor_profile_id", vendor.id);
    if (error) return NextResponse.json({ error: "Unable to remove item" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (!name || name.length > 160) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const common = { name, description: typeof body.description === "string" ? body.description.trim().slice(0, 2000) : null, is_active: body.is_active !== false };
  let result;
  if (body.kind === "service") {
    result = typeof body.id === "string"
      ? await client.from("vendor_services").update(common).eq("id", body.id).eq("vendor_profile_id", vendor.id)
      : await client.from("vendor_services").insert({ ...common, vendor_profile_id: vendor.id });
  } else {
    const price = Number(body.price);
    if (!Number.isSafeInteger(price) || price < 0) return NextResponse.json({ error: "Enter a valid price in paise" }, { status: 400 });
    const features = Array.isArray(body.features) ? body.features.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 160)).filter(Boolean).slice(0, 30) : [];
    const packageData = { ...common, price, features };
    result = typeof body.id === "string"
      ? await client.from("vendor_packages").update(packageData).eq("id", body.id).eq("vendor_profile_id", vendor.id)
      : await client.from("vendor_packages").insert({ ...packageData, vendor_profile_id: vendor.id });
  }
  if (result.error) return NextResponse.json({ error: "Unable to save item" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
