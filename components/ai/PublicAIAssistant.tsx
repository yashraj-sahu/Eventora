"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";

type Message = { role: "user" | "assistant"; content: string };
type EventChoice = { id: string; title: string; city: string; date: string };
const HISTORY_KEY = "evntora-public-ai-guest-history";

export function PublicAIAssistant() {
  const { user, hasRole, isLoading } = useAuth();
  const hasCustomerAccess = Boolean(user && hasRole("customer"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventChoice[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    setConversationId(null);
    setMessages([]);
    if (hasCustomerAccess) return;
    try {
      const stored = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]") as Message[];
      setMessages(stored.slice(-12));
    } catch { sessionStorage.removeItem(HISTORY_KEY); }
  }, [isLoading, hasCustomerAccess]);

  useEffect(() => {
    if (!hasCustomerAccess) return;
    let active = true;
    void supabase.from("events").select("id,title,city,date").order("date", { ascending: true }).then(({ data }) => {
      if (active) setEvents(data ?? []);
    });
    return () => { active = false; };
  }, [hasCustomerAccess]);

  const eventOptions: SelectOption[] = events.map((event) => ({ value: event.id, label: event.title, description: `${event.city} · ${event.date}` }));

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = message.trim();
    if (!question || busy) return;
    setMessage(""); setError(""); setBusy(true);
    const guestHistory = !hasCustomerAccess ? [...messages, { role: "user" as const, content: question }].slice(-12) : undefined;
    setMessages((current) => [...current, { role: "user", content: question }]);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, ...(hasCustomerAccess ? { conversationId: conversationId ?? undefined, eventId: selectedEventId || undefined } : { guestHistory }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The assistant is temporarily unavailable.");
      if (result.conversationId) setConversationId(result.conversationId);
      const next = [...messages, { role: "user" as const, content: question }, { role: "assistant" as const, content: String(result.answer) }].slice(-12);
      setMessages(next);
      if (!result.conversationId) sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant is temporarily unavailable. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center mb-8">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#E7EFEA] dark:bg-[#173F35]/50 grid place-items-center text-[#173F35] dark:text-[#D4B77D]"><Bot className="w-7 h-7" /></div>
        <p className="mt-5 text-[10px] uppercase tracking-[0.2em] font-bold text-[#C6A66B]">Evntora AI concierge</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Ask about your celebration</h1>
        <p className="mt-3 text-sm text-[#77746D] dark:text-[#B5B5AA]">Explore ideas and get real AI planning help. No account is needed to start.</p>
      </div>

      <div className="rounded-3xl border border-[#E8E2D7] dark:border-[#344139] bg-white dark:bg-[#232F28] shadow-lg overflow-hidden">
        {hasCustomerAccess && events.length > 0 && <div className="px-5 sm:px-7 pt-5"><SearchableSelect label="Planning for an event (optional)" value={selectedEventId} options={eventOptions} onChange={(value) => { if (conversationId && value !== selectedEventId) { setConversationId(null); setMessages([]); } setSelectedEventId(value); }} placeholder="Choose an event for tailored help" /></div>}
        <div className="h-[min(55vh,480px)] min-h-72 overflow-y-auto p-5 sm:p-7 space-y-4" aria-live="polite">
          {!messages.length && <div className="h-full min-h-56 grid place-items-center text-center"><div className="max-w-sm"><Sparkles className="w-6 h-6 mx-auto text-[#C6A66B]" /><p className="mt-3 text-sm text-[#77746D] dark:text-[#B5B5AA]">Try “Help me plan a relaxed three-day wedding in Jaipur” or ask a general event question.</p></div></div>}
          {messages.map((item, index) => <div key={`${index}-${item.role}`} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "ml-auto bg-[#173F35] text-[#FAF8F3]" : "mr-auto bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7]"}`}>{item.content}</div>)}
          {busy && <p role="status" className="text-sm text-[#77746D] dark:text-[#B5B5AA]">Evntora AI is thinking…</p>}
        </div>
        {error && <p role="alert" className="mx-5 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <form onSubmit={send} className="border-t border-[#E8E2D7] dark:border-[#344139] p-4 sm:p-5 flex gap-3">
          <label className="sr-only" htmlFor="guest-ai-question">Your question</label>
          <input id="guest-ai-question" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} disabled={busy} placeholder="Ask your event planning question…" className="min-w-0 flex-1 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] px-4 py-3 text-sm text-[#252522] dark:text-[#F4F0E7] placeholder:text-[#77746D] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2]" />
          <button type="submit" disabled={busy || !message.trim()} aria-label="Send question" className="shrink-0 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] disabled:opacity-50 text-[#FAF8F3] px-4 py-3"><Send className="w-4 h-4" /></button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-[#77746D] dark:text-[#B5B5AA]">{hasCustomerAccess ? "Your signed-in conversation is saved to your account." : "This guest conversation stays in this browser session and is not saved to an account."}</p>
      <div className="mt-6 flex justify-center"><Link href="/planner" className="inline-flex items-center gap-2 text-sm font-semibold text-[#173F35] dark:text-[#A9C7B2] hover:underline">Generate a complete event blueprint <ArrowRight className="w-4 h-4" /></Link></div>
      {hasCustomerAccess && <div className="mt-3 flex justify-center"><Link href="/dashboard/ai-assistant" className="text-xs font-semibold text-[#77746D] dark:text-[#B5B5AA] hover:text-[#173F35] dark:hover:text-[#A9C7B2] hover:underline">Open saved conversations and memory settings</Link></div>}
    </section>
  );
}
