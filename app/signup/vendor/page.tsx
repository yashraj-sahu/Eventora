"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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
];

export default function VendorSignUpPage() {
  const { user, roles, vendorProfile } = useAuth();
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
  const [address, setAddress] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [existingAccountDetected, setExistingAccountDetected] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpType, setOtpType] = useState<"signup" | "email">("signup");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!user) return;
    if (user.email) setEmail(user.email);
    if (user.user_metadata?.full_name) setContactName(String(user.user_metadata.full_name));
    const registration = user.user_metadata?.vendor_registration;
    if (registration && typeof registration === "object") {
      const values = registration as Record<string, unknown>;
      if (typeof values.business_name === "string") setBusinessName(values.business_name);
      if (typeof values.business_category === "string") setCategory(values.business_category);
      if (typeof values.city === "string") setCity(values.city);
      if (typeof values.business_description === "string") setDescription(values.business_description);
      if (typeof values.address === "string") setAddress(values.address);
      if (typeof values.contact_phone === "string") setPhone(values.contact_phone);
    }
  }, [user]);

  const validate = () => {
    if (!contactName.trim()) return "Please enter your name.";
    if (!businessName.trim()) return "Please enter your business name.";
    if (!user && !email.trim()) return "Please enter your email address.";
    if (!phone.trim()) return "Phone number is required for vendor accounts.";
    if (!user && password.length < 8) return "Password must be at least 8 characters.";
    if (!user && password !== confirmPassword) return "Passwords do not match.";
    if (!category.trim()) return "Please enter a business category.";
    if (!city.trim()) return "Please enter your city.";
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
      const submitApplication = async () => {
        const response = await fetch("/api/vendors/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: businessName.trim(),
            category: category.trim(),
            city: city.trim(),
            description: description.trim(),
            address: address.trim(),
            phone: phone.trim(),
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Your business application could not be saved. Please try again.");
        window.location.assign(result.vendorProfile?.approval_status === "approved" ? "/vendor-portal" : "/vendor-portal/pending");
      };

      if (user) {
        // A previously authenticated Customer/Admin must prove control of the
        // same email before adding the vendor application. This never grants
        // Vendor membership; approval remains an independent admin decision.
        const { error: otpError } = await supabase.auth.signInWithOtp({ email: user.email ?? email.trim().toLowerCase(), options: { shouldCreateUser: false } });
        if (otpError) throw new Error("A verification code could not be sent. Please try again later.");
        setOtpType("email"); setAwaitingEmailVerification(true); setSuccess(true); setOtp(""); setOtpAttempts(0); setResendCooldown(60);
        return;
      }
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
              business_category: category.trim(),
              city: city.trim(),
              business_description: description.trim(),
              address: address.trim(),
              contact_phone: phone.trim(),
              contact_email: email.trim().toLowerCase(),
            },
          },
        },
      });

      if (signUpError) {
        if (/already registered|already exists/i.test(signUpError.message)) {
          setError("An account with this email already exists. Please sign in.");
        } else {
          setError("We couldn’t create your vendor account right now. Please try again.");
        }
        return;
      }

      if (!data.user) {
        setError("We couldn’t confirm the account was created. If you already have an account, sign in before submitting a vendor application.");
        return;
      }

      // Supabase intentionally returns an empty identities list for an existing
      // email when email enumeration protection is enabled. Do not present that
      // existing customer with a new-password or verification flow.
      if (!data.session && data.user.identities?.length === 0) {
        setExistingAccountDetected(true);
        setError("This email already has an Evntora account. Sign in to submit your vendor application; your existing password and verified email will be reused.");
        return;
      }

      if (data.session) {
        await supabase.auth.signOut();
        const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
        if (otpError) { setError("Email code verification is required, but a code could not be sent. Contact support before continuing."); return; }
        setOtpType("email");
      } else setOtpType("signup");
      setAwaitingEmailVerification(true); setSuccess(true); setOtp(""); setOtpAttempts(0); setResendCooldown(60);
    } catch (err: unknown) {
      console.error("Vendor sign-up exception:", err);
      setError("An unexpected error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyVendorOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otpAttempts >= 5 || isLoading) return;
    setIsLoading(true); setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: otpType });
    if (verifyError || !data.user || !data.session) {
      setOtpAttempts((value) => value + 1);
      setError(otpAttempts >= 4 ? "Too many incorrect codes. Request a new code and try again." : "That code is invalid or expired. Check the email and try again.");
      setIsLoading(false); return;
    }
    try {
      const response = await fetch("/api/vendors/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName: businessName.trim(), category: category.trim(), city: city.trim(), description: description.trim(), address: address.trim(), phone: phone.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The vendor application could not be saved.");
      window.location.assign(result.vendorProfile?.approval_status === "approved" ? "/vendor-portal" : "/vendor-portal/pending");
    } catch {
      setError("Your email is verified, but the vendor application could not be saved. Sign in and submit it again; your account is preserved.");
      setIsLoading(false);
    }
  };

  const resendVendorOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true); setError(null);
    const { error: resendError } = otpType === "signup"
      ? await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() })
      : await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    if (resendError) setError("We couldn’t resend the code yet. Wait a moment and try again.");
    else { setResendCooldown(60); setOtpAttempts(0); setOtp(""); }
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] transition-colors duration-200">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#EAD2B0] dark:bg-[#681B1D]/40 border border-[#681B1D]/20 dark:border-[#EAD2B0]/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-[#681B1D] dark:text-[#EAD2B0]" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
                {awaitingEmailVerification ? "Verify your email" : "Application Submitted"}
              </h2>
              <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] mt-2">
                Thank you, <span className="text-[#681B1D] dark:text-[#EAD2B0] font-semibold">{contactName}</span>.
                {awaitingEmailVerification ? "Enter the six-digit code we sent to verify this email before submitting your vendor application for " : "We&apos;ve received your Vendor partner application for "}{" "}
                <span className="text-[#30221D] dark:text-[#F4F0E7] font-semibold">{businessName}</span>.
              </p>
            </div>
            {awaitingEmailVerification && <><form onSubmit={verifyVendorOtp} className="space-y-3 text-left"><label htmlFor="vendor-signup-otp" className="block text-xs font-semibold">Email verification code</label><input id="vendor-signup-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-4 py-3 text-center text-lg tracking-[0.35em]" aria-label="Six-digit email verification code"/><button disabled={isLoading || otp.length !== 6 || otpAttempts >= 5} className="w-full rounded-xl bg-[#681B1D] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{isLoading ? "Verifying…" : "Verify and submit application"}</button></form><button type="button" disabled={isLoading || resendCooldown > 0} onClick={() => void resendVendorOtp()} className="text-xs font-semibold text-[#681B1D] underline disabled:opacity-50">{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}</button></>}
            <div className="p-4 rounded-2xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-left space-y-2">
              <p className="text-xs font-bold text-[#681B1D] dark:text-[#EAD2B0] uppercase tracking-wider">
                What happens next?
              </p>
              <ol className="text-xs text-[#7D6B63] dark:text-[#D4C3B7] space-y-1.5 list-decimal list-inside">
                <li>Verify the six-digit code sent to {email}.</li>
                <li>After your application is saved, our verification team reviews it.</li>
                <li>You&apos;ll receive an approval notification once verified.</li>
                <li>After approval, access your full partner operations hub.</li>
              </ol>
            </div>
            <Link
              href="/signin?portal=vendor"
              className="block w-full py-3 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
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
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl bg-[#FFFCF6] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#681B1D] flex items-center justify-center mx-auto shadow-xs">
              <Store className="w-5 h-5 text-[#B77A36]" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#681B1D] dark:text-[#F4F0E7]">
              Vendor Partner Registration
            </h1>
            <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Join India&apos;s verified event planning ecosystem as a premier vendor partner
            </p>
          </div>

          {/* Pending approval notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EAD2B0] dark:bg-[#681B1D]/40 border border-[#681B1D]/20 dark:border-[#EAD2B0]/30 text-xs text-[#681B1D] dark:text-[#EAD2B0]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              All vendor accounts are vetted for quality, reviews, and legal registration. You&apos;ll be
              contacted by our desk within 2–3 business days.
            </span>
          </div>

          {user && <div className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-3 text-xs text-[#30221D] dark:border-[#4D3331] dark:bg-[#241918]">
            <p>Signed in as <b>{user.email}</b>. Your existing password is preserved. A six-digit email code verifies this vendor application.</p>
            <p className="mt-1">Existing access: {roles.length ? roles.map((role) => role === "platform_owner" ? "Platform Owner" : role === "admin" ? "Admin" : role === "vendor" ? "Vendor" : "Customer").join(" · ") : "Evntora account"}.</p>
            {vendorProfile && <p className="mt-1 font-semibold">Vendor application status: {vendorProfile.approval_status}. {vendorProfile.approval_status === "pending" ? "It is waiting for administrator approval." : vendorProfile.approval_status === "approved" ? "Your vendor access is already approved." : "Contact the Evntora team for next steps."}</p>}
          </div>}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
              {existingAccountDetected && <Link className="ml-1 font-semibold underline" href={`/signin?redirectTo=${encodeURIComponent("/signup/vendor")}`}>Sign in</Link>}
            </div>
          )}

          <form onSubmit={handleVendorSignUp} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {/* Contact Name */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="contactName" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Your Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="contactName"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Rajiv Sharma"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                  />
                </div>
              </div>

              {/* Business Name */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="businessName" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="businessName"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="The Oberoi Udaivilas"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                Business Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  readOnly={Boolean(user)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@udaivilas.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                Business Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#7D6B63] dark:text-[#D4C3B7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 294 243 3300"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  Category <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect id="vendor-category" label="Business category" labelClassName="sr-only" value={category} options={VENDOR_CATEGORIES.map((value) => ({ value, label: value }))} onChange={setCategory} allowCustom customLabel="Use category" placeholder="Select or enter category" />
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                  City <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <SearchableSelect id="vendor-city" label="Business city" labelClassName="sr-only" value={city} options={CITIES.map((value) => ({ value, label: value }))} onChange={setCity} allowCustom customLabel="Use city" placeholder="Select or enter city" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">Business address <span className="text-[#7D6B63]/60 font-normal">(optional)</span></label>
              <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, area, region" className="w-full px-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331]" />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
                Business Description{" "}
                <span className="text-[#7D6B63]/60 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your property, services, heritage specialty, and past celebrations..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Account credentials are only needed when registering a new account. */}
            {!user && <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
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
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none focus:border-[#681B1D] dark:focus:border-[#EAD2B0] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D6B63] dark:text-[#D4C3B7] hover:text-[#30221D]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1.5 font-medium">
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
                    className={`w-full px-3 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#241918] border text-[#30221D] dark:text-[#F4F0E7] placeholder-[#7D6B63]/60 focus:outline-none transition-colors ${
                      confirmPassword && confirmPassword !== password
                        ? "border-rose-400"
                        : "border-[#EAD2B0] dark:border-[#4D3331] focus:border-[#681B1D] dark:focus:border-[#EAD2B0]"
                    }`}
                  />
                </div>
              </div>
            </div>}

            {/* Terms */}
            <div className="flex items-start gap-2.5">
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
                  Vendor Partner Agreement
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
                <span>Submitting application...</span>
              ) : (
                <>
                  <Store className="w-3.5 h-3.5 text-[#B77A36]" />
                  <span>Submit Vendor Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7] pt-2 border-t border-[#EAD2B0] dark:border-[#4D3331]">
            <p>
              Already have an account?{" "}
              <Link href="/signin?portal=vendor" className="text-[#681B1D] dark:text-[#EAD2B0] hover:underline font-semibold">
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
