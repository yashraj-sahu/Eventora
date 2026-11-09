import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-access";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), recipientId: z.string().uuid(), subject: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(10000) }).strict(),
  z.object({ action: z.literal("send"), conversationId: z.string().uuid(), body: z.string().trim().min(1).max(10000) }).strict(),
]);
export async function GET(request: Request) {
  const access = await requireAdminPermission("admin_message", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (new URL(request.url).searchParams.get("unread") === "1") {
    const { data, error } = await access.supabase.rpc("admin_unread_message_count");
    if (error) return NextResponse.json({ error: "Message count is unavailable." }, { status: 503 });
    return NextResponse.json({ unreadCount: data ?? 0 });
  }
  const { searchParams } = new URL(request.url);
  if (searchParams.get("administrators") === "1") {
    try {
      const service = createServiceRoleSupabaseClient();
      const { data: memberships, error } = await service.from("user_roles").select("user_id,is_active,role").eq("role", "admin").eq("is_active", true);
      if (error) throw error;
      const ids = [...new Set((memberships ?? []).map((item) => item.user_id))];
      const { data: assignments, error: assignmentsError } = ids.length ? await service.from("admin_role_assignments").select("user_id,is_active,admin_role").in("user_id", ids).eq("is_active", true) : { data: [], error: null };
      if (assignmentsError) throw assignmentsError;
      const eligibleIds = [...new Set([...(assignments ?? []).map((item) => item.user_id)])];
      const { data: profiles, error: profilesError } = eligibleIds.length ? await service.from("profiles").select("id,full_name,email").in("id", eligibleIds) : { data: [], error: null };
      if (profilesError) throw profilesError;
      const search = (searchParams.get("q") ?? "").trim().toLowerCase();
      const administrators = (profiles ?? []).filter((profile) => profile.id !== access.user.id && (!search || `${profile.full_name ?? ""} ${profile.email ?? ""}`.toLowerCase().includes(search))).map((profile) => ({ ...profile, roles: (assignments ?? []).filter((item) => item.user_id === profile.id).map((item) => item.admin_role) }));
      return NextResponse.json({ administrators });
    } catch { return NextResponse.json({ error: "Administrator directory is unavailable." }, { status: 503 }); }
  }
  const { data: participants, error: participantError } = await access.supabase.from("admin_conversation_participants").select("conversation_id,last_read_at").eq("user_id", access.user.id);
  if (participantError) return NextResponse.json({ error: "Conversations are unavailable." }, { status: 503 });
  const conversationIds = (participants ?? []).map((item) => item.conversation_id);
  if (!conversationIds.length) return NextResponse.json({ conversations: [], messages: [], unreadCount: 0 });
  const { data: conversations, error: conversationError } = await access.supabase.from("admin_conversations").select("id,created_by,subject,created_at,updated_at").in("id", conversationIds).order("updated_at", { ascending: false }).limit(100);
  if (conversationError) return NextResponse.json({ error: "Conversations are unavailable." }, { status: 503 });
  const { data: messages, error: messageError } = await access.supabase.from("admin_messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(500);
  if (messageError) return NextResponse.json({ error: "Messages are unavailable." }, { status: 503 });
  return NextResponse.json({ conversations: conversations ?? [], messages: messages ?? [], participants: participants ?? [] });
}

export async function POST(request: Request) {
  const access = await requireAdminPermission("admin_message", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid administrator message details." }, { status: 400 });
  if (parsed.data.action === "start") {
    const { data, error } = await access.supabase.rpc("create_admin_conversation", { p_recipient_id: parsed.data.recipientId, p_subject: parsed.data.subject, p_body: parsed.data.body });
    if (error || !data) return NextResponse.json({ error: "Message could not be sent. Confirm the recipient is an active administrator." }, { status: error?.code === "42501" ? 403 : 400 });
    return NextResponse.json({ ok: true, conversationId: data }, { status: 201 });
  }
  const { data, error } = await access.supabase.rpc("send_admin_message", { p_conversation_id: parsed.data.conversationId, p_body: parsed.data.body });
  if (error || !data) return NextResponse.json({ error: "Message could not be sent." }, { status: error?.code === "42501" ? 403 : 400 });
  return NextResponse.json({ ok: true, messageId: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireAdminPermission("admin_message", request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = z.object({ conversationId: z.string().uuid() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
  const { data, error } = await access.supabase.from("admin_conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", parsed.data.conversationId).eq("user_id", access.user.id).select("conversation_id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Conversation read state could not be saved." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
