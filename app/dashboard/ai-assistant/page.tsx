"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, User, ShieldCheck, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { supabase } from "@/lib/supabase";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; links?: Array<{ label: string; href: string; detail: string }> };
type Conversation = { id: string; event_id: string | null; title: string; created_at: string };
type EventChoice = { id: string; title: string };
type Memory = { id: string; memory_type: "personal" | "event"; event_id: string | null; content: string; is_enabled: boolean };

const suggestedPrompts = ["What is my remaining event budget?", "Suggest a decoration theme", "Find photographers in my event city", "Summarize my booking status", "Create a schedule for the second day"];

export default function AIAssistantPage() {
  const [events, setEvents] = useState<EventChoice[]>([]);
  const [eventId, setEventId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryText, setMemoryText] = useState("");
  const [memoryType, setMemoryType] = useState<"personal" | "event">("personal");
  const [memoryError, setMemoryError] = useState("");
  const [editingMemory, setEditingMemory] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const loadConversationIndex = useCallback(async () => {
    const response = await fetch("/api/ai/chat", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Conversation history is unavailable.");
    setConversations(data.conversations ?? []);
    return (data.conversations ?? []) as Conversation[];
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    if (!id) { setMessages([]); return; }
    const response = await fetch(`/api/ai/chat?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Conversation could not be loaded.");
    setMessages((data.messages ?? []).map((message: ChatMessage) => ({ ...message })));
    setEventId(data.conversation.event_id ?? "");
  }, []);

  const loadMemories = useCallback(async () => {
    const response = await fetch("/api/ai/memories", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Saved preferences are unavailable.");
    setMemories(data.memories ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [{ data, error: eventError }, index] = await Promise.all([
          supabase.from("events").select("id,title").order("created_at", { ascending: false }),
          loadConversationIndex(),
        ]);
        if (eventError) throw new Error("Your events could not be loaded.");
        if (!active) return;
        setEvents(data ?? []);
        if (index[0]) { setConversationId(index[0].id); await loadConversation(index[0].id); }
        await loadMemories();
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Assistant data is unavailable."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [loadConversationIndex, loadConversation, loadMemories]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    setSending(true); setError(""); setInput("");
    setMessages((current) => [...current, { id: `pending-${Date.now()}`, role: "user", content: question }]);
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, eventId: eventId || undefined, conversationId: conversationId || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assistant could not respond.");
      setConversationId(data.conversationId);
      const index = await loadConversationIndex();
      setConversations(index);
      setMessages((current) => [...current, { id: `answer-${Date.now()}`, role: "assistant", content: data.answer, links: data.links ?? [] }]);
    } catch (cause) {
      setMessages((current) => current.filter((message) => !message.id.startsWith("pending-")));
      setError(cause instanceof Error ? cause.message : "The assistant is temporarily unavailable.");
    } finally { setSending(false); }
  };

  const startNewConversation = () => { setConversationId(""); setMessages([]); setError(""); };

  const saveMemory = async () => {
    if (!memoryText.trim() || (memoryType === "event" && !eventId)) { setMemoryError("Choose an event to save an event-specific preference."); return; }
    setMemoryError("");
    const response = await fetch("/api/ai/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memoryType, eventId: memoryType === "event" ? eventId : null, content: memoryText }) });
    const data = await response.json();
    if (!response.ok) { setMemoryError(data.error || "Preference could not be saved."); return; }
    setMemoryText(""); await loadMemories();
  };

  const updateMemory = async (memory: Memory, updates: { content?: string; is_enabled?: boolean }) => {
    const response = await fetch(`/api/ai/memories/${memory.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const data = await response.json();
    if (!response.ok) { setMemoryError(data.error || "Preference could not be updated."); return; }
    setEditingMemory(null); await loadMemories();
  };

  const deleteMemory = async (memory: Memory) => {
    const response = await fetch(`/api/ai/memories/${memory.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setMemoryError(data.error || "Preference could not be deleted."); return; }
    await loadMemories();
  };

  const eventOptions: SelectOption[] = events.map((event) => ({ value: event.id, label: event.title }));
  const conversationOptions: SelectOption[] = conversations.map((conversation) => ({ value: conversation.id, label: conversation.title }));

  return <div className="space-y-6 min-h-[calc(100vh-14rem)] flex flex-col animate-in fade-in duration-200">
    <div className="space-y-1 border-b border-white/10 pb-4 shrink-0">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20"><Bot className="w-3.5 h-3.5"/><span>Event planning assistant</span></div>
      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">Evntora AI Concierge Desk</h1>
      <p className="text-xs text-slate-400">Answers use your selected event and account records when available. Recommendations are not bookings or vendor availability confirmations.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 flex-1 min-h-0">
      <section className="flex flex-col min-h-[480px] gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchableSelect label="Event context" value={eventId} options={eventOptions} onChange={(nextEventId) => { if (nextEventId !== eventId) { setConversationId(""); setMessages([]); } setEventId(nextEventId); }} placeholder="General planning" className="flex-1" />
          <SearchableSelect label="Conversation history" value={conversationId} options={conversationOptions} onChange={(id) => { setConversationId(id); void loadConversation(id).catch((cause) => setError(cause.message)); }} placeholder="New conversation" className="flex-1" />
          <button onClick={startNewConversation} type="button" className="self-end h-11 px-3 rounded-xl border border-slate-700 text-slate-200 hover:text-amber-300 flex items-center gap-2 text-xs"><Plus className="w-4 h-4"/>New</button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">{suggestedPrompts.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-amber-300 whitespace-nowrap transition-colors flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-amber-400 shrink-0"/><span>{prompt}</span></button>)}</div>
        <div className="flex-1 min-h-[260px] p-4 sm:p-6 rounded-3xl glass-card border border-white/10 overflow-y-auto space-y-4 scrollbar-thin">
          {loading && <p role="status" className="text-xs text-slate-400">Loading your event context and conversation history…</p>}
          {!loading && !messages.length && <div className="max-w-xl p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-sm leading-relaxed text-slate-200">Namaste. Ask about your event, budget, shortlist, bookings, or planning options. I’ll distinguish account records from general suggestions.</div>}
          {messages.map((message) => <div key={message.id} className={`flex items-start gap-3 max-w-[90%] ${message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === "user" ? "bg-amber-500 text-slate-950 font-bold text-xs" : "bg-slate-800 border border-slate-700 text-amber-400"}`}>{message.role === "user" ? <User className="w-4 h-4"/> : <Bot className="w-4 h-4"/>}</div>
            <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${message.role === "user" ? "bg-amber-500 text-slate-950 font-medium" : "bg-slate-950/80 border border-slate-800 text-slate-200"}`}>{message.content}{message.links?.length ? <div className="mt-3 space-y-2">{message.links.map((item) => <Link key={item.href} href={item.href} className="block rounded-lg border border-slate-700 px-3 py-2 hover:border-amber-400"><span className="block font-semibold text-amber-300">{item.label}</span><span className="block text-[10px] text-slate-400">{item.detail}</span></Link>)}</div> : null}</div>
          </div>)}
          {sending && <div role="status" className="text-xs text-slate-400">Thinking…</div>}
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="shrink-0 flex gap-2">
          <input type="text" value={input} onChange={(event) => setInput(event.target.value)} disabled={sending || loading} placeholder="Ask about your event, bookings, or planning…" className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400"/>
          <button type="submit" disabled={!input.trim() || sending} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"><span>Send</span><Send className="w-4 h-4"/></button>
        </form>
      </section>

      <aside className="rounded-3xl glass-card border border-white/10 p-4 space-y-4 max-h-[750px] overflow-y-auto">
        <div className="flex gap-2 items-start"><ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5"/><div><h2 className="text-sm font-semibold text-white">Saved preferences</h2><p className="text-[11px] text-slate-400 mt-1">Only preferences you explicitly save are remembered. Event memories stay scoped to their event.</p></div></div>
        <div className="space-y-2">
          <SearchableSelect label="Preference scope" value={memoryType} options={[{ value: "personal", label: "Personal preference" }, { value: "event", label: "Selected event only" }]} onChange={(value) => setMemoryType(value as "personal" | "event")} />
          <textarea value={memoryText} onChange={(event) => setMemoryText(event.target.value)} maxLength={2000} rows={3} placeholder="Example: I prefer concise updates" className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3 py-2 text-xs"/>
          <button onClick={() => void saveMemory()} disabled={!memoryText.trim()} className="w-full rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs py-2 disabled:opacity-50">Save preference</button>
          {memoryError && <p role="alert" className="text-xs text-red-300">{memoryError}</p>}
        </div>
        {!memories.length && <p className="text-xs text-slate-400">No saved preferences yet.</p>}
        <div className="space-y-2">{memories.map((memory) => <div key={memory.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center"><span className="text-[10px] uppercase tracking-wide text-amber-300">{memory.memory_type === "personal" ? "Personal" : "Event-specific"}</span><label className="text-[10px] text-slate-400 flex gap-1 items-center"><input type="checkbox" checked={memory.is_enabled} onChange={(event) => void updateMemory(memory, { is_enabled: event.target.checked })}/>Use</label></div>
          {editingMemory === memory.id ? <><textarea value={editText} onChange={(event) => setEditText(event.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs"/><div className="flex justify-end gap-2"><button onClick={() => setEditingMemory(null)} aria-label="Cancel edit" className="text-slate-400"><X className="w-4 h-4"/></button><button onClick={() => void updateMemory(memory, { content: editText })} aria-label="Save edit" className="text-emerald-300"><Check className="w-4 h-4"/></button></div></> : <div className="flex justify-between gap-2"><p className="text-xs text-slate-200">{memory.content}</p><div className="flex gap-2 shrink-0"><button onClick={() => { setEditingMemory(memory.id); setEditText(memory.content); }} aria-label="Edit preference" className="text-slate-400 hover:text-amber-300"><Pencil className="w-3.5 h-3.5"/></button><button onClick={() => void deleteMemory(memory)} aria-label="Delete preference" className="text-slate-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5"/></button></div></div>}
        </div>)}</div>
      </aside>
    </div>
  </div>;
}
