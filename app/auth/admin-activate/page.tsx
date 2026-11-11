"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { normalizePhoneNumber } from "@/lib/phone-number";
import { PhoneNumberField } from "@/components/ui/PhoneNumberField";

export default function AdminActivatePage() {
  const [email, setEmail] = useState("");
  const [verificationType, setVerificationType] = useState<"invite" | "email">("email");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [requiresPhone, setRequiresPhone] = useState(false);
  const [step, setStep] = useState<"verify" | "password" | "done">("verify");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const accept = async (newPassword?: string) => {
    const normalizedPhone = requiresPhone ? normalizePhoneNumber(phone) : null;
    if (requiresPhone && !normalizedPhone) throw new Error("Choose a country code and enter a valid phone number.");
    const response = await fetch("/api/admin/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPassword ? { password: newPassword, ...(normalizedPhone ? { phone: normalizedPhone } : {}) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Invitation could not be accepted.");
    if (result.requiresPasswordSetup) { setRequiresPhone(Boolean(result.requiresPhone)); setStep("password"); return false; }
    setStep("done"); return true;
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const invitedEmail = params.get("email")?.trim().toLowerCase();
    if (invitedEmail) setEmail(invitedEmail);
    if (params.get("type") === "invite") setVerificationType("invite");
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user?.email && !invitedEmail) setEmail(data.user.email);
    });
    return () => { active = false; };
  }, []);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || attempts >= 5) return;
    setBusy(true); setError("");
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: verificationType });
    if (verifyError || !data.user || !data.session) {
      setAttempts((value) => value + 1); setError(attempts >= 4 ? "Too many attempts. Request a new code." : "The code is invalid or expired."); setBusy(false); return;
    }
    try { const accepted = await accept(); if (accepted) window.location.assign("/admin"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invitation could not be accepted."); }
    setBusy(false);
  };

  const resendCode = async () => {
    if (busy || cooldown > 0 || !email.trim()) return;
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/invitations/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "The code could not be resent.");
    else { setCooldown(60); setAttempts(0); setOtp(""); setMessage("If there is an active invitation for this address, a new code has been sent."); }
    setBusy(false);
  };

  const setFirstPassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try { const accepted = await accept(password); if (accepted) window.location.assign("/admin"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Account activation failed."); }
    setBusy(false);
  };

  return <div className="min-h-screen flex flex-col bg-[#FFF3E3] text-[#30221D] dark:bg-[#1A1211] dark:text-[#FFF3E3]"><Navbar/><main className="flex-1 grid place-items-center p-4"><section className="w-full max-w-md space-y-5 rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-8 shadow-xl dark:border-[#4D3331] dark:bg-[#241918]"><h1 className="text-center font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">EVNTORA Admin invitation</h1><p className="text-center text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Verify the invited email. Existing EVNTORA accounts keep their current password; new accounts establish one after verification.</p>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{step === "verify" && <><form onSubmit={verify} className="space-y-3"><label className="block text-xs font-semibold">Invited email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 dark:border-[#4D3331] dark:bg-[#1A1211]"/></label><label className="block text-xs font-semibold">Six-digit email code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 text-center text-lg tracking-[0.35em] dark:border-[#4D3331] dark:bg-[#1A1211]"/></label><button disabled={busy || otp.length !== 6 || attempts >= 5} className="w-full rounded-xl bg-[#681B1D] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Verifying…" : "Verify invitation"}</button></form><button type="button" disabled={busy || cooldown > 0} onClick={() => void resendCode()} className="w-full text-xs font-semibold text-[#681B1D] underline disabled:opacity-50">{cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}</button></>}{step === "password" && <form onSubmit={setFirstPassword} className="space-y-3"><p className="text-sm">Your email is verified. Set the password for this new EVNTORA account before Admin access is activated.</p>{requiresPhone && <div className="space-y-1.5"><p className="text-xs font-semibold">Phone number <span className="text-rose-600">*</span></p><PhoneNumberField id="admin-activation-phone" value={phone} onChange={setPhone}/><span className="block text-xs text-[#7D6B63]">Select your country code, then enter your number.</span></div>}<label className="block text-xs font-semibold">Password<input type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 dark:border-[#4D3331] dark:bg-[#1A1211]"/></label><label className="block text-xs font-semibold">Confirm password<input type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 dark:border-[#4D3331] dark:bg-[#1A1211]"/></label><button disabled={busy} className="w-full rounded-xl bg-[#681B1D] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Activating…" : "Set password and activate Admin"}</button></form>}{step === "done" && <div role="status" className="text-center"><p>Invitation accepted. Your account roles are now active.</p><Link href="/admin" className="mt-4 inline-flex rounded-xl bg-[#681B1D] px-5 py-3 font-semibold text-white">Open Admin Portal</Link></div>}<Link href="/signin" className="block text-center text-xs text-[#681B1D] underline">Back to sign in</Link></section></main><Footer/></div>;
}
