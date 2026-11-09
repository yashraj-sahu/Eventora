import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";

const permissions: Record<string, "user_read" | "vendor_read" | "vendor_verification" | "listing_moderation" | "booking_support" | "finance_read" | "support_read"> = {
  users: "user_read", vendors: "vendor_read", verifications: "vendor_verification", listings: "listing_moderation", bookings: "booking_support", payments: "finance_read", refunds: "finance_read", reviews: "support_read",
};
const pageSize = 25;
type Row = Record<string, unknown> & { id?: string | number };
const sortable: Record<string, string[]> = {
  users: ["full_name", "email", "created_at"],
  vendors: ["business_name", "business_category", "city", "approval_status", "created_at"],
  verifications: ["document_type", "status", "submitted_at", "reviewed_at"],
  listings: ["name", "category", "status", "starting_price", "updated_at"],
  bookings: ["booking_reference", "event_date", "event_city", "total_amount", "status", "created_at"],
  payments: ["amount", "status", "purpose", "created_at"],
  refunds: ["amount", "status", "created_at"],
  reviews: ["rating", "created_at"],
};
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") ?? "";
  const permission = permissions[resource];
  if (!permission) return NextResponse.json({ error: "Unknown records collection." }, { status: 400 });
  let access = await requireAdminPermission(permission, request);
  if (!access.ok && access.status === 403 && resource === "bookings") access = await requireAdminPermission("finance_read", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const detailId = searchParams.get("detailId");
  if (detailId && (resource === "bookings" || resource === "listings")) {
    if (!z.string().uuid().safeParse(detailId).success) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
    if (resource === "bookings") {
      const [{ data: booking, error: bookingError }, { data: history, error: historyError }] = await Promise.all([
        access.supabase.from("bookings").select("id,booking_reference,customer_id,event_id,vendor_profile_id,vendor_name,vendor_category,package_name,event_date,event_city,guest_count,total_amount,advance_amount,paid_amount,currency,status,created_at,updated_at").eq("id", detailId).maybeSingle(),
        access.supabase.from("booking_status_history").select("id,actor_role,from_status,to_status,reason,created_at").eq("booking_id", detailId).order("created_at", { ascending: true }),
      ]);
      if (bookingError || historyError) return NextResponse.json({ error: "Booking details are unavailable." }, { status: 503 });
      if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      return NextResponse.json({ record: booking, history: history ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const [{ data: listing, error: listingError }, auditResult] = await Promise.all([
      access.supabase.from("vendor_listings").select("id,vendor_profile_id,name,category,subcategory,description,pricing_model,starting_price,status,moderation_note,submitted_at,reviewed_at,created_at,updated_at").eq("id", detailId).maybeSingle(),
      Promise.resolve().then(() => { try { return createServiceRoleSupabaseClient().from("admin_audit_log").select("id,actor_id,action,reason,before_data,after_data,created_at").eq("target_type", "vendor_listing").eq("target_id", detailId).order("created_at", { ascending: true }); } catch { return null; } }),
    ]);
    if (listingError || !listing) return NextResponse.json({ error: "Listing details are unavailable." }, { status: listingError ? 503 : 404 });
    if (!auditResult) return NextResponse.json({ error: "Listing moderation history requires server database configuration." }, { status: 503 });
    const { data: history, error: historyError } = await auditResult;
    if (historyError) return NextResponse.json({ error: "Listing moderation history is unavailable." }, { status: 503 });
    return NextResponse.json({ record: listing, history: history ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const status = searchParams.get("status");
  const requestedSort = searchParams.get("sort") ?? "";
  const sort = (sortable[resource] ?? []).includes(requestedSort) ? requestedSort : resource === "listings" ? "updated_at" : resource === "verifications" ? "submitted_at" : "created_at";
  const ascending = searchParams.get("direction") === "asc";
  const from = (page - 1) * pageSize;
  let query: any;
  if (resource === "users") {
    const [{ data, error }, { data: canManageUsers, error: permissionError }] = await Promise.all([
      access.supabase.rpc("admin_user_directory", { p_search: q || null, p_role: status || null, p_limit: pageSize, p_offset: from, p_sort: sort, p_direction: ascending ? "asc" : "desc" }),
      access.supabase.rpc("has_admin_permission", { p_permission: "user_manage" }),
    ]);
    if (error) return NextResponse.json({ error: error.code === "42501" ? "User records are not permitted." : "User records are unavailable." }, { status: error.code === "42501" ? 403 : 503 });
    if (permissionError) return NextResponse.json({ error: "User-management permissions could not be checked." }, { status: 503 });
    const result = data as { rows?: Row[]; total?: number } | null;
    return NextResponse.json({ rows: result?.rows ?? [], total: result?.total ?? 0, page, pageSize, canManageUsers: Boolean(canManageUsers) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  switch (resource) {
    case "vendors": query = access.supabase.from("vendor_profiles").select("id,user_id,business_name,business_category,city,approval_status,is_published,is_verified,created_at,updated_at", { count: "exact" }); if (q) query = query.ilike("business_name", `%${q}%`); if (status) query = query.eq("approval_status", status); break;
    case "verifications": query = access.supabase.from("vendor_verification_documents").select("id,vendor_profile_id,document_type,status,rejection_reason,submitted_at,reviewed_at", { count: "exact" }); if (status) query = query.eq("status", status); break;
    case "listings": query = access.supabase.from("vendor_listings").select("id,vendor_profile_id,name,category,subcategory,description,pricing_model,starting_price,status,moderation_note,submitted_at,reviewed_at,created_at,updated_at", { count: "exact" }); if (q) query = query.ilike("name", `%${q}%`); if (status) query = query.eq("status", status); break;
    case "bookings": query = access.supabase.from("bookings").select("id,booking_reference,customer_id,event_id,vendor_id,vendor_profile_id,vendor_name,vendor_category,package_name,event_date,event_city,guest_count,total_amount,advance_amount,paid_amount,currency,status,created_at,updated_at", { count: "exact" }); if (q) query = query.ilike("booking_reference", `%${q}%`); if (status) query = query.eq("status", status); break;
    case "payments": query = access.supabase.from("payments").select("id,booking_id,customer_id,razorpay_order_id,razorpay_payment_id,amount,currency,status,purpose,payment_method,verified_at,created_at", { count: "exact" }); if (status) query = query.eq("status", status); break;
    case "refunds": query = access.supabase.from("refunds").select("id,payment_id,booking_id,amount,status,reason,created_at,updated_at", { count: "exact" }); if (status) query = query.eq("status", status); break;
    case "reviews": query = access.supabase.from("vendor_reviews").select("id,vendor_profile_id,rating,review_text,vendor_response,moderation_status,created_at", { count: "exact" }); if (q) query = query.ilike("review_text", `%${q}%`); if (status) query = query.eq("moderation_status", status); break;
    default: return NextResponse.json({ error: "Unknown records collection." }, { status: 400 });
  }
  query = query.order(sort, { ascending }).order("id", { ascending: true });
  const result = await query.range(from, from + pageSize - 1);
  if (result.error) return NextResponse.json({ error: "Records are unavailable." }, { status: 503 });
  return NextResponse.json({ rows: result.data ?? [], total: result.count ?? 0, page, pageSize }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requireAdminPermission("user_manage", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = z.object({ userId: z.string().uuid(), role: z.enum(["customer", "vendor"]), active: z.boolean(), reason: z.string().trim().max(1000).optional() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.active && (parsed.data.reason ?? "").length < 3)) return NextResponse.json({ error: "Choose a customer or vendor workspace and provide a reason to suspend access." }, { status: 400 });
  const { data, error } = await access.supabase.rpc("admin_set_user_role_active", { p_user_id: parsed.data.userId, p_role: parsed.data.role, p_active: parsed.data.active, p_reason: parsed.data.reason ?? null });
  if (error || !data) return NextResponse.json({ error: error?.code === "42501" ? "This workspace access cannot be changed." : error?.code === "P0002" ? "User workspace membership was not found." : "User workspace access could not be changed." }, { status: error?.code === "42501" ? 403 : error?.code === "P0002" ? 404 : 503 });
  return NextResponse.json({ ok: true });
}
