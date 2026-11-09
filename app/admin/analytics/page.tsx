"use client";

import { useEffect, useState } from "react";

type Trend = { date: string; customers: number | null; vendors: number | null; bookings: number | null; capturedPaymentsPaise: number | null };
type BreakdownItem = { label: string; count: number };
type Breakdowns = { popularEventCategories: BreakdownItem[] | null; popularLocations: BreakdownItem[] | null; bookingStatuses: BreakdownItem[] | null };
const series: Array<{ key: keyof Omit<Trend, "date">; title: string; money?: boolean }> = [
  { key: "customers", title: "New customer memberships" },
  { key: "vendors", title: "Vendor registrations" },
  { key: "bookings", title: "Booking requests" },
  { key: "capturedPaymentsPaise", title: "Captured payment value", money: true },
];
const format = (value: number, money: boolean) => money
  ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value / 100)
  : value.toLocaleString("en-IN");

export default function AdminAnalyticsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdowns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/admin/analytics", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analytics are unavailable.");
      if (active) { setTrends(data.trends ?? []); setBreakdowns(data.breakdowns ?? null); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Analytics are unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="space-y-6">
    <header><p className="text-xs uppercase tracking-[.2em] text-[#B77A36]">Platform insights</p><h1 className="mt-2 font-serif text-3xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Analytics</h1><p className="mt-2 text-sm text-[#715D54] dark:text-[#D4C3B7]">Daily activity for the last 30 days, aggregated from current Evntora records.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading ? <p className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-8 text-sm text-[#806D63]">Loading database analytics…</p> : <div className="grid gap-5 xl:grid-cols-2">{series.map(({ key, title, money }) => {
      const accessible = trends.some((item) => item[key] !== null);
      const max = Math.max(1, ...trends.map((item) => item[key] ?? 0));
      const total = trends.reduce((sum, item) => sum + (item[key] ?? 0), 0);
      return <article key={key} className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 shadow-sm dark:border-[#4D3331] dark:bg-[#241918]">
        <div className="flex items-baseline justify-between gap-3"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">{title}</h2>{accessible && <span className="text-sm font-semibold text-[#806D63]">30-day total: {format(total, Boolean(money))}</span>}</div>
        {!accessible ? <p className="mt-8 rounded-xl bg-[#FFF3E3] p-5 text-sm text-[#806D63] dark:bg-[#1A1211]">This series is restricted by your assigned permissions.</p> : <><div className="mt-8 flex h-44 items-end gap-[3px] border-b border-l border-[#EAD2B0] px-2 dark:border-[#4D3331]">{trends.map((item) => { const value = item[key] ?? 0; const height = value ? Math.max(4, (value / max) * 100) : 0; return <div key={item.date} title={`${item.date}: ${format(value, Boolean(money))}`} className="group relative flex h-full min-w-0 flex-1 items-end"><span className="w-full rounded-t bg-gradient-to-t from-[#681B1D] to-[#BD8748] transition-opacity group-hover:opacity-75" style={{ height: `${height}%` }} /></div>; })}</div><div className="mt-2 flex justify-between text-[10px] text-[#9A887F]"><span>{trends[0]?.date}</span><span>{trends.at(-1)?.date}</span></div></>}
      </article>;
    })}</div>}
    {!loading && !error && <div className="grid gap-5 xl:grid-cols-3">{[
      ["Popular event categories", breakdowns?.popularEventCategories],
      ["Popular locations", breakdowns?.popularLocations],
      ["Booking status distribution", breakdowns?.bookingStatuses],
    ].map(([title, rawItems]) => { const items = rawItems as BreakdownItem[] | null | undefined; const max = Math.max(1, ...(items ?? []).map((item) => item.count)); return <article key={String(title)} className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">{String(title)}</h2>{items === null ? <p className="mt-5 rounded-xl bg-[#FFF3E3] p-4 text-sm text-[#806D63] dark:bg-[#1A1211]">Restricted by your assigned permissions.</p> : items?.length ? <ul className="mt-4 space-y-3">{items.map((item) => <li key={item.label}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate">{item.label.replaceAll("_", " ")}</span><b>{item.count.toLocaleString("en-IN")}</b></div><div className="h-2 overflow-hidden rounded-full bg-[#F0E1D0] dark:bg-[#342322]"><div className="h-full rounded-full bg-[#8A2829]" style={{ width: `${Math.max(2, item.count / max * 100)}%` }} /></div></li>)}</ul> : <p className="mt-5 rounded-xl bg-[#FFF3E3] p-4 text-sm text-[#806D63] dark:bg-[#1A1211]">No matching records in the current database.</p>}</article>; })}</div>}
  </section>;
}
