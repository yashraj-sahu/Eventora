"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, CalendarDays, CreditCard, Store, Users, RotateCw } from "lucide-react";

type Metrics = Record<string, number | null>;
type ActivityItem = { id: number; title: string; body: string; created_at: string; entity_type: string | null; entity_id: string | null };
const cards: Array<[keyof Metrics, string, string, typeof Users]> = [
  ["customers", "Customers", "Active customer memberships", Users], ["vendors", "Vendors", "Vendor accounts", Store],
  ["verifiedVendors", "Verified vendors", "Approved vendor profiles", Store], ["pendingVerifications", "Pending verifications", "Documents awaiting review", Activity],
  ["activeListings", "Active listings", "Published marketplace listings", Store], ["pendingListings", "Pending listings", "Listings awaiting moderation", Store],
  ["bookings", "Bookings", "Persisted booking records", CalendarDays], ["confirmedBookings", "Confirmed bookings", "Confirmed or in progress", CalendarDays],
  ["grossBookingValuePaise", "Gross booking value", "Booking totals · not platform revenue", CreditCard], ["recordedPaymentsPaise", "Captured payment volume", "Gross captured amounts · before refunds", CreditCard],
  ["outstandingBalancePaise", "Outstanding balances", "Open booking balance estimates", CreditCard], ["refundsPaise", "Refunds recorded", "Pending and completed refund amounts", CreditCard],
];
const currency = (paise: number | null | undefined) => paise === null || paise === undefined ? "Restricted" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(); if (from) params.set("from", new Date(from).toISOString()); if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    setLoading(true); setError("");
    fetch(`/api/admin/dashboard?${params}`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Dashboard data is unavailable."); if (active) { setMetrics(data.metrics); setActivity(data.recentActivity ?? []); setPermissions(data.permissions ?? []); setIsOwner(Boolean(data.isOwner)); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Dashboard data is unavailable."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);
  const quickLinks = [
    { label: "Review marketplace", href: "/admin/marketplace", allowed: isOwner || permissions.some((permission) => ["vendor_read", "vendor_verification", "listing_moderation"].includes(permission)) },
    { label: "View bookings", href: "/admin/bookings", allowed: isOwner || permissions.some((permission) => ["booking_support", "finance_read"].includes(permission)) },
    { label: "Open analytics", href: "/admin/analytics", allowed: isOwner || permissions.some((permission) => ["analytics_finance", "user_read", "vendor_read", "finance_read"].includes(permission)) },
    { label: "Manage administrators", href: "/admin/administrators", allowed: isOwner },
  ].filter((link) => link.allowed);
  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#B77A36]">Platform Overview</p><h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Admin Dashboard</h1><p className="mt-2 text-sm text-[#715D54] dark:text-[#D4C3B7]">Current platform activity from authorized Evntora records.</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs">From <input type="date" value={from} onChange={(event)=>setFrom(event.target.value)} className="ml-1 rounded-lg border border-[#EAD2B0] bg-white px-2 py-2"/></label><label className="text-xs">To <input type="date" value={to} onChange={(event)=>setTo(event.target.value)} className="ml-1 rounded-lg border border-[#EAD2B0] bg-white px-2 py-2"/></label></div></header>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key,label,caption,Icon])=><article key={key} className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 shadow-sm dark:border-[#4D3331] dark:bg-[#241918]"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-[#806D63]">{label}</p><Icon size={18} className="text-[#B77A36]"/></div><p className="mt-4 font-serif text-3xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">{loading ? "…" : key.toString().toLowerCase().includes("paise") ? currency(metrics?.[key]) : metrics?.[key] === null || metrics?.[key] === undefined ? "Restricted" : Number(metrics[key]).toLocaleString("en-IN")}</p><p className="mt-2 text-xs text-[#806D63]">{caption}</p></article>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918]"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Recent platform activity</h2><p className="mt-1 text-xs text-[#806D63]">Events visible to your assigned administrative permissions.</p></div><Activity size={18} className="text-[#B77A36]"/></div>{loading ? <p className="py-8 text-sm text-[#806D63]">Loading activity…</p> : activity.length ? <ul className="divide-y divide-[#EAD2B0] dark:divide-[#4D3331]">{activity.map((item)=><li key={item.id} className="py-3"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#806D63]">{item.body}</p><time className="mt-1 block text-[11px] text-[#9A887F]">{new Date(item.created_at).toLocaleString("en-IN")}</time></li>)}</ul> : <div className="rounded-xl bg-[#FFF3E3] p-6 text-sm text-[#806D63] dark:bg-[#1A1211]">No recent activity is recorded for your permissions.</div>}</section>
      <section className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Quick access</h2><div className="mt-4 grid gap-2">{quickLinks.map(({label,href})=><Link key={href} href={href} className="flex items-center justify-between rounded-xl border border-[#EAD2B0] px-4 py-3 text-sm hover:bg-[#FFF3E3] dark:border-[#4D3331] dark:hover:bg-[#342322]">{label}<RotateCw size={14}/></Link>)}</div><p className="mt-4 text-xs text-[#806D63]">Financial measures distinguish booking value from captured payments and refunds.</p></section>
    </div>
  </div>;
}
