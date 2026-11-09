"use client";

import { useEffect, useState } from "react";

type Availability = { date: string; status: "available" | "unavailable" | "blocked" | "booked" | "pending" | "unknown"; note: string | null };

export function VendorAvailabilityManager({ vendorProfileId }: { vendorProfileId: string }) {
  const [dates, setDates] = useState<Availability[]>([]);
  const [viewMonth, setViewMonth] = useState(() => { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); });
  const [selectedDate, setSelectedDate] = useState("");
  const [status, setStatus] = useState<"available" | "unavailable" | "blocked">("available");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const from = new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth(), 1));
    const to = new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + 1, 0));
    const params = new URLSearchParams({ vendorProfileId, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
    const response = await fetch(`/api/vendors/availability?${params}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Availability could not be loaded.");
    setDates(data.dates ?? []);
  };
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Availability could not be loaded.")); }, [vendorProfileId, viewMonth]);

  const monthDays = new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const monthOffset = new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth(), 1)).getUTCDay();
  const byDate = new Map(dates.map((item) => [item.date, item]));
  const cells: Array<Availability | null> = [...Array.from({ length: monthOffset }, () => null), ...Array.from({ length: monthDays }, (_, index) => byDate.get(new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth(), index + 1)).toISOString().slice(0, 10)) ?? { date: new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth(), index + 1)).toISOString().slice(0, 10), status: "unknown" as const, note: null })];

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/vendors/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: selectedDate, status, note }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Availability could not be saved.");
      const [year, month] = selectedDate.split("-").map(Number); setViewMonth(new Date(Date.UTC(year, month - 1, 1))); setNotice("Availability saved."); setSelectedDate(""); setNote("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Availability could not be saved."); }
    finally { setBusy(false); }
  };

  const clear = async (date: string) => {
    setBusy(true); setError(null);
    try { const response = await fetch("/api/vendors/availability", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Availability could not be cleared."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Availability could not be cleared."); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5 rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918]">
    <div><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Availability calendar</h2><div className="flex items-center gap-2"><button type="button" aria-label="Previous month" onClick={() => setViewMonth((month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))} className="rounded-lg border border-[#EAD2B0] px-3 py-1.5 dark:border-[#4D3331]">‹</button><b className="min-w-32 text-center text-sm">{viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</b><button type="button" aria-label="Next month" onClick={() => setViewMonth((month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))} className="rounded-lg border border-[#EAD2B0] px-3 py-1.5 dark:border-[#4D3331]">›</button></div></div><p className="mt-1 text-sm text-[#7D6B63]">Only dates you explicitly mark available are listed as available. Active booking reservations take precedence, including cancellation requests.</p></div>
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-4">
      <label className="text-xs">Date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-white p-2" /></label>
      <label className="text-xs">Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-white p-2"><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="blocked">Blocked</option></select></label>
      <label className="text-xs">Note (optional)<input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-white p-2" /></label>
      <button disabled={busy || !selectedDate} className="self-end rounded-xl bg-[#681B1D] p-2.5 text-xs font-bold text-white disabled:opacity-50">Save date</button>
    </form>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-[#7D6B63]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className="py-2">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{cells.map((item, index) => item ? <div className={`min-h-20 rounded-xl border p-2 text-xs ${item.status === "available" ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20" : ["booked", "pending"].includes(item.status) ? "border-rose-300 bg-rose-50 dark:bg-rose-950/20" : ["blocked", "unavailable"].includes(item.status) ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : "border-[#EAD2B0] bg-white/60 dark:border-[#4D3331] dark:bg-[#1A1211]"}`} key={`${item.date}-${index}`}><b>{Number(item.date.slice(-2))}</b><p className="mt-1 capitalize leading-tight text-[#7D6B63]">{item.status.replaceAll("_", " ")}</p>{item.note && <p title={item.note} className="mt-1 truncate text-[9px] text-[#7D6B63]">{item.note}</p>}{["available", "unavailable", "blocked"].includes(item.status) && <button disabled={busy} onClick={() => void clear(item.date)} className="mt-1 text-[10px] text-rose-700 underline disabled:opacity-50">Clear</button>}</div> : <span key={`empty-${index}`} className="min-h-20"/> )}</div>
  </section>;
}
