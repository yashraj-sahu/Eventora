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
type DraftQuoteItem = { description: string; quantity: number; unitPriceINR: number };
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
  const [draftItems, setDraftItems] = useState<DraftQuoteItem[]>([{ description: "", quantity: 1, unitPriceINR: 0 }]);
  const [discountINR, setDiscountINR] = useState(0);
  const [additionalChargesINR, setAdditionalChargesINR] = useState(0);
  const [allowPartial, setAllowPartial] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("The stated advance is due to confirm; the remaining balance is due under the booking terms.");
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteConditions, setQuoteConditions] = useState("");
  const [advancePercent, setAdvancePercent] = useState("25");
  const [quoteValidUntil, setQuoteValidUntil] = useState("");
  const [customerReview, setCustomerReview] = useState<CustomerReview | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingRes, quoteRes, messageRes, notificationRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`, { cache: "no-store" }),
        fetch(`/api/bookings/${bookingId}/quotations`, { cache: "no-store" }),
        fetch(`/api/bookings/${bookingId}/messages`, { cache: "no-store" }),
        fetch(`/api/bookings/notifications?bookingId=${bookingId}`, { cache: "no-store" }),
      ]);
      const [bookingData, quoteData, messageData, notificationData] = await Promise.all([bookingRes.json(), quoteRes.json(), messageRes.json(), notificationRes.json()]);
      if (!bookingRes.ok) throw new Error(bookingData.error || "Booking details could not be loaded.");
      if (!quoteRes.ok) throw new Error(quoteData.error || "Quotations could not be loaded.");
      if (!messageRes.ok) throw new Error(messageData.error || "Conversation could not be loaded.");
      if (!notificationRes.ok) throw new Error(notificationData.error || "Booking notifications could not be loaded.");
      setDetail(bookingData.booking); setViewer(bookingData.viewer); setQuotes(quoteData.quotations ?? []); setMessages(messageData.messages ?? []);
      setNotifications(notificationData.notifications ?? []);
      setPayments(bookingData.payments ?? []); setRefunds(bookingData.refunds ?? []); setHistory(bookingData.history ?? []);
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

  const sendQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draftItems.some((item) => !item.description.trim() || !Number.isFinite(item.unitPriceINR) || item.unitPriceINR <= 0 || !Number.isFinite(item.quantity) || item.quantity <= 0) || !quoteValidUntil) { setError("Enter complete quotation items and an expiry date."); return; }
    const result = await mutate(`/api/bookings/${bookingId}/quotations`, "POST", {
      items: draftItems.map((item) => ({ ...item, description: item.description.trim() })), discountINR, additionalChargesINR, advancePercentage: Number(advancePercent),
      allowPartialPayments: allowPartial, paymentTerms, validUntil: quoteValidUntil, description: quoteDescription, conditions: quoteConditions,
    });
    if (result) setDraftItems([{ description: "", quantity: 1, unitPriceINR: 0 }]);
  };

  if (!detail && !error) return <div role="status" className={card}>Loading booking details…</div>;
  if (!detail) return <div role="alert" className={`${card} text-rose-700`}>{error}</div>;
  const outstanding = Math.max(0, detail.total_amount - detail.paid_amount);
  const canPay = viewer === "customer" && ["awaiting_payment", "confirmed"].includes(detail.status) && outstanding > 0;
  const activeQuote = quotes.find((quote) => quote.id === detail.accepted_quotation_id);

  return <section className="space-y-4" aria-label={`Booking ${detail.booking_reference} details`}>
    <div className={`${card} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-[#7D6B63]">{detail.booking_reference}</p><h3 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">{detail.vendor_name}</h3><p className="text-sm text-[#7D6B63]">{detail.vendor_category} · {detail.event_city} · {new Date(`${detail.event_date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {detail.guest_count ?? "Guest count not set"}</p></div><span className="rounded-full bg-[#EAD2B0]/60 px-3 py-1 text-xs font-bold capitalize">{detail.status.replaceAll("_", " ")}</span></div>
      {detail.requirements && <p className="text-sm">{detail.requirements}</p>}
      <div className="grid gap-2 text-sm sm:grid-cols-3"><p>Total: <b>{formatINR(detail.total_amount / 100)}</b></p><p>Paid: <b>{formatINR(detail.paid_amount / 100)}</b></p><p>Outstanding: <b>{formatINR(outstanding / 100)}</b></p></div>
      {activeQuote && <div className="border-t border-[#EAD2B0] pt-3 text-sm"><b>Accepted terms · {activeQuote.quotation_reference}</b><p>Advance: {formatINR(activeQuote.advance_amount / 100)} ({activeQuote.advance_percentage}%) · {activeQuote.payment_terms}</p></div>}
      {canPay && <div className="flex flex-wrap gap-2"><Link href={`/checkout?bookingId=${bookingId}`} className="rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-bold text-white">{detail.paid_amount ? "Pay outstanding balance" : "Pay agreed advance"}</Link>{detail.allow_partial_payments && <Link href={`/checkout?bookingId=${bookingId}&purpose=partial`} className="rounded-xl border border-[#681B1D] px-4 py-2 text-xs font-bold text-[#681B1D]">Make a partial payment</Link>}</div>}
      {viewer === "customer" && ["pending_vendor_confirmation", "awaiting_quotation", "quotation_sent", "quotation_revision_requested"].includes(detail.status) && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "withdraw", reason: "Customer withdrew the request" })} className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Withdraw booking request</button>}
      {viewer === "customer" && ["awaiting_payment", "confirmed", "in_progress"].includes(detail.status) && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "request_cancellation", reason: "Customer requested cancellation" })} className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Request cancellation</button>}
      {viewer === "vendor" && detail.status === "pending_vendor_confirmation" && <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "accept" })} className="rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-bold text-white">Accept request</button><button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "reject", reason: "Vendor declined the request" })} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700">Decline request</button></div>}
      {viewer === "vendor" && detail.status === "cancellation_requested" && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "approve_cancellation", reason: "Vendor approved cancellation" })} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700">Approve cancellation request</button>}
      {viewer === "vendor" && detail.status === "confirmed" && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "start" })} className="rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-bold text-white">Mark service started</button>}
      {viewer === "vendor" && detail.status === "in_progress" && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "complete" })} className="rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-bold text-white">Mark service complete</button>}
      {viewer === "customer" && detail.status === "completed" && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}`, "PATCH", { action: "acknowledge_completion" })} className="rounded-xl border border-[#681B1D] px-4 py-2 text-xs font-semibold text-[#681B1D]">Acknowledge completion</button>}
      {viewer === "customer" && detail.status === "completed" && (customerReview ? <div className="rounded-xl bg-[#FFF3E3] p-3 text-sm dark:bg-[#1A1211]"><b>Your review · {customerReview.rating}/5</b><p className="mt-1">{customerReview.review_text}</p>{customerReview.vendor_response && <p className="mt-2 border-t border-[#EAD2B0] pt-2"><b>Vendor response</b><span className="block">{customerReview.vendor_response}</span></p>}</div> : <form onSubmit={(event) => void submitReview(event)} className="grid gap-2 rounded-xl border border-[#EAD2B0] p-3 sm:grid-cols-[10rem_1fr_auto]"><label className="text-xs">Rating<select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2">{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label><label className="text-xs">Review<textarea required minLength={2} maxLength={2000} value={reviewText} onChange={(event) => setReviewText(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" placeholder="Share your experience"/></label><button disabled={busy || reviewText.trim().length < 2} className="self-end rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Submit review</button></form>)}
    </div>

    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {(viewer === "customer" || viewer === "vendor") && <div className={`${card} space-y-3`}>
      <h4 className="font-serif font-bold">Quotations</h4>
      {quotes.map((quote) => <article key={quote.id} className="rounded-xl border border-[#EAD2B0] p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><b>{quote.quotation_reference} · v{quote.status}</b><b>{formatINR(quote.total_amount / 100)}</b></div>
        <ul className="my-2 list-disc pl-5">{quote.items.map((item) => <li key={item.id}>{item.description} × {item.quantity} — {formatINR(item.line_total / 100)}</li>)}</ul>
        <p>Advance {formatINR(quote.advance_amount / 100)} ({quote.advance_percentage}%) · valid through {quote.valid_until}</p>
        <p className="text-[#7D6B63]">{quote.payment_terms}</p>
        {quote.description && <p className="mt-2">{quote.description}</p>}
        {quote.conditions && <p className="mt-1 text-xs text-[#7D6B63]">{quote.conditions}</p>}
        {viewer === "customer" && quote.status === "sent" && quote.valid_until >= new Date().toISOString().slice(0, 10) && <div className="mt-3 flex flex-wrap gap-2">{(["accept", "decline", "request_revision"] as const).map((action) => <button key={action} disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}/quotations/${quote.id}`, "POST", { action, reason: action === "request_revision" ? "Please revise the quoted terms." : undefined })} className="rounded-lg border border-[#681B1D]/40 px-3 py-1.5 text-xs font-semibold capitalize">{action.replaceAll("_", " ")}</button>)}</div>}
        {viewer === "vendor" && quote.status === "sent" && <button disabled={busy} onClick={() => void mutate(`/api/bookings/${bookingId}/quotations/${quote.id}`, "DELETE")} className="mt-2 text-xs text-rose-700 underline">Withdraw quotation</button>}
      </article>)}
      {!quotes.length && <p className="text-sm text-[#7D6B63]">No quotation has been sent.</p>}
      {viewer === "vendor" && ["awaiting_quotation", "quotation_revision_requested"].includes(detail.status) && <form onSubmit={sendQuote} className="space-y-3 border-t border-[#EAD2B0] pt-3">
        <div className="flex items-center justify-between"><b className="text-sm">Quotation items</b><button type="button" disabled={draftItems.length >= 30} onClick={() => setDraftItems((items) => [...items, { description: "", quantity: 1, unitPriceINR: 0 }])} className="text-xs font-semibold text-[#681B1D] underline">Add item</button></div>
        {draftItems.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_90px_140px_auto]">
          <input aria-label="Service item description" required maxLength={300} placeholder="Service or item" value={item.description} onChange={(event) => setDraftItems((items) => items.map((entry, at) => at === index ? { ...entry, description: event.target.value } : entry))} className="rounded-lg border border-[#EAD2B0] bg-white p-2 text-xs" />
          <input aria-label="Quantity" required type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => setDraftItems((items) => items.map((entry, at) => at === index ? { ...entry, quantity: Number(event.target.value) } : entry))} className="rounded-lg border border-[#EAD2B0] bg-white p-2 text-xs" />
          <input aria-label="Unit price in INR" required type="number" min="0.01" step="0.01" value={item.unitPriceINR || ""} onChange={(event) => setDraftItems((items) => items.map((entry, at) => at === index ? { ...entry, unitPriceINR: Number(event.target.value) } : entry))} className="rounded-lg border border-[#EAD2B0] bg-white p-2 text-xs" />
          <button type="button" disabled={draftItems.length === 1} onClick={() => setDraftItems((items) => items.filter((_, at) => at !== index))} className="text-xs text-rose-700 disabled:opacity-30">Remove</button>
        </div>)}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs">Discount (INR)<input type="number" min="0" step="0.01" value={discountINR} onChange={(event) => setDiscountINR(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" /></label>
          <label className="text-xs">Additional charges (INR)<input type="number" min="0" step="0.01" value={additionalChargesINR} onChange={(event) => setAdditionalChargesINR(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" /></label>
          <label className="text-xs">Advance %<select value={advancePercent} onChange={(event) => setAdvancePercent(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2">{[25, 50, 75, 100].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-xs">Valid until<input required type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={quoteValidUntil} onChange={(event) => setQuoteValidUntil(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allowPartial} onChange={(event) => setAllowPartial(event.target.checked)} />Allow partial payments</label>
          <label className="text-xs sm:col-span-2">Payment terms<textarea maxLength={2000} value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" /></label>
          <label className="text-xs sm:col-span-2">Description<textarea maxLength={2000} value={quoteDescription} onChange={(event) => setQuoteDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" /></label>
          <label className="text-xs sm:col-span-2">Conditions<textarea maxLength={4000} value={quoteConditions} onChange={(event) => setQuoteConditions(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EAD2B0] bg-white p-2" /></label>
        </div>
        <button disabled={busy} className="w-full rounded-xl bg-[#681B1D] p-2 text-xs font-bold text-white">Send quotation</button>
      </form>}
    </div>}
    {(viewer === "customer" || viewer === "vendor") && <div className={`${card} space-y-3`}><h4 className="font-serif font-bold">Booking conversation</h4><div className="max-h-64 space-y-2 overflow-y-auto">{messages.map((item) => <p key={item.id} className="rounded-xl bg-[#EAD2B0]/25 p-3 text-sm"><span className="block text-[10px] text-[#7D6B63]">{new Date(item.created_at).toLocaleString()}</span>{item.body}</p>)}{!messages.length && <p className="text-sm text-[#7D6B63]">No messages yet. Messages are saved to this booking conversation.</p>}</div><form onSubmit={sendMessage} className="flex gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} placeholder="Write a message…" className="min-w-0 flex-1 rounded-xl border border-[#EAD2B0] bg-white px-3 py-2 text-sm" /><button disabled={busy || !message.trim()} className="rounded-xl bg-[#681B1D] px-4 text-xs font-bold text-white disabled:opacity-50">Send</button></form></div>}
    <div className={`${card} space-y-3`}><h4 className="font-serif font-bold">Payment and refund history</h4>{payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-2 border-t border-[#EAD2B0] pt-2 text-sm"><span>{payment.purpose.replaceAll("_", " ")} · {payment.status.replaceAll("_", " ")}{payment.razorpay_payment_id ? ` · ${payment.razorpay_payment_id}` : ""}</span><b>{formatINR(payment.amount / 100)}</b></div>)}{refunds.map((refund) => <div key={refund.id} className="flex flex-wrap justify-between gap-2 border-t border-[#EAD2B0] pt-2 text-sm"><span>Refund · {refund.status}{refund.razorpay_refund_id ? ` · ${refund.razorpay_refund_id}` : ""}<span className="block text-xs text-[#7D6B63]">{refund.reason}</span></span><b>{formatINR(refund.amount / 100)}</b></div>)}{!payments.length && !refunds.length && <p className="text-sm text-[#7D6B63]">No payment or refund records yet.</p>}</div>
    <details className={card}><summary className="cursor-pointer font-serif font-bold">Booking status history</summary><ol className="mt-3 space-y-2">{history.map((entry) => <li key={entry.id} className="border-l-2 border-[#B77A36] pl-3 text-sm"><b>{entry.to_status.replaceAll("_", " ")}</b><span className="ml-2 text-xs text-[#7D6B63]">{new Date(entry.created_at).toLocaleString()}</span>{entry.reason && <p className="text-[#7D6B63]">{entry.reason}</p>}</li>)}</ol></details>
    {!!notifications.length && <div className={`${card} space-y-2`}><h4 className="font-serif font-bold">Booking updates</h4>{notifications.map((notice) => <div key={notice.id} className="flex items-start justify-between gap-3 border-t border-[#EAD2B0] pt-2 text-sm"><div><b>{notice.title}</b><p className="text-[#7D6B63]">{notice.message}</p><time className="text-xs text-[#7D6B63]">{new Date(notice.created_at).toLocaleString()}</time></div>{!notice.read_at && <button onClick={() => void mutate("/api/bookings/notifications", "PATCH", { notificationId: notice.id })} className="shrink-0 text-xs underline">Mark read</button>}</div>)}</div>}
  </section>;
}
