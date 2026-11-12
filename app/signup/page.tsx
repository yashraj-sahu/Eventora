"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { normalizePhoneNumber } from "@/lib/phone-number";
import { PhoneNumberField } from "@/components/ui/PhoneNumberField";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { user, roles } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingAccountDetected, setExistingAccountDetected] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpType, setOtpType] = useState<"signup" | "email">("signup");
  const [otpFocused, setOtpFocused] = useState(false);
  const [otpFocusIndex, setOtpFocusIndex] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const validate = () => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!email.trim()) return "Please enter your email address.";
    if (!normalizePhoneNumber(phone)) return "Choose a country code and enter a valid phone number.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!agreedToTerms) return "Please accept the Terms & Privacy Policy.";
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const requestedRedirect = params.get("redirectTo") || "";
      const safeDestination = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//") && !requestedRedirect.includes("\\") && new URL(requestedRedirect, window.location.origin).origin === window.location.origin ? requestedRedirect : "/dashboard";
      // 1. Create Supabase Auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeDestination)}`,
          data: {
            full_name: fullName.trim(),
            phone: normalizePhoneNumber(phone),
            role: "customer",
          },
        },
      });

      if (signUpError) {
        if (/already registered|already exists/i.test(signUpError.message)) {
          setExistingAccountDetected(true);
          setError("An account with this email already exists. Please sign in.");
        } else {
          setError("We couldn’t create your account right now. Please try again.");
        }
        return;
      }

      // Supabase may deliberately return an empty identities array for a
      // duplicate email instead of returning an account-exists error.
      if (data.user && !data.session && data.user.identities?.length === 0) {
        setExistingAccountDetected(true);
        setError("This email is already registered with Evntora. Sign in to use your existing account and access.");
        return;
      }

      if (!data.user) { setError("We couldn’t create your account. Please try again."); return; }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSuccess(true);
        setOtp(""); setOtpAttempts(0); setResendCooldown(60); setOtpType("signup");
      } else if (data.session) {
        // Some projects allow auto-confirm and return a session immediately.
        // Still require the requested six-digit UX before continuing.
        await supabase.auth.signOut();
        const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
        if (otpError) { setError("Email code verification is required, but a code could not be sent. Contact support before continuing."); return; }
        setOtpType("email"); setSuccess(true); setOtp(""); setOtpAttempts(0); setResendCooldown(60);
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      setError(
        "An unexpected error occurred during account registration."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignupOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otpAttempts >= 5 || isLoading) return;
    setIsLoading(true); setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: otpType });
    if (verifyError || !data.user || !data.session) {
      setOtpAttempts((value) => value + 1);
      setError(otpAttempts >= 4 ? "Too many incorrect codes. Request a new code and try again." : "That code is invalid or expired. Check the email and try again.");
      setIsLoading(false); return;
    }
    const params = new URLSearchParams(window.location.search);
    const requestedRedirect = params.get("redirectTo") || "";
    const destination = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//") && !requestedRedirect.includes("\\") && new URL(requestedRedirect, window.location.origin).origin === window.location.origin ? requestedRedirect : "/dashboard";
    window.location.assign(destination);
  };

  const resendSignupOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true); setError(null);
    const { error: resendError } = otpType === "signup"
      ? await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() })
      : await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    if (resendError) setError("We couldn’t resend the code yet. Wait a moment and try again.");
    else { setResendCooldown(60); setOtpAttempts(0); setOtp(""); }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-[#681B1D] flex items-center justify-center font-serif font-bold text-[#B77A36] text-xl shadow-xs">
                E
              </div>
            </Link>
            <h1 className="text-2xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
              Begin Your Journey
            </h1>
            <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Create your personal celebration planning workspace
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Verification Required */}
          {success ? (
            <div className="p-6 rounded-2xl bg-[#EAD2B0] dark:bg-[#681B1D]/40 border border-[#681B1D]/20 dark:border-[#EAD2B0]/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#681B1D] text-[#FFF3E3] flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-[#B77A36]" />
              </div>
              <h2 className="text-base font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
                Verify your email
              </h2>
              <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] leading-relaxed">
                We sent a six-digit code to <strong className="text-[#681B1D] dark:text-[#F4F0E7]">{email}</strong>. Verify it to activate Customer access.
              </p>
              <form onSubmit={verifySignupOtp} className="space-y-3 text-left">
                <label htmlFor="signup-otp" className="block text-xs font-semibold">Email verification code</label>
                <div className="relative w-full" onClick={() => document.getElementById("signup-otp")?.focus()}>
                  <div aria-hidden="true" className="grid grid-cols-6 gap-2 sm:gap-3">
                    {Array.from({ length: 6 }, (_, index) => (
                      <div
                        key={index}
                        className={`flex aspect-square min-w-0 items-center justify-center rounded-xl border bg-[#FFFCF7] text-xl font-semibold text-[#681B1D] shadow-sm transition duration-150 sm:aspect-auto sm:h-14 sm:text-2xl dark:bg-[#241918] ${
                          otpFocused && otpFocusIndex === index
                            ? "border-[#681B1D] ring-2 ring-[#681B1D]/20"
                            : "border-[#D9B995]"
                        }`}
                      >
                        {otp[index] ?? ""}
                      </div>
                    ))}
                  </div>
                  <input
                    id="signup-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    onFocus={(event) => {
                      setOtpFocused(true);
                      setOtpFocusIndex(Math.min(event.currentTarget.selectionStart ?? otp.length, 5));
                    }}
                    onBlur={() => setOtpFocused(false)}
                    onSelect={(event) => setOtpFocusIndex(Math.min(event.currentTarget.selectionStart ?? otp.length, 5))}
                    onKeyUp={(event) => setOtpFocusIndex(Math.min(event.currentTarget.selectionStart ?? otp.length, 5))}
                    className="absolute inset-0 h-full w-full cursor-text rounded-xl text-center text-lg tracking-[0.35em] opacity-0"
                    aria-label="Six-digit email verification code"
                  />
                </div>
                <button disabled={isLoading || otp.length !== 6 || otpAttempts >= 5} className="w-full rounded-xl bg-[#681B1D] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{isLoading ? "Verifying…" : "Verify email"}</button>
              </form>
              <button type="button" disabled={isLoading || resendCooldown > 0} onClick={() => void resendSignupOtp()} className="text-xs font-semibold text-[#681B1D] underline disabled:opacity-50">{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}</button>
              <div className="pt-2">
                <Link
                  href="/signin?portal=customer"
                  className="inline-block px-4 py-2 rounded-xl bg-[#681B1D] text-[#FFF3E3] text-xs font-bold"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-4 rounded-2xl border border-[#EAD2B0] bg-[#FFF3E3] p-5 text-center dark:border-[#4D3331] dark:bg-[#241918]">
              <h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">You already have an Evntora account</h2>
              <p className="text-sm text-[#7D6B63] dark:text-[#D4C3B7]">Signed in as <b>{user.email}</b>. Your existing password and access stay unchanged.</p>
              <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">Your access: {roles.length ? roles.map((role) => role === "platform_owner" ? "Platform Owner" : role === "admin" ? "Admin" : role === "vendor" ? "Vendor" : "Customer").join(" · ") : "Account"}</p>
              <Link href="/workspaces" className="inline-flex rounded-xl bg-[#681B1D] px-5 py-3 text-sm font-semibold text-[#FFF3E3]">Open your workspaces</Link>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aditi Singhania"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aditi@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <PhoneNumberField id="phone" required value={phone} onChange={setPhone}/>
                <p className="mt-1 text-[11px] text-[#7D6B63]">Select your country code, then enter your phone number.</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#30221D] dark:hover:text-[#F4F0E7]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={`w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none transition-colors ${
                      confirmPassword && confirmPassword !== password
                        ? "border-rose-400"
                        : "border-[#EAD2B0] dark:border-[#4D3331] focus:border-[#681B1D] dark:focus:border-[#EAD2B0]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#30221D] dark:hover:text-[#F4F0E7]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-rose-500 text-[11px] mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#681B1D] mt-0.5 cursor-pointer"
                />
                <label htmlFor="terms" className="text-[#7D6B63] dark:text-[#D4C3B7] leading-relaxed cursor-pointer text-xs">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#B77A36]" />
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7] pt-2 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-2">
            {existingAccountDetected && <Link href="/signin?portal=customer" className="block font-semibold text-[#681B1D] underline">Sign in with your existing account</Link>}
            <p>
              Already have an account?{" "}
              <Link href="/signin?portal=customer" className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold">
                Sign in
              </Link>
            </p>
            <p>
              Registering an Vendor business?{" "}
              <Link href="/signup/vendor" className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold">
                Vendor registration →
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
