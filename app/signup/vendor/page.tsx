"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import {
  Store,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  FileText,
} from "lucide-react";

const VENDOR_CATEGORIES = [
  "Venues",
  "Photographers",
  "Caterers",
  "Decorators",
  "Makeup artists",
  "DJs",
  "Event planners",
  "Florists",
  "Entertainment providers",
];

const CITIES = [
  "Udaipur",
  "Jaipur",
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Goa",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Chandigarh",
  "Lucknow",
  "Other",
];

export default function VendorSignUpPage() {
  const [contactName, setContactName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!contactName.trim()) return "Please enter your name.";
    if (!businessName.trim()) return "Please enter your business name.";
    if (!email.trim()) return "Please enter your email address.";
    if (!phone.trim()) return "Phone number is required for vendor accounts.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!category) return "Please select a business category.";
    if (!city) return "Please select your city.";
    if (!agreedToTerms) return "Please accept the Terms & Privacy Policy.";
    return null;
  };

  const handleVendorSignUp = async (e: React.FormEvent) => {
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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/vendor-portal/pending`,
          data: {
            full_name: contactName.trim(),
            role: "vendor",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("An account with this email already exists. Please sign in.");
        } else {
          setError(signUpError.message || "Failed to create vendor account. Please try again.");
        }
        return;
      }

      const userId = data.user?.id;

      if (userId) {
        // 2. Create profile row
        try {
          await supabase.from("profiles").upsert({
            id: userId,
            full_name: contactName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            role: "vendor",
          });
        } catch (profileErr) {
          console.warn("Profile table upsert warning:", profileErr);
        }

        // 3. Create vendor_profile row with pending approval
        try {
          await supabase.from("vendor_profiles").insert({
            user_id: userId,
            business_name: businessName.trim(),
            business_category: category,
            city,
            business_description: description.trim() || null,
            contact_phone: phone.trim(),
            approval_status: "pending",
          });
        } catch (vpErr) {
          console.warn("Vendor profile insertion warning:", vpErr);
        }
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error("Vendor sign-up exception:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-md p-10 rounded-3xl bg-[#0d0f18]/90 border border-amber-500/20 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-white">Application Submitted</h2>
              <p className="text-sm text-slate-400 mt-2">
                Thank you, <span className="text-amber-400 font-semibold">{contactName}</span>.
                We&apos;ve received your vendor application for{" "}
                <span className="text-white font-semibold">{businessName}</span>.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">What happens next?</p>
              <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
                <li>Check your email ({email}) and verify your account.</li>
                <li>Our team will review your application within 2–3 business days.</li>
                <li>You&apos;ll receive an approval email once verified.</li>
                <li>After approval, access your partner dashboard.</li>
              </ol>
            </div>
            <Link
              href="/signin"
              className="block w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm text-center"
            >
              Back to Sign In
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl bg-[#0d0f18]/90 border border-amber-500/20 shadow-2xl backdrop-blur-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Store className="w-5 h-5 text-slate-950" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-white">Vendor Registration</h1>
            <p className="text-xs text-slate-400">
              Join India&apos;s premier event planning marketplace as an artisan partner
            </p>
          </div>

          {/* Pending approval notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              All vendor accounts are reviewed by our team before approval. You&apos;ll be
              notified within 2–3 business days.
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVendorSignUp} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {/* Contact Name */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="contactName" className="block text-slate-400 mb-1.5">
                  Your Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="contactName"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Rajiv Sharma"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Business Name */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="businessName" className="block text-slate-400 mb-1.5">
                  Business Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="businessName"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Lakshmi Decors"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-slate-400 mb-1.5">
                Business Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@yourbusiness.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-slate-400 mb-1.5">
                Business Phone <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-slate-400 mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  id="category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 transition-colors appearance-none"
                >
                  <option value="" className="text-slate-600">Select...</option>
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-950">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="block text-slate-400 mb-1.5">
                  City <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 transition-colors appearance-none"
                  >
                    <option value="" className="text-slate-600">Select...</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-950">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-slate-400 mb-1.5">
                Business Description{" "}
                <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your business, specialties, and experience..."
                  rows={3}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-slate-400 mb-1.5">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-slate-400 mb-1.5">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-600 focus:outline-none transition-colors ${
                      confirmPassword && confirmPassword !== password
                        ? "border-rose-500/50"
                        : "border-slate-800 focus:border-amber-400"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 mt-0.5 cursor-pointer"
              />
              <label htmlFor="terms" className="text-slate-400 leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" className="text-amber-400 hover:underline">
                  Vendor Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-amber-400 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span>Submitting application...</span>
              ) : (
                <>
                  <Store className="w-3.5 h-3.5" />
                  <span>Submit Vendor Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
            <p>
              Already have an account?{" "}
              <Link href="/signin" className="text-amber-400 hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

