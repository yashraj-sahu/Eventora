"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/utils";
import { ArrowRight, CalendarDays, CreditCard, MapPin, Plus, Sparkles, Store } from "lucide-react";

type EventRecord = { id: string; title: string; category: string; city: string; date: string; guest_count: number; total_budget: number; status: string; created_at: string };
type BookingRecord = { id: string; booking_reference: string; vendor_name: string; status: string; event_date: string; total_amount: number; paid_amount: number; created_at: string };
type PaymentRecord = { id: string; amount: number; status: string; created_at: string; verified_at: string | null };
type Activity = { id: string; label: string; detail: string; createdAt: string; href: string };

export default function DashboardOverviewPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [eventResponse, bookingResponse, paymentResponse] = await Promise.all([
          fetch("/api/ai/events", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Events unavailable."); return data.events as EventRecord[]; }),
          supabase.from("bookings").select("id,booking_reference,vendor_name,status,event_date,total_amount,paid_amount,created_at").eq("customer_id", user.id).order("created_at", { ascending: false }),
          supabase.from("payments").select("id,amount,status,created_at,verified_at").eq("customer_id", user.id).order("created_at", { ascending: false }),
        ]);
        if (bookingResponse.error || paymentResponse.error) throw new Error("Your booking or payment summary is temporarily unavailable.");
        if (!active) return;
        setEvents(eventResponse ?? []);
        setBookings((bookingResponse.data ?? []) as BookingRecord[]);
        setPayments((paymentResponse.data ?? []) as PaymentRecord[]);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Dashboard data is temporarily unavailable."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user]);

  const now = new Date();
  const upcoming = events.filter((event) => new Date(`${event.date}T23:59:59`) >= now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const activeBookings = bookings.filter((booking) => ["pending_vendor_confirmation", "awaiting_payment", "confirmed"].includes(booking.status));
  const outstandingPaise = bookings.reduce((sum, booking) => sum + Math.max(0, booking.total_amount - booking.paid_amount), 0);
  const verifiedPaise = payments.filter((payment) => ["captured", "partially_refunded", "refunded"].includes(payment.status)).reduce((sum, payment) => sum + payment.amount, 0);
  const activity: Activity[] = [
    ...events.map((event) => ({ id: `event-${event.id}`, label: "Event plan saved", detail: event.title, createdAt: event.created_at, href: `/dashboard/events/${event.id}` })),
    ...bookings.map((booking) => ({ id: `booking-${booking.id}`, label: "Booking updated", detail: `${booking.vendor_name} · ${booking.booking_reference}`, createdAt: booking.created_at, href: "/dashboard/payments" })),
    ...payments.map((payment) => ({ id: `payment-${payment.id}`, label: "Payment record", detail: `${payment.status.replaceAll("_", " ")} · ${formatINR(payment.amount / 100)}`, createdAt: payment.verified_at || payment.created_at, href: "/dashboard/payments?tab=payments" })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-[30px] p-7 sm:p-10 bg-gradient-to-br from-[#681B1D] via-[#53151A] to-[#2F1115] text-[#FFF3E3] border border-[#B77A36]/40 shadow-xl"><div className="absolute -right-16 -top-24 w-80 h-80 rounded-full border border-[#EAD2B0]/10"/><div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6"><div><span className="inline-flex items-center gap-2 text-xs font-semibold text-[#EAD2B0]"><Sparkles className="w-4 h-4"/>EVNTORA CUSTOMER WORKSPACE</span><h1 className="mt-4 text-3xl sm:text-4xl font-serif font-bold">Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1><p className="mt-2 text-sm text-[#FFF3E3]/75">Your plans, bookings and next steps — together in one place.</p></div><div className="flex flex-wrap gap-3"><Link href="/planner" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#EAD2B0] text-[#4B1117] text-xs font-bold shadow-md"><Plus className="w-4 h-4"/>Plan an Event</Link><Link href="/vendors" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#EAD2B0]/50 bg-white/5 hover:bg-white/10 text-[#FFF3E3] text-xs font-semibold"><Store className="w-4 h-4"/>Discover Vendors</Link></div></div></section>

    {error && <p role="alert" className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200">{error}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[
      ["Events planned", loading ? "—" : String(events.length), CalendarDays], ["Active bookings", loading ? "—" : String(activeBookings.length), Store],
      ["Outstanding booking balance", loading ? "—" : formatINR(outstandingPaise / 100), CreditCard], ["Recorded payments", loading ? "—" : formatINR(verifiedPaise / 100), CreditCard],
    ].map(([label, value, Icon]) => { const MetricIcon = Icon as typeof CalendarDays; return <div key={String(label)} className="p-5 rounded-2xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><MetricIcon className="w-4 h-4 text-[#B77A36]"/><p className="mt-3 text-[11px] uppercase tracking-wider text-[#7D6B63] dark:text-[#D4C3B7]">{String(label)}</p><p className="mt-1 text-2xl font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">{String(value)}</p></div>; })}</div>

    {!loading && events.length === 0 && !error ? <section className="p-10 sm:p-14 rounded-3xl text-center bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><CalendarDays className="w-10 h-10 mx-auto text-[#B77A36]"/><h2 className="mt-4 text-2xl font-serif font-bold">Your event story starts here</h2><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Create your first plan to get a dedicated event workspace.</p><Link href="/planner" className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-[#681B1D] text-white text-xs font-bold">Plan an Event <ArrowRight className="w-4 h-4 ml-2"/></Link></section> : <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5"><section className="p-6 rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><div className="flex items-center justify-between"><div><h2 className="text-xl font-serif font-bold">Coming up</h2><p className="mt-1 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">Your next scheduled celebrations</p></div><Link href="/dashboard/events" className="text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">All events →</Link></div>{loading ? <p role="status" className="py-8 text-sm text-[#7D6B63]">Loading events…</p> : upcoming.length ? <div className="mt-4 divide-y divide-[#EAD2B0]/70 dark:divide-[#4D3331]">{upcoming.map((event) => <Link key={event.id} href={`/dashboard/events/${event.id}`} className="py-4 flex items-center justify-between gap-3 group"><div><span className="text-[10px] uppercase font-bold tracking-wider text-[#B77A36]">{event.category}</span><h3 className="mt-1 font-serif font-bold group-hover:text-[#681B1D] dark:group-hover:text-[#EAD2B0]">{event.title}</h3><p className="mt-1 text-xs text-[#7D6B63] dark:text-[#D4C3B7] flex items-center gap-3"><span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3"/>{event.city}</span><span>{new Date(`${event.date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span></p></div><ArrowRight className="w-4 h-4 text-[#B77A36]"/></Link>)}</div> : <p className="py-8 text-sm text-[#7D6B63]">No upcoming events. Past event plans remain in My Events.</p>}</section>

    <section className="p-6 rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-serif font-bold">Recent activity</h2><p className="mt-1 text-xs text-[#7D6B63] dark:text-[#D4C3B7]">From your saved records</p></div><Link href="/dashboard/payments" className="text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">Bookings →</Link></div>{loading ? <p role="status" className="py-8 text-sm text-[#7D6B63]">Loading activity…</p> : activity.length ? <div className="mt-4 space-y-4">{activity.map((item) => <Link key={item.id} href={item.href} className="flex gap-3"><span className="mt-1 w-2 h-2 rounded-full bg-[#B77A36] shrink-0"/><span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-[#7D6B63] dark:text-[#D4C3B7] truncate">{item.detail}</span><span className="block text-[10px] text-[#9E897F] mt-1">{new Date(item.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span></span></Link>)}</div> : <p className="py-8 text-sm text-[#7D6B63]">Activity will appear here as you save an event or make a booking.</p>}</section></div>}

    {!loading && bookings.some((booking) => ["pending_vendor_confirmation", "awaiting_payment"].includes(booking.status)) && <section className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-semibold text-amber-950 dark:text-amber-100">You have booking updates to review</p><p className="mt-1 text-xs text-amber-900/75 dark:text-amber-200/70">See vendor confirmations and any balances waiting for payment.</p></div><Link href="/dashboard/payments?tab=bookings" className="inline-flex items-center gap-2 text-xs font-bold text-amber-950 dark:text-amber-100">Review bookings <ArrowRight className="w-4 h-4"/></Link></section>}
  </div>;
}
