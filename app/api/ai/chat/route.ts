import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { generateText, getAiErrorResponse } from "@/lib/gemini";
import { consumeAiRequest } from "@/lib/ai-rate-limit";
import { blueprintSchema } from "@/lib/ai-schemas";

export const runtime = "nodejs";
const schema = z.object({ message: z.string().trim().min(1).max(2000), conversationId: z.string().uuid().optional(), eventId: z.string().uuid().optional(), plannerContext: z.object({ category: z.string().max(80), city: z.string().max(100), date: z.string().date(), guestCount: z.number().int().min(1).max(10000), totalBudget: z.number().int().min(0).max(1_000_000_000), venuePreference: z.string().max(300), styleTheme: z.string().max(300), requirements: z.string().max(4000), blueprint: z.record(z.string(), z.unknown()) }).optional() });

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to access your conversations." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "Account access could not be verified." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access to use the assistant." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("conversationId");
  if (id) {
    const { data: conversation, error } = await supabase.from("ai_conversations").select("id,event_id,title,created_at,updated_at").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Conversation history is unavailable." }, { status: 503 });
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const { data: messages, error: messageError } = await supabase.from("ai_messages").select("id,role,content,created_at").eq("conversation_id", id).order("created_at");
    if (messageError) return NextResponse.json({ error: "Conversation history is unavailable." }, { status: 503 });
    return NextResponse.json({ conversation, messages: messages ?? [] });
  }
  const { data, error } = await supabase.from("ai_conversations").select("id,event_id,title,created_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: "Conversation history is unavailable. Apply the AI planning migration and retry." }, { status: 503 });
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in with Customer access to use the assistant." }, { status: 401 });
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);
  if (roleError) return NextResponse.json({ error: "We could not verify your account access. Please try again." }, { status: 503 });
  if (!roles?.some((role) => role.role === "customer")) return NextResponse.json({ error: "Enable Customer access to use event planning assistance." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a question of up to 2,000 characters." }, { status: 400 });
  const { message, conversationId, plannerContext } = parsed.data;
  const quota = await consumeAiRequest(supabase);
  if (quota !== "ok") return NextResponse.json({ error: quota === "limited" ? "You have reached the assistant request limit. Please wait a minute and try again." : "AI request limits are temporarily unavailable. Please try again." }, { status: quota === "limited" ? 429 : 503 });
  let eventId = parsed.data.eventId ?? null;
  if (conversationId) {
    const { data: existing, error } = await supabase.from("ai_conversations").select("id,event_id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Conversation history is temporarily unavailable." }, { status: 503 });
    if (!existing) return NextResponse.json({ error: "This conversation is unavailable." }, { status: 404 });
    if (parsed.data.eventId && eventId !== existing.event_id) return NextResponse.json({ error: "Start a new conversation to change its event context." }, { status: 400 });
    eventId = existing.event_id ?? eventId;
  }
  let eventContext: unknown = null;
  if (eventId) {
    const { data, error } = await supabase.from("events").select("id,title,category,city,date,guest_count,total_budget,venue_preference,style_theme,planning_requirements,blueprint").eq("id", eventId).eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Event details are temporarily unavailable." }, { status: 503 });
    if (!data) return NextResponse.json({ error: "That event is unavailable." }, { status: 404 });
    eventContext = data;
  }
  let currentConversation = conversationId;
  if (!currentConversation) {
    const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, event_id: eventId, title: message.slice(0, 90) }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "Conversation history could not be started. Apply the AI planning migration and retry." }, { status: 503 });
    currentConversation = data.id;
  }
  const { data: history, error: historyError } = await supabase.from("ai_messages").select("role,content").eq("conversation_id", currentConversation).order("created_at", { ascending: false }).limit(12);
  if (historyError) return NextResponse.json({ error: "Conversation history is temporarily unavailable." }, { status: 503 });
  const { data: memories, error: memoryError } = await supabase.from("ai_memories").select("memory_type,content").eq("user_id", user.id).eq("is_enabled", true).or(eventId ? `event_id.is.null,event_id.eq.${eventId}` : "event_id.is.null").limit(30);
  if (memoryError) return NextResponse.json({ error: "Saved planning preferences are temporarily unavailable." }, { status: 503 });
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Your account profile is temporarily unavailable." }, { status: 503 });

  const { data: bookings, error: bookingsError } = eventId
    ? await supabase.from("bookings").select("booking_reference,vendor_name,vendor_category,status,event_date,event_city,total_amount,paid_amount,currency").eq("customer_id", user.id).eq("event_id", eventId).limit(20)
    : await supabase.from("bookings").select("booking_reference,vendor_name,vendor_category,status,event_date,event_city,total_amount,paid_amount,currency").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(10);
  if (bookingsError) return NextResponse.json({ error: "Booking information is temporarily unavailable." }, { status: 503 });
  const budgetAndBookingContext = { bookings: (bookings ?? []).map((booking) => ({ reference: booking.booking_reference, vendor: booking.vendor_name, category: booking.vendor_category, status: booking.status, date: booking.event_date, city: booking.event_city, amountPaise: booking.total_amount, paidPaise: booking.paid_amount, currency: booking.currency })) };
  const { data: savedRows, error: savedError } = await supabase.from("vendor_saves").select("vendor_profile_id").eq("user_id", user.id).limit(100);
  if (savedError) return NextResponse.json({ error: "Your saved vendors are temporarily unavailable." }, { status: 503 });
  const savedIds = (savedRows ?? []).map((row) => row.vendor_profile_id);
  const { data: savedVendorRows, error: savedVendorError } = savedIds.length
    ? await supabase.from("vendor_profiles").select("id,business_name,business_category,city").in("id", savedIds).eq("approval_status", "approved").eq("is_published", true)
    : { data: [], error: null };
  if (savedVendorError) return NextResponse.json({ error: "Your saved vendors are temporarily unavailable." }, { status: 503 });
  const savedVendorQuestion = /\b(shortlist|saved vendors?|bookmarks?)\b/i.test(message);
  const vendorSearch = /\b(find|search|show|recommend|suggest|looking for|browse|photograph|decorator|caterer|venue|florist|makeup)\b/i.test(message);
  let marketplaceRows: Array<{ id: string; business_name: string; business_category: string; city: string; starting_price: number; price_unit: string; business_description: string | null }> = [];
  let marketplaceContext: unknown[] = [];
  if (vendorSearch) {
    const { data: listings, error: listingError } = await supabase.from("vendor_profiles").select("id,business_name,business_category,city,starting_price,price_unit,business_description").eq("approval_status", "approved").eq("is_published", true).limit(200);
    if (listingError) return NextResponse.json({ error: "Marketplace records are temporarily unavailable." }, { status: 503 });
    const lowercaseQuestion = message.toLowerCase();
    const cityTerms = new Set((listings ?? []).map((listing) => listing.city).filter((city) => lowercaseQuestion.includes(city.toLowerCase())));
    const categoryTerms: Record<string, string[]> = { photographer: ["photo", "cinema"], photography: ["photo", "cinema"], decorator: ["decor"], catering: ["cater", "food"], caterer: ["cater", "food"], venue: ["venue", "estate"], florist: ["flor"], makeup: ["makeup", "beauty"] };
    const terms = Object.entries(categoryTerms).find(([needle]) => lowercaseQuestion.includes(needle))?.[1];
    marketplaceRows = (listings ?? []).filter((listing) => (!cityTerms.size || cityTerms.has(listing.city)) && (!terms || terms.some((term) => listing.business_category.toLowerCase().includes(term)))).slice(0, 8);
    const ids = marketplaceRows.map((listing) => listing.id);
    if (ids.length) {
      const [services, packages] = await Promise.all([
        supabase.from("vendor_services").select("vendor_profile_id,name,description").in("vendor_profile_id", ids).eq("is_active", true),
        supabase.from("vendor_packages").select("vendor_profile_id,name,description,price,price_display,features").in("vendor_profile_id", ids).eq("is_active", true),
      ]);
      if (services.error || packages.error) return NextResponse.json({ error: "Marketplace service information is temporarily unavailable." }, { status: 503 });
      marketplaceContext = marketplaceRows.map((vendor) => ({ ...vendor, activeServices: (services.data ?? []).filter((item) => item.vendor_profile_id === vendor.id).map(({ name, description }) => ({ name, description })), activePackages: (packages.data ?? []).filter((item) => item.vendor_profile_id === vendor.id).map(({ name, description, price, price_display, features }) => ({ name, description, price, priceDisplay: price_display, features })) }));
    }
  }
  const prompt = `You are Evntora's AI planning assistant. Answer the customer's latest message clearly and helpfully. Use the supplied records as the only source for personal events, budgets, bookings, vendors, reviews, prices, and availability. Never invent a record, rating, price, availability, booking, payment state, legal fact, or action. If the data is absent, say that it is not available in their account or ask a focused clarification. You may provide general planning ideas, clearly distinguish them from verified marketplace data, and never execute bookings or payments. Keep event context isolated to the selected event. Saved memories are explicitly user-provided preferences; use only when relevant. Remaining spend outside of the recorded bookings cannot be verified because there is no trusted expense ledger in this database.
Customer profile name: ${profile?.full_name || "not provided"}
Selected event data: ${JSON.stringify(eventContext)}
Account booking records: ${JSON.stringify(budgetAndBookingContext)}
Customer saved published vendors: ${JSON.stringify(savedVendorRows ?? [])}
Published marketplace matches and active services/packages for vendor searches: ${JSON.stringify(marketplaceContext)}
Availability records: none are configured in the current schema; never state that a vendor is available.
Saved personal/event preferences: ${JSON.stringify(memories ?? [])}
Recent conversation: ${JSON.stringify([...(history ?? []).reverse(), { role: "user", content: message }])}
Answer the latest question only, respecting the preceding context.`;
  try {
    let answer: string;
    let refinedBlueprint: unknown;
    if (plannerContext) {
      const result = await generateText(`${prompt}\nPlanner form context and current blueprint: ${JSON.stringify(plannerContext)}\nReturn JSON only with {"answer": string, "blueprint": object}. The blueprint must retain the existing blueprint structure, make only changes requested by the customer, retain unrelated plan details, use INR, and never claim vendor bookings, quotes, or availability.`, true);
      let parsedOutput: unknown;
      try { parsedOutput = JSON.parse(result); } catch { return NextResponse.json({ error: "The plan could not be updated in this response. Please try again." }, { status: 502 }); }
      const output = z.object({ answer: z.string().min(1).max(4000), blueprint: z.record(z.string(), z.unknown()) }).safeParse(parsedOutput);
      if (!output.success) return NextResponse.json({ error: "The plan update was incomplete. Please try again." }, { status: 502 });
      const checkedBlueprint = blueprintSchema.safeParse(output.data.blueprint);
      if (!checkedBlueprint.success) return NextResponse.json({ error: "The plan update was incomplete. Please try again." }, { status: 502 });
      answer = output.data.answer; refinedBlueprint = { ...checkedBlueprint.data, venueRecommendations: checkedBlueprint.data.venueRecommendations.map((venue, index) => ({ ...venue, name: `Venue format ${index + 1}` })) };
    } else answer = await generateText(prompt);
    const { error: userInsertError } = await supabase.from("ai_messages").insert([{ conversation_id: currentConversation, role: "user", content: message }, { conversation_id: currentConversation, role: "assistant", content: answer.slice(0, 12000) }]);
    if (userInsertError) return NextResponse.json({ error: "Your answer was generated, but conversation history could not be saved. Please retry." }, { status: 503 });
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", currentConversation).eq("user_id", user.id);
    const linkRows = [...(savedVendorQuestion ? savedVendorRows ?? [] : []), ...marketplaceRows];
    const links = linkRows.filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index).map((vendor) => ({ label: vendor.business_name, href: `/vendors/${vendor.id}`, detail: `${vendor.business_category} · ${vendor.city}` }));
    return NextResponse.json({ answer, conversationId: currentConversation, links, ...(refinedBlueprint ? { blueprint: refinedBlueprint } : {}) });
  } catch (error) {
    const failure = getAiErrorResponse(error, "assistant");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
