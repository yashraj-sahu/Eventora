"use client";

import { useState } from "react";
import type { Database } from "@/types/database";

type VendorProfile = Database["public"]["Tables"]["vendor_profiles"]["Row"];

export function VendorProfileEditor({ profile, onSaved }: { profile: VendorProfile; onSaved: () => void }) {
  const [values, setValues] = useState({ business_name: profile.business_name, business_category: profile.business_category, city: profile.city, business_description: profile.business_description || "", address: profile.address || "", contact_phone: profile.contact_phone || "", contact_email: profile.contact_email || "", short_bio: profile.short_bio || "", cover_image_url: profile.cover_image_url || "" });
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const input = "w-full rounded-xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFF3E3]/60 dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] px-3 py-2 text-xs focus:outline-none focus:border-[#B77A36]";
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/vendors/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: profile.id, ...values }) });
    const data = await response.json(); setMessage(response.ok ? "Profile saved" : data.error || "Unable to save profile");
    if (response.ok) onSaved(); setBusy(false);
  };
  const uploadCover = async (file: File) => {
    setBusy(true); setMessage("");
    try {
      const body = new FormData(); body.set("vendorId", profile.id); body.set("file", file); body.set("caption", "Business cover image");
      const response = await fetch("/api/vendors/portfolio", { method: "POST", body }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cover image could not be uploaded.");
      setValues((current) => ({ ...current, cover_image_url: data.public_url }));
      setMessage("Image uploaded. Save the profile to publish the cover image.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Cover image could not be uploaded."); }
    finally { setBusy(false); }
  };
  return <form onSubmit={save} className="space-y-3 rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFFCF6] dark:bg-[#2E1F1E] p-5 shadow-sm">
    <h3 className="font-serif font-bold text-base text-[#30221D] dark:text-[#FFF3E3]">Business Profile</h3>
    <div className="grid gap-3 sm:grid-cols-2"><input required className={input} aria-label="Business name" value={values.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Business name"/><input required className={input} aria-label="Category" value={values.business_category} onChange={(e) => update("business_category", e.target.value)} placeholder="Category"/><input required className={input} aria-label="City or region" value={values.city} onChange={(e) => update("city", e.target.value)} placeholder="City or region"/><input className={input} aria-label="Contact email" type="email" value={values.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="Business contact email"/><input className={input} aria-label="Contact phone" value={values.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="Phone"/><input className={input} aria-label="Business address" value={values.address} onChange={(e) => update("address", e.target.value)} placeholder="Address"/></div>
    <input className={input} aria-label="Short description" value={values.short_bio} onChange={(e) => update("short_bio", e.target.value)} placeholder="Short introduction"/><textarea className={input} aria-label="Business description" rows={4} value={values.business_description} onChange={(e) => update("business_description", e.target.value)} placeholder="Business description"/>
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label className="text-xs font-semibold">Business cover image URL<input className={`${input} mt-1`} value={values.cover_image_url} onChange={(e) => update("cover_image_url", e.target.value)} placeholder="https://… or upload an image"/></label><label className="text-xs font-semibold">Upload cover image<input className="mt-1 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); event.currentTarget.value = ""; }}/></label></div>
    <div className="flex items-center gap-3"><button disabled={busy} className="rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] hover:from-[#7A2124] hover:to-[#5C151D] px-4 py-2 text-xs font-semibold text-[#FFF3E3] disabled:opacity-50 border border-[#B77A36]/40 cursor-pointer">Save business profile</button>{message && <span role="status" className="text-xs text-[#681B1D] dark:text-[#EAD2B0]">{message}</span>}</div>
  </form>;
}
