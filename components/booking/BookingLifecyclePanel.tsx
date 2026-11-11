"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";

type Quote = { id: string; quotation_reference: string; status: string; total_amount: number; advance_amount: number; advance_percentage: number; allow_partial_payments: boolean; payment_terms: string; valid_until: string; description: string | null; conditions: string | null; items: Array<{ id: string; description: string; details: string | null; quantity: number; unit_price: number; line_total: number }> };
type BookingDetail = { booking_reference: string; vendor_name: string; vendor_category: string; event_date: string; event_city: string; guest_count: number | null; requirements: string | null; status: string; total_amount: number; advance_amount: number; paid_amount: number; allow_partial_payments: boolean; updated_at: string; accepted_quotation_id: string | null };
type Message = { id: string; sender_id: string; body: string; created_at: string };
type BookingNotice = { id: string; title: string; message: string; created_at: string; read_at: string | null };
type Payment = { id: string; amount: number; status: string; purpose: string; created_at: string; razorpay_payment_id: string | null };
type Refund = { id: string; amount: number; status: string; reason: string; created_at: string; razorpay_refund_id: string | null };
type StatusEntry = { id: string; from_status: string | null; to_status: string; reason: string | null; created_at: string };
type CustomerReview = { id: string; rating: number; review_text: string; vendor_response?: string | null; created_at?: string };

const card = "rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFFCF6] dark:bg-[#241918] p-4";

