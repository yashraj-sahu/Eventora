"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { normalizePhoneNumber } from "@/lib/phone-number";
import { PhoneNumberField } from "@/components/ui/PhoneNumberField";
import { Check, LockKeyhole, Settings, UserRound } from "lucide-react";

export function AccountSettings() {
  const { user, profile, roles, refreshProfile, isLoading: loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  useEffect(() => { setName(profile?.full_name ?? ""); setPhone(profile?.phone ?? ""); }, [profile]);
  useEffect(() => { if (!loading && !user) router.replace(`/signin?redirectTo=${encodeURIComponent("/account/settings")}`); }, [loading, user, router]);
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault(); if (!user || !roles.length) return;
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) { setSaved(false); setError("Choose a country code and enter a valid phone number."); return; }
    setSaving(true); setSaved(false); setError("");
    try {
      const response = await fetch("/api/account/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: name.trim(), phone: normalizedPhone }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profile changes could not be saved.");
      setPhone(result.profile.phone); await refreshProfile(); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Profile changes could not be saved. Please try again."); }
    setSaving(false);
  };
  if (loading || !user) return <div role="status" className="p-8 text-sm text-[#7D6B63]">Loading account settings…</div>;
  return <div className="max-w-3xl space-y-7"><header><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#B77A36]"><Settings className="h-4 w-4"/>Account</span><h1 className="mt-2 font-serif text-3xl font-bold text-[#681B1D] dark:text-[#FFF3E3]">Profile & Settings</h1><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Your global account details and security options.</p></header>
    <section className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-6 shadow-sm dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="flex items-center gap-2 font-serif text-xl font-bold"><UserRound className="h-5 w-5 text-[#B77A36]"/>Personal profile</h2>{!profile?.phone && <p className="mt-3 rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] p-3 text-sm text-[#715D54]">Add a phone number with its country code to complete your account profile.</p>}<form onSubmit={saveProfile} className="mt-6 space-y-4"><label className="block text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">Full name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] p-3 text-sm text-[#30221D] dark:border-[#4D3331] dark:bg-[#1A1211] dark:text-[#FFF3E3]"/></label><div className="space-y-1.5"><p className="text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">Phone <span className="text-rose-600">*</span></p><PhoneNumberField id="profile-phone" value={phone} onChange={setPhone}/><span className="block text-xs font-normal text-[#7D6B63]">Select your country code, then enter your number.</span></div><label className="block text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">Sign-in email<input disabled value={profile?.email ?? user.email ?? ""} className="mt-1.5 w-full rounded-xl border border-[#EAD2B0] bg-[#F3EEE6] p-3 text-sm opacity-75 dark:border-[#4D3331] dark:bg-[#2E1F1E]"/><span className="mt-1 block font-normal">Email changes require the account verification flow.</span></label>{error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}{saved && <p role="status" className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4"/>Profile saved to your account.</p>}<button disabled={saving} className="rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button></form></section>
    <section className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-6 dark:border-[#4D3331] dark:bg-[#241918]"><h2 className="flex items-center gap-2 font-serif text-xl font-bold"><LockKeyhole className="h-5 w-5 text-[#B77A36]"/>Password & security</h2><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Use the verified password reset flow for your Evntora account.</p><Link href="/auth/forgot-password" className="mt-4 inline-flex rounded-xl border border-[#EAD2B0] px-4 py-2.5 text-xs font-semibold hover:bg-[#EAD2B0]/40 dark:border-[#4D3331] dark:hover:bg-[#2E1F1E]">Reset password</Link></section>
  </div>;
}
