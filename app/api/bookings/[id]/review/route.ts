import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

type Context = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export async function GET(request: Request, { params }: Context) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const { data: booking } = await supabase.from("bookings").select("id").eq("id", id).eq("customer_id", user.id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const { data, error: readError } = await supabase.from("vendor_reviews_participant").select("id,rating,review_text,vendor_response,created_at").eq("booking_id", id).eq("customer_id", user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Review could not be loaded." }, { status: 503 });
  return NextResponse.json({ review: data ?? null });
}

export async function POST(request: Request, { params }: Context) {
  const { user, supabase, error } = await getAuthenticatedUser(request);
  if (!user || error) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const body = z.object({ rating: z.number().int().min(1).max(5), review: z.string().trim().min(2).max(2000) }).strict().safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a rating and write a review under 2,000 characters." }, { status: 400 });
  const { data: booking, error: bookingError } = await supabase.from("bookings").select("id,vendor_profile_id,status").eq("id", id).eq("customer_id", user.id).maybeSingle();
  if (bookingError) return NextResponse.json({ error: "Booking could not be checked." }, { status: 503 });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status !== "completed" || !booking.vendor_profile_id) return NextResponse.json({ error: "A review is available after the service is completed." }, { status: 409 });
  const { data, error: insertError } = await supabase.from("vendor_reviews").insert({ booking_id: booking.id, vendor_profile_id: booking.vendor_profile_id, customer_id: user.id, rating: body.data.rating, review_text: body.data.review }).select("id,rating,review_text,created_at").single();
  if (insertError) return NextResponse.json({ error: insertError.code === "23505" ? "A review already exists for this booking." : "Review could not be saved." }, { status: insertError.code === "23505" ? 409 : 400 });
  return NextResponse.json({ review: data }, { status: 201 });
}
