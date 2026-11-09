"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  MessageCircle,
  X,
  Send,
  RotateCcw,
  Bot,
  ArrowRight,
  Minimize2,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Message = { role: "user" | "assistant"; content: string };
const HISTORY_KEY = "evntora-public-ai-guest-history";

export function GlobalFloatingChatbot() {
  const { user, hasRole } = useAuth();
  const pathname = usePathname();
  const eventContextId = pathname.match(/^\/dashboard\/events\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] ?? null;
  const hasCustomerAccess = Boolean(user && hasRole("customer"));
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousEventContext = useRef<string | null>(eventContextId);

  // Keep the global launcher mounted across navigation. Start a fresh event-bound
  // thread only when the customer switches to a different event context.
  useEffect(() => {
    if (previousEventContext.current === eventContextId) return;
    previousEventContext.current = eventContextId;
    setConversationId(null);
    setMessages([]);
    setError("");
  }, [eventContextId]);

  // Load history from session storage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]") as Message[];
      if (Array.isArray(stored) && stored.length > 0) {
        setMessages(stored.slice(-16));
      }
    } catch {
      sessionStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  // Auto-scroll when messages or busy state change
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, busy, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend ?? input).trim();
    if (!question || busy) return;

    setInput("");
    setError("");
    setBusy(true);

    const guestHistory = !hasCustomerAccess
      ? [...messages, { role: "user" as const, content: question }].slice(-12)
      : undefined;

    const newMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(newMessages);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          ...(hasCustomerAccess
            ? { conversationId: conversationId ?? undefined, ...(!conversationId && eventContextId ? { eventId: eventContextId } : {}) }
            : { guestHistory }),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "The AI assistant is temporarily unavailable.");
      }

      if (result.conversationId) setConversationId(result.conversationId);

      const nextMessages: Message[] = [
        ...newMessages,
        { role: "assistant" as const, content: String(result.answer) },
      ].slice(-16);

      setMessages(nextMessages);
      if (!result.conversationId) {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(nextMessages));
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The assistant is temporarily unavailable. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClearHistory = () => {
    sessionStorage.removeItem(HISTORY_KEY);
    setMessages([]);
    setConversationId(null);
    setError("");
  };

  const suggestedQuestions = [
    "What is an ideal budget breakdown for 350 guests in Udaipur?",
    "Suggest a 3-day royal Indian wedding timeline",
    "What are top traditional palace venues in Rajasthan?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans pointer-events-auto">
      {/* ── CHAT POPUP WINDOW ── */}
      {isOpen && (
        <div className="mb-4 w-[92vw] sm:w-[410px] h-[540px] max-h-[82vh] rounded-[28px] bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] shadow-[0_20px_50px_rgba(75,17,23,0.25),0_4px_16px_rgba(183,122,54,0.15)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] border-b border-[#B77A36]/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EAD2B0]/20 border border-[#B77A36]/60 flex items-center justify-center text-[#EAD2B0] shadow-xs">
                <Sparkles className="w-5 h-5 text-[#EAD2B0]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm tracking-wide text-[#FFF3E3] leading-none">
                  EVNTORA Concierge
                </h3>
                <p className="text-[11px] text-[#EAD2B0]/80 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse inline-block" />
                  <span>Real-time AI planning advisor</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Clear conversation"
                  aria-label="Clear conversation history"
                  className="p-1.5 rounded-lg text-[#EAD2B0]/80 hover:text-[#FFF3E3] hover:bg-[#FFFCF6]/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-[#EAD2B0] dark:scrollbar-thumb-[#4D3331]"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-4 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#EAD2B0]/30 dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-center text-[#681B1D] dark:text-[#EAD2B0]">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm text-[#30221D] dark:text-[#FFF3E3]">
                    Namaste! How may I assist your celebration?
                  </h4>
                  <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] max-w-xs leading-relaxed">
                    Ask any question about wedding rituals, luxury venues, budget splits, or catering menus in India.
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="w-full space-y-2 pt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] block text-left">
                    Suggested Questions
                  </span>
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => void handleSend(q)}
                      className="w-full text-left text-xs p-2.5 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#2E1F1E]/80 hover:bg-[#EAD2B0]/40 dark:hover:bg-[#3D2624] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] transition-colors cursor-pointer shadow-2xs leading-snug"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((item, index) => (
                  <div
                    key={`${index}-${item.role}`}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed ${
                      item.role === "user"
                        ? "ml-auto bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-[#FFF3E3] rounded-br-xs shadow-sm"
                        : "mr-auto bg-[#FFFCF6]/90 dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] rounded-bl-xs shadow-2xs whitespace-pre-wrap"
                    }`}
                  >
                    {item.content}
                  </div>
                ))}

                {busy && (
                  <div className="mr-auto bg-[#FFFCF6]/80 dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] rounded-2xl px-3.5 py-2 text-xs text-[#7D6B63] dark:text-[#D4C3B7] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#B77A36] animate-ping" />
                    <span>Crafting recommendation…</span>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>

          {/* Quick Action Footer: Blueprint Shortcut */}
          <div className="px-4 py-2 bg-[#FAF3E8] dark:bg-[#140E0D] border-t border-[#EAD2B0]/60 dark:border-[#4D3331]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#7D6B63] dark:text-[#D4C3B7]">Need a full itinerary?</span>
            <Link
              href="/planner"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Launch AI Planner</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="p-3 bg-[#FFFCF6]/95 dark:bg-[#1A1211]/95 border-t border-[#EAD2B0] dark:border-[#4D3331] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder="Ask anything about event planning…"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-[#FFF3E3]/60 dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-xs text-[#30221D] dark:text-[#FFF3E3] placeholder:text-[#9E897F] focus:outline-none focus:border-[#B77A36]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] disabled:opacity-50 text-[#FFF3E3] border border-[#B77A36]/60 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── FLOATING CIRCULAR LAUNCHER BUTTON ── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Close AI Concierge" : "Open AI Concierge"}
          aria-expanded={isOpen}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#681B1D] via-[#5C151D] to-[#3B0E12] text-[#FFF3E3] border-2 border-[#B77A36] shadow-[0_10px_25px_rgba(75,17,23,0.35),0_2px_10px_rgba(183,122,54,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
        >
        {/* Animated aura ring */}
        <span className="absolute inset-0 rounded-full bg-[#B77A36]/25 animate-ping pointer-events-none opacity-40 group-hover:opacity-75" />

        {isOpen ? (
          <X className="w-6 h-6 text-[#EAD2B0] transition-transform duration-200" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#EAD2B0] group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#B77A36] border border-[#681B1D]" />
          </div>
        )}

        {/* Floating Tooltip Pill */}
        {!isOpen && (
          <span className="absolute right-16 px-3 py-1.5 rounded-full bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-[#681B1D] dark:text-[#EAD2B0] text-xs font-bold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Ask AI Concierge ✨
          </span>
        )}
        </button>
      </div>
    </div>
  );
}

