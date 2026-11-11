import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { normalizePhoneNumber } from "@/lib/phone-number";

const schema = z.object({ fullName: z.string().trim().min(1).max(120), phone: z.string().trim().min(1).max(40) }).strict();

export async function PUT(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your name and phone number." }, { status: 400 });
  const phone = normalizePhoneNumber(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid international phone number including country code." }, { status: 400 });
  const { data, error: updateError } = await supabase.from("profiles")
    .update({ full_name: parsed.data.fullName, phone })
    .eq("id", user.id).select("id,full_name,email,phone").maybeSingle();
  if (updateError || !data) return NextResponse.json({ error: "Profile changes could not be saved." }, { status: 503 });
  return NextResponse.json({ profile: data }, { headers: { "Cache-Control": "private, no-store" } });
}