export function BookingLifecyclePanel({ bookingId, onUpdated }: { bookingId: string; onUpdated?: () => void }) {
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [viewer, setViewer] = useState<"customer" | "vendor" | "admin" | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<BookingNotice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [history, setHistory] = useState<StatusEntry[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [customerReview, setCustomerReview] = useState<CustomerReview | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintDescription, setComplaintDescription] = useState("");
  const [complaintBusy, setComplaintBusy] = useState(false);
  const [complaintError, setComplaintError] = useState<string | null>(null);
  const [complaintSaved, setComplaintSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingRes, quoteRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`, { cache: "no-store" }),
        fetch(`/api/bookings/${bookingId}/quotations`, { cache: "no-store" }),
      ]);
      const [bookingData, quoteData] = await Promise.all([bookingRes.json(), quoteRes.json()]);
      if (!bookingRes.ok) throw new Error(bookingData.error || "Booking details could not be loaded.");
      if (!quoteRes.ok) throw new Error(quoteData.error || "Quotations could not be loaded.");
      // Booking and quotation access are required for the details panel.
      setDetail(bookingData.booking); setViewer(bookingData.viewer); setQuotes(quoteData.quotations ?? []);
      setPayments(bookingData.payments ?? []); setRefunds(bookingData.refunds ?? []); setHistory(bookingData.history ?? []);
      if (bookingData.viewer === "customer") {
        const [messageResult, notificationResult] = await Promise.allSettled([
          fetch(`/api/bookings/${bookingId}/messages`, { cache: "no-store" }).then(async (response) => response.ok ? response.json() : null),
          fetch(`/api/bookings/notifications?bookingId=${bookingId}`, { cache: "no-store" }).then(async (response) => response.ok ? response.json() : null),
        ]);
        setMessages(messageResult.status === "fulfilled" ? messageResult.value?.messages ?? [] : []);
        setNotifications(notificationResult.status === "fulfilled" ? notificationResult.value?.notifications ?? [] : []);
      } else { setMessages([]); setNotifications([]); }
      if (bookingData.viewer === "customer" && bookingData.booking?.status === "completed") {
        const reviewResponse = await fetch(`/api/bookings/${bookingId}/review`, { cache: "no-store" });
        if (reviewResponse.ok) { const reviewData = await reviewResponse.json(); setCustomerReview(reviewData.review ?? null); }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Booking details could not be loaded."); }
  }, [bookingId]);
  useEffect(() => { void load(); }, [load, refreshKey]);

  const mutate = async (url: string, method: string, body?: unknown) => {
    setBusy(true); setError(null);
    try {
      const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The booking change could not be saved.");
      setRefreshKey((key) => key + 1); onUpdated?.(); return data;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The booking change could not be saved."); return null; }
    finally { setBusy(false); }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = message.trim(); if (!body) return;
    const result = await mutate(`/api/bookings/${bookingId}/messages`, "POST", { body, idempotencyKey: crypto.randomUUID() });
    if (result) setMessage("");
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: reviewRating, review: reviewText }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Review could not be saved.");
      setCustomerReview(data.review); setReviewText("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review could not be saved."); }
    finally { setBusy(false); }
  };

  const submitComplaint = async (event: React.FormEvent) => {
    event.preventDefault();
    const description = complaintDescription.trim();
    if (description.length < 10) { setComplaintError("Please describe the issue in at least 10 characters."); return; }
    setComplaintBusy(true); setComplaintError(null);
    try {
      const response = await fetch("/api/support/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseType: "booking_complaint", bookingId, subject: `Issue with booking ${detail?.booking_reference ?? ""}`.trim(), description }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.supportCase) throw new Error(data.error || "The support report could not be saved.");
      setComplaintSaved(true); setComplaintDescription(""); setShowComplaintForm(false);
    } catch (cause) {
      setComplaintError(cause instanceof Error ? cause.message : "The support report could not be saved.");
    } finally { setComplaintBusy(false); }
  };

  if (!detail && !error) return <div role="status" className={card}>Loading booking details…</div>;
  if (!detail) return <div role="alert" className={`${card} text-rose-700`}>{error}</div>;
  const outstanding = Math.max(0, detail.total_amount - detail.paid_amount);
  const canPay = viewer === "customer" && ["awaiting_payment", "confirmed"].includes(detail.status) && outstanding > 0;
  const activeQuote = quotes.find((quote) => quote.id === detail.accepted_quotation_id);
  const paymentLog = payments;
  const vendorPaymentLabel = detail.total_amount <= 0 ? "No agreed price yet" : detail.paid_amount <= 0 ? "Payment not done" : outstanding <= 0 ? "Payment complete" : "Part payment received";

  if (viewer === "vendor") {
    return <section className="rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] p-4" aria-label={`Payment details for ${detail.booking_reference}`}>
      <h4 className="text-sm font-semibold text-[#30221D]">Payment</h4>
      <p className="mt-2 text-sm font-semibold">{vendorPaymentLabel}</p>
      {detail.paid_amount > 0 && <p className="mt-1 text-sm">Paid: <b>{formatINR(detail.paid_amount / 100)}</b></p>}
      <p className="mt-1 text-sm">Remaining: <b>{detail.total_amount > 0 ? formatINR(outstanding / 100) : "Not set"}</b></p>
    </section>;
  }

  return <section className="space-y-4" aria-label={`Booking ${detail.booking_reference} details`}>
    <div className={`${card} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-[#7D6B63]">{detail.booking_reference}</p><h3 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">{detail.vendor_name}</h3><p className="text-sm text-[#7D6B63]">{detail.vendor_category} · {detail.event_city} · {new Date(`${detail.event_date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {detail.guest_count ?? "Guest count not set"}</p></div><span className="rounded-full bg-[#EAD2B0]/60 px-3 py-1 text-xs font-bold capitalize">{detail.status.replaceAll("_", " ")}</span></div>
      {detail.requirements && <p className="text-sm">{detail.requirements}</p>}
      <div className="grid gap-2 text-sm sm:grid-cols-3"><p>Total: <b>{formatINR(detail.total_amount / 100)}</b></p><p>Paid: <b>{formatINR(detail.paid_amount / 100)}</b></p><p>Outstanding: <b>{formatINR(outstanding / 100)}</b></p></div>
      {activeQuote && <div className="border-t border-[#EAD2B0] pt-3 text-sm"><b>Accepted terms · {activeQuote.quotation_reference}</b><p>Advance: {formatINR(activeQuote.advance_amount / 100)} ({activeQuote.advance_percentage}%) · {activeQuote.payment_terms}</p></div>}
      {canPay && <div className="flex flex-wrap gap-2"><Link href={`/checkout?bookingId=${bookingId}`} className="rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-bold text-white">{detail.paid_amount ? "Pay outstanding balance" : "Pay agreed advance"}</Link>{detail.allow_partial_payments && <Link href={`/checkout?bookingId=${bookingId}&purpose=partial`} className="rounded-xl border border-[#681B1D] px-4 py-2 text-xs font-bold text-[#681B1D]">Make a partial payment</Link>}</div>}
      {viewer === "customer" && ["pending_vendor_confirmation", "awaiting_quotation", "quotation_sent", "quotation_revision_requested"].includes(detail.status) && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "withdraw", reason: "Customer withdrew the request" })} className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Withdraw booking request</button>}
      {viewer === "customer" && ["awaiting_payment", "confirmed", "in_progress"].includes(detail.status) && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "request_cancellation", reason: "Customer requested cancellation" })} className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Request cancellation</button>}
      {viewer === "customer" && detail.status === "completed" && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "acknowledge_completion" })} className="rounded-xl border border-[#681B1D] px-4 py-2 text-xs font-semibold text-[#681B1D]">Acknowledge completion</button>}
      {viewer === "customer" && detail.status === "completed" && (customerReview ? <div className="rounded-xl bg-[#FFF3E3] p-3 text-sm dark:bg-[#1A1211]"><b>Your review · {customerReview.rating}/5</b><p className="mt-1">{customerReview.review_text}</p>{customerReview.vendor_response && <p className="mt-2 border-t border-[#EAD2B0] pt-2"><b>Vendor response</b><span className="block">{customerReview.vendor_response}</span></p>}</div> : <form onSubmit={(event) => void submitReview(event)} className="grid gap-2 rounded-xl border border-[#EAD2B0] p-3 sm:grid-cols-[10rem_1fr_auto]"><label className="text-xs">Rating<select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2">{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label><label className="text-xs">Review<textarea required minLength={2} maxLength={2000} value={reviewText} onChange={(event) => setReviewText(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" placeholder="Share your experience"/></label><button disabled={busy || reviewText.trim().length < 2} className="self-end rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Submit review</button></form>)}
    </div>

    {viewer === "customer" && detail.status === "completed" && <div className="rounded-xl border border-[#EAD2B0] p-3"><p className="text-sm font-semibold">Need help with this completed service?</p>{complaintSaved ? <p role="status" className="mt-2 text-sm text-emerald-800">Your report was saved for Evntora Support.</p> : showComplaintForm ? <form onSubmit={(event) => void submitComplaint(event)} className="mt-3 space-y-2"><textarea required minLength={10} maxLength={10000} value={complaintDescription} onChange={(event) => setComplaintDescription(event.target.value)} placeholder="Describe the issue for Evntora Support" className="w-full rounded-lg border border-[#EAD2B0] bg-white p-3 text-sm"/><div className="flex gap-2"><button disabled={complaintBusy} className="rounded-lg bg-[#681B1D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{complaintBusy ? "Submitting…" : "Submit report"}</button><button type="button" disabled={complaintBusy} onClick={() => { setShowComplaintForm(false); setComplaintError(null); }} className="rounded-lg border border-[#EAD2B0] px-4 py-2 text-xs">Cancel</button></div></form> : <button type="button" onClick={() => setShowComplaintForm(true)} className="mt-2 text-xs font-semibold text-[#681B1D] underline">Report a booking issue</button>}{complaintError && <p role="alert" className="mt-2 text-sm text-rose-700">{complaintError}</p>}<p className="mt-2 text-xs text-[#7D6B63]">Reports are sent to Evntora Support. Your review is shown to the vendor in their Reviews section.</p></div>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {viewer === "customer" && <div className={`${card} space-y-3`}>
      <h4 className="font-serif font-bold">Quotations</h4>
      {quotes.map((quote) => <article key={quote.id} className="rounded-xl border border-[#EAD2B0] p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><b>{quote.quotation_reference} · v{quote.status}</b><b>{formatINR(quote.total_amount / 100)}</b></div>
        <ul className="my-2 list-disc pl-5">{quote.items.map((item) => <li key={item.id}>{item.description} × {item.quantity} — {formatINR(item.line_total / 100)}{item.details ? <span className="ml-1 text-xs text-[#7D6B63]">({item.details})</span> : null}</li>)}</ul>
        <p>Advance {formatINR(quote.advance_amount / 100)} ({quote.advance_percentage}%) · valid through {quote.valid_until}</p>
        <p className="text-[#7D6B63]">{quote.payment_terms}</p>
        {quote.description && <p className="mt-2">{quote.description}</p>}
        {quote.conditions && <p className="mt-1 text-xs text-[#7D6B63]">{quote.conditions}</p>}
        {viewer === "customer" && quote.status === "sent" && quote.valid_until >= new Date().toISOString().slice(0, 10) && <div className="mt-3 flex flex-wrap gap-2">{(["accept", "decline", "request_revision"] as const).map((action) => <button key={action} disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}/quotations/${quote.id}`, "POST", { action, reason: action === "request_revision" ? "Please revise the quoted terms." : undefined })} className="rounded-lg border border-[#681B1D]/40 px-3 py-1.5 text-xs font-semibold capitalize">{action.replaceAll("_", " ")}</button>)}</div>}
      </article>)}
      {!quotes.length && <p className="text-sm text-[#7D6B63]">No quotation has been sent.</p>}
    </div>}
    {viewer === "customer" && <div className={`${card} space-y-3`}><h4 className="font-serif font-bold">Booking conversation</h4><div className="max-h-64 space-y-2 overflow-y-auto">{messages.map((item) => <p key={item.id} className="rounded-xl bg-[#EAD2B0]/25 p-3 text-sm"><span className="block text-[10px] text-[#7D6B63]">{new Date(item.created_at).toLocaleString()}</span>{item.body}</p>)}{!messages.length && <p className="text-sm text-[#7D6B63]">No messages yet. Messages are saved to this booking conversation.</p>}</div><form onSubmit={sendMessage} className="flex gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} placeholder="Write a message…" className="min-w-0 flex-1 rounded-xl border border-[#EAD2B0] bg-white px-3 py-2 text-sm" /><button disabled={busy || !message.trim()} className="rounded-xl bg-[#681B1D] px-4 text-xs font-bold text-white disabled:opacity-50">Send</button></form></div>}
    <div className={`${card} space-y-3`}><h4 className="font-serif font-bold">Payment and refund history</h4>{paymentLog.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-2 border-t border-[#EAD2B0] pt-2 text-sm"><span>{payment.purpose.replaceAll("_", " ")} · {payment.status.replaceAll("_", " ")}{payment.razorpay_payment_id ? ` · ${payment.razorpay_payment_id}` : ""}</span><b>{formatINR(payment.amount / 100)}</b></div>)}{refunds.map((refund) => <div key={refund.id} className="flex flex-wrap justify-between gap-2 border-t border-[#EAD2B0] pt-2 text-sm"><span>Refund · {refund.status}{refund.razorpay_refund_id ? ` · ${refund.razorpay_refund_id}` : ""}<span className="block text-xs text-[#7D6B63]">{refund.reason}</span></span><b>{formatINR(refund.amount / 100)}</b></div>)}{!paymentLog.length && !refunds.length && <p className="text-sm text-[#7D6B63]">No payment or refund records yet.</p>}</div>
    <details className={card}><summary className="cursor-pointer font-serif font-bold">Booking status history</summary><ol className="mt-3 space-y-2">{history.map((entry) => <li key={entry.id} className="border-l-2 border-[#B77A36] pl-3 text-sm"><b>{entry.to_status.replaceAll("_", " ")}</b><span className="ml-2 text-xs text-[#7D6B63]">{new Date(entry.created_at).toLocaleString()}</span>{entry.reason && <p className="text-[#7D6B63]">{entry.reason}</p>}</li>)}</ol></details>
    {!!notifications.length && <div className={`${card} space-y-2`}><h4 className="font-serif font-bold">Booking updates</h4>{notifications.map((notice) => <div key={notice.id} className="flex items-start justify-between gap-3 border-t border-[#EAD2B0] pt-2 text-sm"><div><b>{notice.title}</b><p className="text-[#7D6B63]">{notice.message}</p><time className="text-xs text-[#7D6B63]">{new Date(notice.created_at).toLocaleString()}</time></div>{!notice.read_at && <button onClick={() => void mutate("/api/bookings/notifications", "PATCH", { notificationId: notice.id })} className="shrink-0 text-xs underline">Mark read</button>}</div>)}</div>}
  </section>;
}
