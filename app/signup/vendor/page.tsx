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
  const [customCategory, setCustomCategory] = useState("");
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
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
    if (!(category === "Other" ? customCategory.trim() : category)) return "Please enter a business category.";
    if (!(city === "Other" ? customCity.trim() : city)) return "Please enter your city.";
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
            vendor_registration: {
              business_name: businessName.trim(),
              business_category: (category === "Other" ? customCategory : category).trim(),
              city: (city === "Other" ? customCity : city).trim(),
              business_description: description.trim(),
              address: address.trim(),
              contact_phone: phone.trim(),
              contact_email: email.trim().toLowerCase(),
            },
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

      if (userId && data.session) {
        const { error: registrationError } = await supabase.from("vendor_profiles").insert({
          user_id: userId,
          business_name: businessName.trim(),
          business_category: (category === "Other" ? customCategory : category).trim(),
          city: (city === "Other" ? customCity : city).trim(),
          business_description: description.trim() || null,
          address: address.trim() || null,
          contact_phone: phone.trim(),
          contact_email: email.trim().toLowerCase(),
          approval_status: "pending",
        });
        if (registrationError) throw registrationError;
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
      <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#E7EFEA] dark:bg-[#173F35]/40 border border-[#173F35]/20 dark:border-[#A9C7B2]/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-[#173F35] dark:text-[#A9C7B2]" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
                Application Submitted
              </h2>
              <p className="text-xs text-[#77746D] dark:text-[#B5B5AA] mt-2">
                Thank you, <span className="text-[#173F35] dark:text-[#A9C7B2] font-semibold">{contactName}</span>.
                We&apos;ve received your artisan partner application for{" "}
                <span className="text-[#252522] dark:text-[#F4F0E7] font-semibold">{businessName}</span>.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-left space-y-2">
              <p className="text-xs font-bold text-[#173F35] dark:text-[#A9C7B2] uppercase tracking-wider">
                What happens next?
              </p>
              <ol className="text-xs text-[#77746D] dark:text-[#B5B5AA] space-y-1.5 list-decimal list-inside">
                <li>Check your email ({email}) and verify your account.</li>
                <li>Our verification team reviews your portfolio and GST credentials.</li>
                <li>You&apos;ll receive an approval notification once verified.</li>
                <li>After approval, access your full partner operations hub.</li>
              </ol>
            </div>
            <Link
              href="/signin"
              className="block w-full py-3 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
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
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#173F35] flex items-center justify-center mx-auto shadow-xs">
              <Store className="w-5 h-5 text-[#C6A66B]" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">
              Artisan Partner Registration
            </h1>
            <p className="text-xs text-[#77746D] dark:text-[#B5B5AA]">
              Join India&apos;s verified event planning ecosystem as a premier vendor partner
            </p>
          </div>

          {/* Pending approval notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#E7EFEA] dark:bg-[#173F35]/40 border border-[#173F35]/20 dark:border-[#A9C7B2]/30 text-xs text-[#173F35] dark:text-[#A9C7B2]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              All vendor accounts are vetted for quality, reviews, and legal registration. You&apos;ll be
              contacted by our desk within 2–3 business days.
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVendorSignUp} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {/* Contact Name */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="contactName" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Your Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="contactName"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Rajiv Sharma"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  />
                </div>
              </div>

              {/* Business Name */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="businessName" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="businessName"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="The Oberoi Udaivilas"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                Business Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@udaivilas.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                Business Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#77746D] dark:text-[#B5B5AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 294 243 3300"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                >
                  <option value="">Select category...</option>
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-white dark:bg-[#1C2520]">
                      {c}
                    </option>
                  ))}
                </select>
                {category === "Other" && <input required value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter category" className="mt-2 w-full py-2.5 px-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139]" />}
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  City <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  >
                    <option value="">Select city...</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c} className="bg-white dark:bg-[#1C2520]">
                        {c}
                      </option>
                    ))}
                  </select>
                  {city === "Other" && <input required value={customCity} onChange={(e) => setCustomCity(e.target.value)} placeholder="Enter city or region" className="mt-2 w-full py-2.5 px-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139]" />}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">Business address <span className="text-[#77746D]/60 font-normal">(optional)</span></label>
              <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, area, region" className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139]" />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                Business Description{" "}
                <span className="text-[#77746D]/60 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your property, services, heritage specialty, and past celebrations..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77746D] dark:text-[#B5B5AA] hover:text-[#252522]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-medium">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    className={`w-full px-3 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D]/60 focus:outline-none transition-colors ${
                      confirmPassword && confirmPassword !== password
                        ? "border-rose-400"
                        : "border-[#E8E2D7] dark:border-[#344139] focus:border-[#173F35] dark:focus:border-[#A9C7B2]"
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
                className="w-4 h-4 rounded accent-[#173F35] mt-0.5 cursor-pointer"
              />
              <label htmlFor="terms" className="text-[#77746D] dark:text-[#B5B5AA] leading-relaxed cursor-pointer text-xs">
                I agree to the{" "}
                <Link href="/terms" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
                  Artisan Partner Agreement
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
                <span>Submitting application...</span>
              ) : (
                <>
                  <Store className="w-3.5 h-3.5 text-[#C6A66B]" />
                  <span>Submit Artisan Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-[#77746D] dark:text-[#B5B5AA] pt-2 border-t border-[#E8E2D7] dark:border-[#344139]">
            <p>
              Already have an account?{" "}
              <Link href="/signin" className="text-[#173F35] dark:text-[#A9C7B2] hover:underline font-semibold">
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
