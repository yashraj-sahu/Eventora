import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in as a vendor." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "vendor")) return NextResponse.json({ error: "Vendor access is required." }, { status: 403 });
  const { id } = await params;
  const reviewId = z.string().uuid().safeParse(id);
  const body = z.object({ response: z.string().trim().min(2).max(2000) }).strict().safeParse(await request.json().catch(() => null));
  if (!reviewId.success || !body.success) return NextResponse.json({ error: "Enter a response up to 2,000 characters." }, { status: 400 });
  const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (vendorError) return NextResponse.json({ error: "Vendor profile could not be loaded." }, { status: 503 });
  if (!vendor) return NextResponse.json({ error: "Vendor business not found." }, { status: 404 });
  const { data, error: updateError } = await supabase.from("vendor_reviews").update({ vendor_response: body.data.response }).eq("id", id).eq("vendor_profile_id", vendor.id).select("id,vendor_response,responded_at").maybeSingle();
  if (updateError) return NextResponse.json({ error: "Review response could not be saved." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  return NextResponse.json({ review: data });
}
