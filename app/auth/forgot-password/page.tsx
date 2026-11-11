"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Lock } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (busy || cooldown > 0 || !email.trim()) return;
    setBusy(true); setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/reset-password` });
    if (resetError) setError("We couldn’t send a recovery code right now. Check the address and try again later.");
    else { setCodeSent(true); setVerified(false); setOtp(""); setAttempts(0); setCooldown(60); }
    setBusy(false);
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || attempts >= 5) return;
    setBusy(true); setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: "recovery" });
    if (verifyError || !data.session) {
      setAttempts((value) => value + 1);
      setError(attempts >= 4 ? "Too many incorrect codes. Request a new code to continue." : "That code is invalid or expired. Check your email and try again.");
    } else setVerified(true);
    setBusy(false);
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verified || busy) return;
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError("The password could not be updated. Verify the code again or request a new one.");
    else setSuccess(true);
    setBusy(false);
  };

  return <div data-evntora-theme="portal" className="min-h-screen flex flex-col bg-[#FFF3E3] text-[#30221D] dark:bg-[#08090d] dark:text-[#FFF3E3]">
    <Navbar />
    <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-8 shadow-2xl dark:border-[#4D3331] dark:bg-[#1A1211] sm:p-10">
        <header className="space-y-2 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#681B1D] text-[#EAD2B0]"><Lock className="h-5 w-5"/></div><h1 className="font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Reset your password</h1><p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">One verified email and one password work across your authorized EVNTORA workspaces.</p></header>
        {error && <p role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</p>}
        {success ? <div role="status" className="space-y-4 text-center"><CheckCircle className="mx-auto h-10 w-10 text-emerald-700"/><p className="text-sm">Your password is updated. Your roles and workspace access were not changed.</p><Link href="/signin" className="inline-flex rounded-xl bg-[#681B1D] px-5 py-3 text-sm font-semibold text-white">Sign in</Link></div> : <>
          <label className="block text-xs font-semibold">Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={verified} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 dark:border-[#4D3331] dark:bg-[#241918]"/></label>
          {!codeSent ? <button type="button" disabled={busy || !email.trim()} onClick={() => void sendCode()} className="w-full rounded-xl bg-[#681B1D] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Sending…" : "Send six-digit code"}</button> : !verified ? <><form onSubmit={verifyCode} className="space-y-3"><label className="block text-xs font-semibold">Six-digit email code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 text-center text-lg tracking-[0.35em] dark:border-[#4D3331] dark:bg-[#241918]"/></label><button disabled={busy || otp.length !== 6 || attempts >= 5} className="w-full rounded-xl bg-[#681B1D] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Verifying…" : "Verify code"}</button></form><button type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()} className="w-full text-xs font-semibold text-[#681B1D] underline disabled:opacity-50">{cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}</button></> : <form onSubmit={updatePassword} className="space-y-3"><label className="block text-xs font-semibold">New password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 dark:border-[#4D3331] dark:bg-[#241918]"/></label><label className="block text-xs font-semibold">Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-3 dark:border-[#4D3331] dark:bg-[#241918]"/></label><button disabled={busy} className="w-full rounded-xl bg-[#681B1D] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Updating…" : "Set new password"}</button></form>}
        </>}
        <Link href="/signin" className="flex items-center justify-center gap-2 text-xs text-[#7D6B63] hover:underline"><ArrowLeft className="h-3.5 w-3.5"/>Back to Sign In</Link>
      </section>
    </main><Footer/>
  </div>;
}
