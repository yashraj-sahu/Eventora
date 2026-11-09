import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-access";

export async function GET(request: Request) {
  const resource = new URL(request.url).searchParams.get("resource");
  const access = await requireAdminPermission(resource === "verification-documents" || resource === "verification-document-url" ? "vendor_verification" : "vendor_read", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (new URL(request.url).searchParams.get("resource") === "verification-documents") {
    const { data: documents, error: documentError } = await access.supabase.from("vendor_verification_documents").select("id,vendor_profile_id,document_type,status,rejection_reason,submitted_at,reviewed_at").order("submitted_at", { ascending: false }).limit(500);
    if (documentError) return NextResponse.json({ error: "Unable to load verification submissions" }, { status: 500 });
    return NextResponse.json({ documents: documents ?? [] });
  }
  if (resource === "verification-document-url") {
    const documentId = new URL(request.url).searchParams.get("id");
    if (!documentId || !/^[0-9a-f-]{36}$/i.test(documentId)) return NextResponse.json({ error: "A valid document ID is required." }, { status: 400 });
    try {
      const service = createServiceRoleSupabaseClient();
      const { data: document, error } = await service.from("vendor_verification_documents").select("storage_path").eq("id", documentId).maybeSingle();
      if (error || !document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
      const { data: signed, error: signedError } = await service.storage.from("vendor-documents").createSignedUrl(document.storage_path, 60);
      if (signedError || !signed) return NextResponse.json({ error: "Secure preview could not be created." }, { status: 503 });
      await service.from("admin_audit_log").insert({ actor_id: access.user.id, action: "vendor_document_accessed", target_type: "vendor_document", target_id: documentId });
      return NextResponse.json({ url: signed.signedUrl }, { headers: { "Cache-Control": "private, no-store" } });
    } catch { return NextResponse.json({ error: "Secure document access is unavailable." }, { status: 503 }); }
  }
  const { data, error } = await access.supabase.from("vendor_profiles").select("id,user_id,business_name,business_category,city,approval_status,is_published,is_verified,created_at,updated_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load listings" }, { status: 500 });
  return NextResponse.json({ vendors: data });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = body.id;
  const action = body.action;
  if (body.target === "vendor_document") {
    const access = await requireAdminPermission("vendor_verification", request);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(String(action))) return NextResponse.json({ error: "Invalid document review action" }, { status: 400 });
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if (action === "reject" && !reason) return NextResponse.json({ error: "Provide a reason when rejecting a document." }, { status: 400 });
    const { data, error } = await access.supabase.rpc("review_vendor_document", { p_document_id: id, p_action: String(action), p_reason: reason || null });
    if (error) return NextResponse.json({ error: error.code === "42501" ? "Vendor verification is not permitted." : error.code === "P0002" ? "Pending verification document not found." : "Unable to review verification document." }, { status: error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 400 });
    return NextResponse.json({ ok: true, document: data });
  }
  if (body.target === "vendor_listing") {
    const access = await requireAdminPermission("listing_moderation", request);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(String(action))) return NextResponse.json({ error: "Invalid vendor listing review action" }, { status: 400 });
    const { data, error } = await access.supabase.rpc("moderate_vendor_listing", { p_listing_id: id, p_action: String(action), p_reason: typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) || null : null });
    if (error) return NextResponse.json({ error: error.code === "P0002" ? "Pending vendor listing not found" : "Unable to review vendor listing" }, { status: error.code === "P0002" ? 404 : 400 });
    return NextResponse.json({ ok: true, listing: data });
  }
  const access = await requireAdminPermission("vendor_verification", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject", "suspend", "publish", "unpublish"].includes(String(action)))
    return NextResponse.json({ error: "Invalid listing action" }, { status: 400 });
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (action === "reject" && reason.length < 3) return NextResponse.json({ error: "Provide a reason when rejecting a vendor." }, { status: 400 });
  const { data, error } = await access.supabase.rpc("moderate_vendor_profile", { p_vendor_profile_id: id, p_action: String(action), p_reason: reason || null });
  if (error) return NextResponse.json({ error: error.code === "P0002" ? "Vendor profile not found." : error.code === "42501" ? "Vendor moderation is not permitted." : "Unable to update vendor visibility." }, { status: error.code === "P0002" ? 404 : error.code === "42501" ? 403 : 400 });
  return NextResponse.json({ ok: true, vendor: data });
}
