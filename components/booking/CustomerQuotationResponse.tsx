"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";

type Quote = {
  id: string;
  quotation_reference: string;
  version: number;
  status: string;
  total_amount: number;
  advance_amount: number;
  advance_percentage: number;
  payment_terms: string;
  valid_until: string;
  items: Array<{ id: string; description: string; details: string | null; quantity: number; line_total: number }>;
};

export function CustomerQuotationResponse({ bookingId, onRespond }: { bookingId: string; onRespond: () => void }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/bookings/${bookingId}/quotations`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Quotation could not be loaded.");
        const current = (data.quotations as Quote[] | undefined)?.find((item) => item.status === "sent" || item.status === "expired");
        if (active) setQuote(current ?? null);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Quotation could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId]);

  const respond = async (action: "accept" | "decline") => {
    if (!quote || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/quotations/${quote.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Your quotation response could not be saved.");
      setNotice(action === "accept"
        ? "Quotation accepted. It is now in your bookings awaiting the required payment."
        : "Quotation declined. The vendor has been notified.");
      onRespond();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your quotation response could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p role="status" className="mt-3 rounded-xl bg-[#FFF3E3] p-4 text-sm text-[#7D6B63]">Loading vendor quotation…</p>;
  if (error && !quote) return <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>;
  if (!quote) return <p className="mt-3 rounded-xl bg-[#FFF3E3] p-4 text-sm text-[#7D6B63]">Quotation details are not available yet. Refresh this page or contact support if the request remains in this state.</p>;

  const canRespond = quote.status === "sent" && quote.valid_until >= new Date().toISOString().slice(0, 10);
  return <section aria-label={`Quotation ${quote.quotation_reference}`} className="mt-3 rounded-xl border border-[#EAD2B0] bg-[#FFF9F0] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-mono text-xs text-[#7D6B63]">{quote.quotation_reference} · Version {quote.version}</p><p className="mt-1 text-sm font-semibold text-[#30221D]">Vendor quotation</p></div>
      <div className="text-right"><p className="text-xs text-[#7D6B63]">Proposed total</p><p className="font-serif text-2xl font-bold text-[#681B1D]">{formatINR(quote.total_amount / 100)}</p></div>
    </div>
    <ul className="mt-3 space-y-1 border-t border-[#EAD2B0] pt-3 text-sm">{quote.items.map((item) => <li key={item.id} className="flex justify-between gap-3"><span>{item.description} × {item.quantity}{item.details ? <small className="block text-xs text-[#7D6B63]">{item.details}</small> : null}</span><b>{formatINR(item.line_total / 100)}</b></li>)}</ul>
    <p className="mt-3 text-sm">Required advance: <b>{formatINR(quote.advance_amount / 100)}</b> ({quote.advance_percentage}%)</p>
    <p className="mt-1 text-xs text-[#7D6B63]">{quote.payment_terms}</p>
    <p className="mt-1 text-xs text-[#7D6B63]">Valid through {new Date(`${quote.valid_until}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
    {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {canRespond && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void respond("accept")} className="rounded-lg bg-[#681B1D] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving…" : "Accept quotation"}</button><button type="button" disabled={busy} onClick={() => void respond("decline")} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 disabled:opacity-60">Reject quotation</button></div>}
    {!canRespond && !notice && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This quotation has expired. The vendor will need to send a revised quotation.</p>}
  </section>;
}
