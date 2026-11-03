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
    } catch {
      sessionStorage.removeItem(HISTORY_KEY);
    }
  }, [isLoading, hasCustomerAccess]);

  useEffect(() => {
    if (!hasCustomerAccess) return;
    let active = true;
    void supabase.from("events").select("id,title,city,date").order("date", { ascending: true }).then(({ data }) => {
      if (active) setEvents(data ?? []);
    });
    return () => { active = false; };
  }, [hasCustomerAccess]);

  const eventOptions: SelectOption[] = events.map((event) => ({
    value: event.id,
    label: event.title,
    description: `${event.city} · ${event.date}`,
  }));

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
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#EAD2B0]/40 dark:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] grid place-items-center text-[#681B1D] dark:text-[#EAD2B0]">
          <Bot className="w-7 h-7" />
        </div>
        <p className="mt-5 text-[10px] uppercase tracking-[0.2em] font-bold text-[#B77A36] dark:text-[#EAD2B0]">
          Evntora AI concierge
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3]">
          Ask about your celebration
        </h1>
        <p className="mt-3 text-sm text-[#59453E] dark:text-[#D4C3B7]">
          Explore ideas and get real AI planning help. No account is needed to start.
        </p>
      </div>

      <div className="rounded-3xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFFCF6] dark:bg-[#2E1F1E] shadow-xl overflow-hidden">
        {hasCustomerAccess && events.length > 0 && (
          <div className="px-5 sm:px-7 pt-5">
            <SearchableSelect
              label="Planning for an event (optional)"
              value={selectedEventId}
              options={eventOptions}
              onChange={(value) => {
                if (conversationId && value !== selectedEventId) {
                  setConversationId(null);
                  setMessages([]);
                }
                setSelectedEventId(value);
              }}
              placeholder="Choose an event for tailored help"
            />
          </div>
        )}
        <div className="h-[min(55vh,480px)] min-h-72 overflow-y-auto p-5 sm:p-7 space-y-4" aria-live="polite">
          {!messages.length && (
            <div className="h-full min-h-56 grid place-items-center text-center">
              <div className="max-w-sm">
                <Sparkles className="w-6 h-6 mx-auto text-[#B77A36]" />
                <p className="mt-3 text-xs sm:text-sm text-[#7D6B63] dark:text-[#D4C3B7]">
                  Try “Help me plan a relaxed three-day wedding in Jaipur” or ask a general event question.
                </p>
              </div>
            </div>
          )}
          {messages.map((item, index) => (
            <div
              key={`${index}-${item.role}`}
              className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-xs sm:text-sm leading-6 ${
                item.role === "user"
                  ? "ml-auto bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] border border-[#B77A36]/40 shadow-xs"
                  : "mr-auto bg-[#FFF3E3]/80 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3]"
              }`}
            >
              {item.content}
            </div>
          ))}
          {busy && (
            <p role="status" className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#B77A36] animate-ping" />
              <span>Evntora AI is crafting recommendations…</span>
            </p>
          )}
        </div>
        {error && <p role="alert" className="mx-5 text-xs text-rose-700 dark:text-rose-300 py-1">{error}</p>}
        <form onSubmit={send} className="border-t border-[#EAD2B0] dark:border-[#4D3331] p-4 sm:p-5 flex gap-3 bg-[#FAF3E8] dark:bg-[#1A1211]">
          <label className="sr-only" htmlFor="guest-ai-question">Your question</label>
          <input
            id="guest-ai-question"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            disabled={busy}
            placeholder="Ask your event planning question…"
            className="min-w-0 flex-1 rounded-xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] px-4 py-2.5 text-xs text-[#30221D] dark:text-[#FFF3E3] placeholder-[#9E897F] focus:outline-none focus:border-[#B77A36]"
          />
          <button
            type="submit"
            disabled={busy || !message.trim()}
            aria-label="Send question"
            className="shrink-0 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] disabled:opacity-50 text-[#FFF3E3] px-4 py-2.5 cursor-pointer border border-[#B77A36]/40"
          >
            <Send className="w-4 h-4 text-[#EAD2B0]" />
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
        {hasCustomerAccess ? "Your signed-in conversation is saved to your account." : "This guest conversation stays in this browser session."}
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/planner" className="inline-flex items-center gap-2 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:underline">
          <span>Generate a complete event blueprint</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#B77A36]" />
        </Link>
      </div>
    </section>
  );
}
