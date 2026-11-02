import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { ensureVendorApplication } from "@/lib/vendor-registration";

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in to submit your vendor application." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid body");
    body = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Enter valid business details and try again." }, { status: 400 });
  }

  const asText = (value: unknown) => typeof value === "string" ? value : "";
  try {
    const result = await ensureVendorApplication(supabase, user, {
      businessName: asText(body.businessName),
      category: asText(body.category),
      city: asText(body.city),
      description: asText(body.description),
      address: asText(body.address),
      phone: asText(body.phone),
    });
    return NextResponse.json({ ok: true, ...result }, { status: result.alreadyExists ? 200 : 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Your vendor application could not be submitted.";
    const status = message.startsWith("Verify the account email") ? 403 : message.startsWith("We couldn’t check") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
