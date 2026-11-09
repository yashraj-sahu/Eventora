import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

async function access(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return { response: NextResponse.json({ error: "Sign in as a vendor." }, { status: 401 }) };
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return { response: NextResponse.json({ error: "Account access could not be verified." }, { status: 503 }) };
  if (!roles?.some((role) => role.role === "vendor")) return { response: NextResponse.json({ error: "Vendor access is required." }, { status: 403 }) };
  const { data: vendor, error: vendorError } = await supabase.from("vendor_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (vendorError) return { response: NextResponse.json({ error: "Vendor profile could not be loaded." }, { status: 503 }) };
  if (!vendor) return { response: NextResponse.json({ error: "Complete vendor onboarding first." }, { status: 404 }) };
  return { supabase, vendorId: vendor.id };
}

export async function GET(request: Request) {
  const allowed = await access(request); if ("response" in allowed) return allowed.response;
  const documentId = new URL(request.url).searchParams.get("documentId");
  if (documentId) {
    if (!z.string().uuid().safeParse(documentId).success) return NextResponse.json({ error: "Invalid document." }, { status: 400 });
    const { data: document, error: documentError } = await allowed.supabase.from("vendor_verification_documents").select("storage_path").eq("id", documentId).eq("vendor_profile_id", allowed.vendorId).maybeSingle();
    if (documentError) return NextResponse.json({ error: "Document could not be loaded." }, { status: 503 });
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const { data: signed, error: signedError } = await allowed.supabase.storage.from("vendor-documents").createSignedUrl(document.storage_path, 60);
    if (signedError || !signed) return NextResponse.json({ error: "Document preview could not be created." }, { status: 403 });
    return NextResponse.json({ url: signed.signedUrl }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const { data, error } = await allowed.supabase.from("vendor_verification_documents").select("id,document_type,status,rejection_reason,submitted_at,reviewed_at").eq("vendor_profile_id", allowed.vendorId).order("submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Verification records could not be loaded. Apply the vendor business migration." }, { status: 503 });
  return NextResponse.json({ documents: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const allowed = await access(request); if ("response" in allowed) return allowed.response;
  const form = await request.formData().catch(() => null);
  const documentType = z.string().trim().min(2).max(80).safeParse(form?.get("documentType"));
  const file = form?.get("file");
  if (!documentType.success || !(file instanceof File)) return NextResponse.json({ error: "Choose a document type and file." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Use a PDF or image up to 10 MB." }, { status: 400 });
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47;
  const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isWebp = String.fromCharCode(...signature.slice(0, 4)) === "RIFF" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  const isPdf = String.fromCharCode(...signature.slice(0, 5)) === "%PDF-";
  if (!(file.type === "image/png" && isPng) && !(file.type === "image/jpeg" && isJpeg) && !(file.type === "image/webp" && isWebp) && !(file.type === "application/pdf" && isPdf)) return NextResponse.json({ error: "The file content does not match its selected type." }, { status: 400 });
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${allowed.vendorId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await allowed.supabase.storage.from("vendor-documents").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Document upload failed. Ensure migration 015 and its private bucket policies are deployed." }, { status: 400 });
  const { data, error } = await allowed.supabase.from("vendor_verification_documents").insert({ vendor_profile_id: allowed.vendorId, document_type: documentType.data, storage_path: path }).select("id,status,document_type,submitted_at").single();
  if (error) { await allowed.supabase.storage.from("vendor-documents").remove([path]); return NextResponse.json({ error: "Document metadata could not be saved." }, { status: 400 }); }
  return NextResponse.json({ document: data }, { status: 201 });
}
