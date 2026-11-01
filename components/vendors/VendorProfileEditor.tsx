"use client";

import { useState } from "react";
import type { Database } from "@/types/database";

type VendorProfile = Database["public"]["Tables"]["vendor_profiles"]["Row"];

export function VendorProfileEditor({ profile, onSaved }: { profile: VendorProfile; onSaved: () => void }) {
  const [values, setValues] = useState({ business_name: profile.business_name, business_category: profile.business_category, city: profile.city, business_description: profile.business_description || "", address: profile.address || "", contact_phone: profile.contact_phone || "", contact_email: profile.contact_email || "", short_bio: profile.short_bio || "" });
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const input = "w-full rounded-xl border border-[#E8E2D7] dark:border-[#344139] bg-[#FAF8F3] dark:bg-[#1C2520] px-3 py-2 text-sm";
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/vendors/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: profile.id, ...values }) });
    const data = await response.json(); setMessage(response.ok ? "Profile saved" : data.error || "Unable to save profile");
    if (response.ok) onSaved(); setBusy(false);
  };
  return <form onSubmit={save} className="space-y-3 rounded-2xl border border-[#E8E2D7] dark:border-[#344139] p-5">
    <h3 className="font-semibold">Business profile</h3>
    <div className="grid gap-3 sm:grid-cols-2"><input required className={input} aria-label="Business name" value={values.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Business name"/><input required className={input} aria-label="Category" value={values.business_category} onChange={(e) => update("business_category", e.target.value)} placeholder="Category"/><input required className={input} aria-label="City or region" value={values.city} onChange={(e) => update("city", e.target.value)} placeholder="City or region"/><input className={input} aria-label="Contact email" type="email" value={values.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="Business contact email"/><input className={input} aria-label="Contact phone" value={values.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="Phone"/><input className={input} aria-label="Business address" value={values.address} onChange={(e) => update("address", e.target.value)} placeholder="Address"/></div>
    <input className={input} aria-label="Short description" value={values.short_bio} onChange={(e) => update("short_bio", e.target.value)} placeholder="Short introduction"/><textarea className={input} aria-label="Business description" rows={4} value={values.business_description} onChange={(e) => update("business_description", e.target.value)} placeholder="Business description"/>
    <div className="flex items-center gap-3"><button disabled={busy} className="rounded-xl bg-[#173F35] px-4 py-2 text-sm text-white disabled:opacity-50">Save business profile</button>{message && <span role="status" className="text-xs">{message}</span>}</div>
  </form>;
}
