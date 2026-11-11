"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";

type Props = {
  bookingId: string;
  bookingReference: string;
  serviceName: string;
  onSent: (totalAmountPaise: number) => void;
};

export function VendorQuoteAmountForm({ bookingId, bookingReference, serviceName, onSent }: Props) {
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentReference, setSentReference] = useState<string | null>(null);
  const [sentAmountPaise, setSentAmountPaise] = useState<number | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountINR = Number(amount);
    if (!Number.isFinite(amountINR) || amountINR <= 0 || !Number.isSafeInteger(Math.round(amountINR * 100))) {
      setError("Enter a valid quotation amount greater than ₹0.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const response = await fetch(`/api/bookings/${bookingId}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ description: serviceName || "Requested event service", details: "Vendor quotation", quantity: 1, unitPriceINR: amountINR }],
          discountINR: 0,
          additionalChargesINR: 0,
          advancePercentage: 25,
          allowPartialPayments: true,
          paymentTerms: "After accepting this quotation, you may pay installments of at least ₹1. The booking is confirmed when verified payments reach the stated advance; the remaining balance follows the agreed booking terms.",
          validUntil,
          description: `Quotation for ${bookingReference}`,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.quotation) throw new Error(result.error || "Quotation could not be sent. Please review the request status and try again.");
      const totalAmountPaise = Number(result.quotation.totalAmount);
      if (!Number.isSafeInteger(totalAmountPaise) || totalAmountPaise <= 0) throw new Error("Quotation saved, but the server did not return a valid total. Refresh the request to verify its status.");
      setSentReference(result.quotation.reference || bookingReference);
      setSentAmountPaise(totalAmountPaise);
      onSent(totalAmountPaise);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Quotation could not be sent.");
    } finally {
      setSending(false);
    }
  };

  if (sentReference) return <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
    Quotation <b>{sentReference}</b> for <b>{sentAmountPaise == null ? "the submitted amount" : formatINR(sentAmountPaise / 100)}</b> was sent. The request status is now <b>Quotation sent</b>; the customer must accept it before payment becomes available.
  </div>;

  return <form onSubmit={submit} className="rounded-xl border border-[#EAD2B0] bg-white p-4">
    <label htmlFor={`quotation-amount-${bookingId}`} className="block text-sm font-semibold text-[#30221D]">Enter your quotation amount (INR)</label>
    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <div className="flex min-w-0 flex-1 items-center rounded-lg border border-[#EAD2B0] bg-[#FFFCF6] px-3">
        <span className="mr-2 text-[#7D6B63]">₹</span>
        <input id={`quotation-amount-${bookingId}`} required type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter total service amount" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
      </div>
      <button type="submit" disabled={sending} className="rounded-lg bg-[#681B1D] px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{sending ? "Sending…" : "Send quotation"}</button>
    </div>
    <p className="mt-2 text-xs text-[#7D6B63]">The customer sees this as a proposal and can accept, decline, or request a revision. No payment is charged by sending a quotation.</p>
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
  </form>;
}
