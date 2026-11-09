import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-access";

const createInput = z.object({ subject: z.string().trim().min(3).max(180), description: z.string().trim().min(10).max(10000), bookingId: z.string().uuid().optional(), vendorProfileId: z.string().uuid().optional(), caseType: z.enum(["support", "review_report", "listing_report", "booking_complaint"]).default("support"), reviewId: z.string().uuid().optional(), listingId: z.string().uuid().optional() }).strict();
const updateInput = z.object({ id: z.string().uuid(), status: z.enum(["open","in_review","resolved","closed"]), assignedAdminId: z.string().uuid().nullable().optional(), resolution: z.string().trim().max(3000).nullable().optional(), internalNotes: z.string().trim().max(5000).nullable().optional() }).strict();
export async function GET(request: Request) {
  const adminRequest = new URL(request.url).searchParams.get("admin") === "1";
  if (adminRequest) {
    const access = await requireAdminPermission("support_read", request);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const params = new URL(request.url).searchParams;
    if (params.get("assignees") === "1") {
      try { const service=createServiceRoleSupabaseClient(); const [{data:assignments,error},{data:owners,error:ownerError}]=await Promise.all([service.from("admin_role_assignments").select("user_id").in("admin_role",["super_admin","support_admin"]).eq("is_active",true),service.from("user_roles").select("user_id").eq("role","platform_owner").eq("is_active",true)]); if(error||ownerError) throw error??ownerError; const ids=[...new Set([...(assignments??[]).map((item)=>item.user_id),...(owners??[]).map((item)=>item.user_id)])]; const {data:profiles,error:profileError}=ids.length?await service.from("profiles").select("id,full_name,email").in("id",ids):{data:[],error:null};if(profileError)throw profileError;return NextResponse.json({assignees:profiles??[]}); } catch { return NextResponse.json({error:"Assignee list is unavailable."},{status:503}); }
    }
    const page = Math.max(1, Number(params.get("page")) || 1);
    let query=access.supabase.from("support_cases").select("id,reporter_id,reporter_role,booking_id,vendor_profile_id,case_type,review_id,listing_id,subject,description,status,assigned_admin_id,resolution,internal_notes,resolved_at,created_at,updated_at", { count: "exact" }).order("created_at", { ascending: false });
    if(params.get("status")) query=query.eq("status",params.get("status")!);
    if(params.get("type")) query=query.eq("case_type",params.get("type")!);
    if(params.get("q")) query=query.ilike("subject",`%${params.get("q")!.trim().slice(0,100)}%`);
    const { data, error, count } = await query.range((page-1)*25,page*25-1);
    if (error) return NextResponse.json({ error: "Support cases are unavailable." }, { status: 503 });
    return NextResponse.json({ cases: data ?? [], total: count ?? 0, page, pageSize: 25 }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const { user, supabase, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("support_cases").select("id,reporter_role,booking_id,vendor_profile_id,case_type,review_id,listing_id,subject,description,status,resolution,resolved_at,created_at,updated_at").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Your support cases are unavailable." }, { status: 503 });
  return NextResponse.json({ cases: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = createInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a subject and a clear description." }, { status: 400 });
  const { data: roles, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (rolesError) return NextResponse.json({ error: "Account role could not be checked." }, { status: 503 });
  let reporterRole: "customer" | "vendor" | null = null;
  let relatedVendorProfileId: string | null = null;
  if (parsed.data.bookingId) {
    const { data: booking, error } = await supabase.from("bookings").select("id,customer_id,vendor_profile_id").eq("id", parsed.data.bookingId).maybeSingle();
    if (error || !booking) return NextResponse.json({ error: "The booking is unavailable to this account." }, { status: 404 });
    if (booking.customer_id === user.id && roles?.some((item) => item.role === "customer")) reporterRole = "customer";
    else if (booking.vendor_profile_id && roles?.some((item) => item.role === "vendor")) {
      const { data: vendor } = await supabase.from("vendor_profiles").select("id").eq("id", booking.vendor_profile_id).eq("user_id", user.id).maybeSingle();
      if (vendor) reporterRole = "vendor";
    }
    if (!reporterRole) return NextResponse.json({ error: "The booking is unavailable to this account." }, { status: 403 });
    relatedVendorProfileId = booking.vendor_profile_id;
  } else {
    reporterRole = roles?.some((item) => item.role === "customer") ? "customer" : roles?.some((item) => item.role === "vendor") ? "vendor" : null;
  }
  if (!reporterRole) return NextResponse.json({ error: "Customer or vendor access is required." }, { status: 403 });
  let vendorProfileId = parsed.data.vendorProfileId ?? null;
  if (reporterRole === "vendor") {
    const { data: vendor, error } = await supabase.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (error || !vendor) return NextResponse.json({ error: "Vendor profile was not found." }, { status: 403 });
    if (vendorProfileId && vendorProfileId !== vendor.id) return NextResponse.json({ error: "Vendor profile ownership could not be verified." }, { status: 403 });
    vendorProfileId = vendor.id;
    relatedVendorProfileId = vendor.id;
  }
  if (reporterRole === "customer" && parsed.data.vendorProfileId && !parsed.data.bookingId) {
    const { data: vendor, error } = await supabase.from("vendor_profiles").select("id").eq("id", parsed.data.vendorProfileId).eq("approval_status", "approved").eq("is_published", true).maybeSingle();
    if (error || !vendor) return NextResponse.json({ error: "The vendor is unavailable." }, { status: 404 });
    relatedVendorProfileId = vendor.id;
  }
  if (parsed.data.caseType === "review_report") {
    if (reporterRole !== "customer" || !parsed.data.reviewId) return NextResponse.json({ error: "A customer review must be selected to report it." }, { status: 400 });
    const { data: review, error } = await supabase.from("vendor_reviews").select("id,vendor_profile_id").eq("id", parsed.data.reviewId).maybeSingle();
    if (error || !review) return NextResponse.json({ error: "The review is unavailable." }, { status: 404 });
    relatedVendorProfileId = review.vendor_profile_id;
  }
  if (parsed.data.caseType === "listing_report") {
    if (reporterRole !== "customer" || !parsed.data.listingId) return NextResponse.json({ error: "A vendor listing must be selected to report it." }, { status: 400 });
    const { data: listing, error } = await supabase.from("vendor_listings").select("id,vendor_profile_id").eq("id", parsed.data.listingId).eq("status", "published").maybeSingle();
    if (error || !listing) return NextResponse.json({ error: "The listing is unavailable." }, { status: 404 });
    relatedVendorProfileId = listing.vendor_profile_id;
  }
  if (parsed.data.caseType === "review_report" && parsed.data.listingId || parsed.data.caseType === "listing_report" && parsed.data.reviewId || parsed.data.caseType === "support" && (parsed.data.reviewId || parsed.data.listingId)) return NextResponse.json({ error: "Report reference does not match the case type." }, { status: 400 });
  const { data, error } = await supabase.from("support_cases").insert({ reporter_id: user.id, reporter_role: reporterRole, booking_id: parsed.data.bookingId ?? null, vendor_profile_id: relatedVendorProfileId, case_type: parsed.data.caseType, review_id: parsed.data.reviewId ?? null, listing_id: parsed.data.listingId ?? null, subject: parsed.data.subject, description: parsed.data.description }).select("id,subject,status,created_at").single();
  if (error) return NextResponse.json({ error: "Support case could not be saved." }, { status: 503 });
  return NextResponse.json({ supportCase: data }, { status: 201 });
}
export async function PATCH(request: Request) {
  const access = await requireAdminPermission("support_read", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = updateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid support case update." }, { status: 400 });
  if (parsed.data.assignedAdminId) {
    const service = createServiceRoleSupabaseClient();
    const { data: role, error } = await service.from("admin_role_assignments").select("user_id,admin_role").eq("user_id", parsed.data.assignedAdminId).in("admin_role", ["super_admin", "support_admin"]).eq("is_active", true).maybeSingle();
    if (error || !role) return NextResponse.json({ error: "Assignee is not an active support administrator." }, { status: 400 });
  }
  const { data: before } = await access.supabase.from("support_cases").select("status,assigned_admin_id,resolution,internal_notes").eq("id", parsed.data.id).maybeSingle();
  const update: {status:string;assigned_admin_id?:string|null;resolution?:string|null;internal_notes?:string|null;resolved_at:string|null;updated_at:string}={status:parsed.data.status,resolved_at:parsed.data.status === "resolved" ? new Date().toISOString() : null,updated_at:new Date().toISOString()};
  if(parsed.data.assignedAdminId!==undefined)update.assigned_admin_id=parsed.data.assignedAdminId;
  if(parsed.data.resolution!==undefined)update.resolution=parsed.data.resolution;
  if(parsed.data.internalNotes!==undefined)update.internal_notes=parsed.data.internalNotes;
  const { data, error } = await access.supabase.from("support_cases").update(update).eq("id", parsed.data.id).select("id,status,assigned_admin_id,resolution,internal_notes,resolved_at").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Support case could not be updated." }, { status: 503 });
  const service = createServiceRoleSupabaseClient();
  const { error: auditError } = await service.from("admin_audit_log").insert({ actor_id: access.user.id, action: "support_case_updated", target_type: "support_case", target_id: data.id, before_data: before ?? null, after_data: data });
  if (auditError) console.error("[support-cases] audit write failed", { id: data.id, code: auditError.code });
  return NextResponse.json({ supportCase: data });
}
