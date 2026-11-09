"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Check, LockKeyhole, Settings, UserRound } from "lucide-react";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setName(profile?.full_name ?? ""); setPhone(profile?.phone ?? ""); }, [profile]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true); setSaved(false); setError("");
    const { data, error: saveError } = await supabase.from("profiles").update({ full_name: name.trim() || null, phone: phone.trim() || null }).eq("id", user.id).select("id").maybeSingle();
    if (saveError || !data) setError("Profile changes could not be saved. Please try again.");
    else { await refreshProfile(); setSaved(true); }
    setSaving(false);
  };

  return <div className="max-w-3xl space-y-7"><header><span className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-[.18em] text-[#B77A36]"><Settings className="w-4 h-4"/>Account</span><h1 className="mt-2 text-3xl sm:text-4xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Profile & Settings</h1><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Your global account details and security options.</p></header>
    <section className="p-6 sm:p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm"><h2 className="flex items-center gap-2 text-xl font-serif font-bold"><UserRound className="w-5 h-5 text-[#B77A36]"/>Personal profile</h2><form onSubmit={saveProfile} className="mt-6 space-y-4"><label className="block text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">Full name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-sm text-[#30221D] dark:text-[#FFF3E3]"/></label><label className="block text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">Phone<input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-xl p-3 bg-[#FFF3E3] dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-sm text-[#30221D] dark:text-[#FFF3E3]"/></label><label className="block text-xs font-semibold text-[#7D6B63] dark:text-[#D4C3B7]">Sign-in email<input disabled value={profile?.email ?? user?.email ?? ""} className="mt-1.5 w-full rounded-xl p-3 bg-[#F3EEE6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] text-sm opacity-75"/><span className="mt-1 block font-normal">Email changes require the account verification flow.</span></label>{error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}{saved && <p role="status" className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300"><Check className="w-4 h-4"/>Profile saved to your account.</p>}<div><button disabled={saving} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#681B1D] to-[#4B1117] text-white text-xs font-bold disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button></div></form></section>
    <section className="p-6 sm:p-8 rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]"><h2 className="flex items-center gap-2 text-xl font-serif font-bold"><LockKeyhole className="w-5 h-5 text-[#B77A36]"/>Password & security</h2><p className="mt-2 text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Use the verified password reset flow for your Evntora account.</p><Link href="/auth/forgot-password" className="inline-flex mt-4 px-4 py-2.5 rounded-xl border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold hover:bg-[#EAD2B0]/40 dark:hover:bg-[#2E1F1E]">Reset password</Link></section>
  </div>;
}
