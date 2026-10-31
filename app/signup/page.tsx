"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
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

  const validate = () => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!email.trim()) return "Please enter your email address.";
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
      // 1. Create Supabase Auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: {
            full_name: fullName.trim(),
            role: "customer",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("An account with this email already exists. Please sign in.");
        } else {
          setError(signUpError.message || "Failed to create account. Please try again.");
        }
        return;
      }

      const userId = data.user?.id;

      // 2. Insert into public.profiles
      if (userId) {
        try {
          await supabase.from("profiles").upsert(
            {
              id: userId,
              email: email.trim(),
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              role: "customer",
            },
            { onConflict: "id" }
          );
        } catch (profileErr) {
          console.warn("Profile table upsert non-critical warning:", profileErr);
        }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSuccess(true);
      } else if (data.session) {
        // Immediate session established
        window.location.assign("/dashboard");
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during account registration."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-[#173F35] flex items-center justify-center font-serif font-bold text-[#C6A66B] text-xl shadow-xs">
                E
              </div>
            </Link>
            <h1 className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Begin Your Journey
            </h1>
            <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
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
            <div className="p-6 rounded-2xl bg-[#E7EFEA] dark:bg-[#173F35]/40 border border-[#173F35]/20 dark:border-[#A9C7B2]/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#173F35] text-[#FAF8F3] flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-[#C6A66B]" />
              </div>
              <h2 className="text-base font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                Check Your Inbox
              </h2>
              <p className="text-xs text-[#77746D] dark:text-[#B5B5AA] leading-relaxed">
                We have sent an activation link to <strong className="text-[#173F35] dark:text-[#F4F0E7]">{email}</strong>.
                Please verify your email address to access your workspace.
              </p>
              <div className="pt-2">
                <Link
                  href="/signin"
                  className="inline-block px-4 py-2 rounded-xl bg-[#173F35] text-[#FAF8F3] text-xs font-bold"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aditi Singhania"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aditi@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  />
                </div>
              </div>

              {/* Phone (optional) */}
              <div>
                <label htmlFor="phone" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Phone Number{" "}
                  <span className="text-[#77746D]/60 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77746D] dark:text-[#B5B5AA] hover:text-[#252522] dark:hover:text-[#F4F0E7]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={`w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none transition-colors ${
                      confirmPassword && confirmPassword !== password
                        ? "border-rose-400"
                        : "border-[#E8E2D7] dark:border-[#344139] focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77746D] dark:text-[#B5B5AA] hover:text-[#252522] dark:hover:text-[#F4F0E7]"
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
                  className="w-4 h-4 rounded accent-[#173F35] mt-0.5 cursor-pointer"
                />
                <label htmlFor="terms" className="text-[#77746D] dark:text-[#B5B5AA] leading-relaxed cursor-pointer text-xs">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-[#77746D] dark:text-[#B5B5AA] pt-2 border-t border-[#E8E2D7] dark:border-[#344139] space-y-2">
            <p>
              Already have an account?{" "}
              <Link href="/signin" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
                Sign in
              </Link>
            </p>
            <p>
              Registering an artisan business?{" "}
              <Link href="/signup/vendor" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
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
