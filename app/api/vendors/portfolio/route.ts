import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") || "";
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)) return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
  const { user, supabase: client } = await getAuthenticatedUser(request);
  const { data: image } = await client.from("vendor_portfolio").select("id,vendor_profile_id").eq("storage_path", path).maybeSingle();
  if (!image) return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  if (!user) {
    const { data: publicVendor } = await client.from("vendor_profiles").select("id").eq("id", image.vendor_profile_id).eq("approval_status", "approved").eq("is_published", true).maybeSingle();
    if (!publicVendor) return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  }
  const { data, error } = await client.storage.from("vendor-portfolio").download(path);
  if (error || !data) return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  return new Response(data, { headers: { "Content-Type": data.type || "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  const { user, supabase: client, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const vendorId = form?.get("vendorId"); const file = form?.get("file");
  if (typeof vendorId !== "string" || !/^[0-9a-f-]{36}$/i.test(vendorId) || !(file instanceof File)) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Use a JPEG, PNG or WebP image up to 5 MB" }, { status: 400 });
  const { data: vendor } = await client.from("vendor_profiles").select("id").eq("id", vendorId).eq("user_id", user.id).maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Vendor listing not found" }, { status: 404 });
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${vendor.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("vendor-portfolio").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Unable to upload image. Check Storage migration status." }, { status: 400 });
  const imageUrl = `/api/vendors/portfolio?path=${encodeURIComponent(path)}`;
  const caption = typeof form?.get("caption") === "string" ? String(form.get("caption")).trim().slice(0, 300) : "";
  const { data, error } = await client.from("vendor_portfolio").insert({ vendor_profile_id: vendor.id, storage_path: path, public_url: imageUrl, caption: caption || null }).select("id").single();
  if (error) { await client.storage.from("vendor-portfolio").remove([path]); return NextResponse.json({ error: "Unable to save portfolio image" }, { status: 400 }); }
  return NextResponse.json({ id: data.id, public_url: imageUrl }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { user, supabase: client, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: { id?: unknown; caption?: unknown; sort_order?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  if (body.caption !== undefined && (typeof body.caption !== "string" || body.caption.length > 300)) return NextResponse.json({ error: "Caption must be 300 characters or fewer" }, { status: 400 });
  if (body.sort_order !== undefined && (!Number.isSafeInteger(body.sort_order) || Number(body.sort_order) < 0 || Number(body.sort_order) > 10000)) return NextResponse.json({ error: "Invalid image position" }, { status: 400 });
  const { data: image } = await client.from("vendor_portfolio").select("id,vendor_profile_id,storage_path").eq("id", body.id).maybeSingle();
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  const { data: vendor } = await client.from("vendor_profiles").select("id").eq("id", image.vendor_profile_id).eq("user_id", user.id).maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const imageUrl = `/api/vendors/portfolio?path=${encodeURIComponent(image.storage_path)}`;
  const { error: coverError } = await client.from("vendor_profiles").update({ cover_image_url: null }).eq("id", vendor.id).eq("user_id", user.id).eq("cover_image_url", imageUrl);
  if (coverError) return NextResponse.json({ error: "The image is still set as the business cover and could not be cleared." }, { status: 400 });
  const update: { caption?: string | null; sort_order?: number } = {};
  if (body.caption !== undefined) update.caption = String(body.caption).trim() || null;
  if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order);
  const { error } = await client.from("vendor_portfolio").update(update).eq("id", image.id).eq("vendor_profile_id", vendor.id);
  if (error) return NextResponse.json({ error: "Unable to update portfolio item" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { user, supabase: client, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let id: unknown; try { id = (await request.json()).id; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  const { data: image } = await client.from("vendor_portfolio").select("id,storage_path,vendor_profile_id").eq("id", id).maybeSingle();
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  const { data: vendor } = await client.from("vendor_profiles").select("id").eq("id", image.vendor_profile_id).eq("user_id", user.id).maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const { error: removeError } = await client.storage.from("vendor-portfolio").remove([image.storage_path]);
  if (removeError) return NextResponse.json({ error: "Unable to remove image" }, { status: 400 });
  const { error } = await client.from("vendor_portfolio").delete().eq("id", image.id);
  if (error) return NextResponse.json({ error: "Unable to remove image record" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
