"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useMarketplaceVendors } from "@/lib/use-marketplace";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/utils";
import {
  Star,
  MapPin,
  ShieldCheck,
  Bookmark,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  ArrowLeft,
  Sparkles,
  Lock,
} from "lucide-react";
import { BookingModal } from "@/components/booking/BookingModal";

export function VendorProfile({ params, embedded = false }: { params: Promise<{ id: string }>; embedded?: boolean }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? undefined;
  const requestedReturnTo = searchParams.get("returnTo");
  const { vendors, savedIds, loading, error, toggleSaved } = useMarketplaceVendors();
  const vendor = vendors.find((v) => v.id === resolvedParams.id);
  const { profile: signedInProfile, roles } = useAuth();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState<string | undefined>(undefined);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<string | undefined>(undefined);
  const [claimMessage, setClaimMessage] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [confirmClaim, setConfirmClaim] = useState(false);
  const [reviewReportMessage, setReviewReportMessage] = useState("");

  if (loading) return <main className="min-h-screen grid place-items-center">Loading vendor…</main>;
  if (error) return <main className="min-h-screen grid place-items-center">Unable to load this vendor right now.</main>;
  if (!vendor) return notFound();

  const isSaved = savedIds.includes(vendor.id);
  const claimListing = async () => {
    setClaiming(true); setClaimMessage("");
    const response = await fetch("/api/vendors/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId: vendor.id, confirmRoleChange: true }) });
    if (response.status === 401) { window.location.assign(`/signin?redirectTo=${encodeURIComponent(`/vendors/${vendor.id}`)}`); return; }
    if (response.ok) { window.location.assign("/vendor-portal"); return; }
    setClaimMessage("This listing can only be claimed by an account with its verified business contact email.");
    setClaiming(false);
  };
  const reportReview = async (reviewId: string) => {
    if (!signedInProfile) { window.location.assign(`/signin?redirectTo=${encodeURIComponent(`/vendors/${vendor.id}`)}`); return; }
    const reason = window.prompt("Why are you reporting this review?")?.trim();
    if (!reason) return;
    setReviewReportMessage("");
    const response = await fetch("/api/support/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseType: "review_report", reviewId, subject: "Reported vendor review", description: reason }) });
    const data = await response.json().catch(() => ({}));
    setReviewReportMessage(response.ok ? "Review report submitted for administrator review." : data.error || "The report could not be submitted.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] transition-colors duration-200">
      {!embedded && <Navbar />}

      <main className="flex-1 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10">
        {/* Back Link */}
        <Link
          href={eventId ? `${embedded ? "/dashboard/vendors" : "/vendors"}?eventId=${encodeURIComponent(eventId)}&returnTo=${encodeURIComponent(requestedReturnTo?.startsWith("/dashboard") ? requestedReturnTo : embedded ? "/dashboard/vendors" : "/dashboard/events/" + eventId)}` : embedded ? "/dashboard/vendors" : "/vendors?returnTo=%2Fdashboard"}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#30221D]/70 dark:text-[#FFF3E3]/70 hover:text-[#681B1D] dark:hover:text-[#EAD2B0] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Vendors</span>
        </Link>
        {roles.includes("customer") && <Link href={eventId ? `/dashboard/events/${encodeURIComponent(eventId)}` : requestedReturnTo?.startsWith("/dashboard") ? requestedReturnTo : "/dashboard"} className="-mt-8 inline-flex items-center gap-2 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:underline"><ArrowLeft className="w-3.5 h-3.5"/>Return to {eventId ? "event workspace" : "Customer Dashboard"}</Link>}
        {vendor.claimable && signedInProfile?.role !== "admin" && <div className="flex flex-col items-start gap-2"><button disabled={claiming} onClick={() => setConfirmClaim(true)} className="rounded-xl border border-[#681B1D] dark:border-[#EAD2B0] px-4 py-2 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0] hover:bg-[#681B1D]/10 disabled:opacity-50 transition-colors">Claim this business</button>{confirmClaim && <div className="max-w-xl rounded-2xl border border-amber-300 bg-amber-50 dark:bg-[#2A1810] dark:border-amber-600/40 p-4 text-sm text-[#30221D] dark:text-[#FFF3E3]"><p>Claiming associates this listing with your account after we verify that your confirmed email matches the business contact email. Customer access stays available. Continue only if this email belongs to the business.</p><div className="mt-3 flex gap-2"><button disabled={claiming} onClick={() => void claimListing()} className="rounded-lg bg-[#681B1D] hover:bg-[#4B1117] px-3 py-2 text-xs font-semibold text-white transition-colors">{claiming ? "Verifying ownership…" : "Confirm verified claim"}</button><button disabled={claiming} onClick={() => setConfirmClaim(false)} className="rounded-lg border border-[#EAD2B0] dark:border-[#4D3331] px-3 py-2 text-xs">Cancel</button></div></div>}{claimMessage && <span role="status" className="text-xs text-[#B77A36]">{claimMessage}</span>}</div>}

        {/* Hero Visual Header */}
        <div className="relative rounded-3xl overflow-hidden bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] h-80 sm:h-96 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {vendor.coverImage ? <img
            src={vendor.coverImage}
            alt={vendor.name}
            className="w-full h-full object-cover"
          /> : <div className="h-full w-full bg-[#EAD2B0]/20 dark:bg-[#2A1810]" aria-label="No portfolio image available" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>

          <div className="absolute top-6 left-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFF3E3]/95 dark:bg-[#1A1211]/95 backdrop-blur-md text-[#681B1D] dark:text-[#EAD2B0] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xs">
              {vendor.category}
            </span>
            {vendor.isVerified && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#681B1D]/20 backdrop-blur-md text-[#FFF3E3] border border-[#B77A36]/40 flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#EAD2B0]" />
                Verified Partner
              </span>
            )}
          </div>

          <button
            onClick={() => void toggleSaved(vendor.id)}
            className={`absolute top-6 right-6 p-3 rounded-2xl backdrop-blur-md transition-all cursor-pointer ${
              isSaved
                ? "bg-[#681B1D] text-[#FFF3E3] font-bold shadow-md"
                : "bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#FFFCF6] dark:hover:bg-[#1A1211]"
            }`}
          >
            <Bookmark className="w-5 h-5 fill-current" />
          </button>

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white">
                {vendor.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#EAD2B0]" />
                  {vendor.address}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-[#EAD2B0]">
                  <Star className="w-4 h-4 fill-[#B77A36] text-[#B77A36]" />
                  {vendor.rating !== null ? `${vendor.rating}${vendor.reviewCount !== null ? ` (${vendor.reviewCount} Reviews)` : ""}` : "No reviews yet"}
                </span>
                <span>•</span>
                {vendor.pastEventsCount > 0 && <span>{vendor.pastEventsCount} Celebrations Completed</span>}
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
              <span className="text-[10px] uppercase text-white/80 block font-bold">
                Starting Rate
              </span>
              <span className="text-xl font-serif font-bold text-white">
                {vendor.startingPrice === null ? "Contact for pricing" : formatINR(vendor.startingPrice)}{" "}
                {vendor.startingPrice !== null && <span className="text-xs text-white/70 font-sans font-normal">/{vendor.priceUnit}</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-8 space-y-8">
            {/* Overview */}
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-4">
              <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">About the Vendor</h2>
              <p className="text-[#30221D] dark:text-[#FFF3E3] text-sm leading-relaxed whitespace-pre-line">
                {vendor.description}
              </p>
              {!!vendor.serviceAreas?.length && <p className="text-xs text-[#7D6B63] dark:text-[#D4C3B7]">Service areas: {vendor.serviceAreas.map((area) => `${area.city}${area.region ? `, ${area.region}` : ""}`).join(" · ")}</p>}
            </div>

            {!!vendor.listings?.length && <div className="space-y-4 rounded-3xl border border-[#EAD2B0] bg-[#FFFDF9] p-8 shadow-sm dark:border-[#4D3331] dark:bg-[#231715]"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#FFF3E3]">Services and listings</h2><div className="grid gap-3 sm:grid-cols-2">{vendor.listings.map((listing) => <article key={listing.id} className="rounded-2xl border border-[#EAD2B0] p-4 dark:border-[#4D3331]"><span className="text-[10px] font-bold uppercase tracking-wider text-[#B77A36]">{listing.category}{listing.subcategory ? ` · ${listing.subcategory}` : ""}</span><h3 className="mt-1 font-serif text-lg font-bold">{listing.name}</h3><p className="mt-2 text-sm text-[#7D6B63]">{listing.description}</p><div className="mt-3 flex flex-wrap gap-3 text-xs"><span className="font-semibold capitalize">{listing.pricing_model.replaceAll("_", " ")}{listing.starting_price !== null ? ` · ${formatINR(listing.starting_price / 100)} / ${(listing.pricing_unit || "per_event").replaceAll("_", " ")}` : " · price by quotation"}</span>{listing.minimum_quantity !== null && <span>Minimum: {listing.minimum_quantity}</span>}{listing.capacity && <span>Capacity: {listing.capacity}</span>}{listing.duration_minutes && <span>{listing.duration_minutes} min</span>}</div>{typeof listing.pricing_details?.vendorNotes === "string" && listing.pricing_details.vendorNotes && <p className="mt-2 text-xs text-[#7D6B63]">{listing.pricing_details.vendorNotes}</p>}{listing.inclusions?.length > 0 && <p className="mt-2 text-xs"><b>Includes:</b> {listing.inclusions.join(", ")}</p>}{listing.exclusions?.length > 0 && <p className="mt-1 text-xs"><b>Excludes:</b> {listing.exclusions.join(", ")}</p>}{listing.terms && <p className="mt-2 text-xs"><b>Terms:</b> {listing.terms}</p>}{!!listing.addons?.length && <div className="mt-3 border-t border-[#EAD2B0] pt-3 dark:border-[#4D3331]"><p className="text-xs font-semibold">Optional add-ons</p><ul className="mt-2 space-y-1 text-xs text-[#7D6B63]">{listing.addons.map((addon) => <li key={addon.id}>{addon.name} · {formatINR(addon.price / 100)}{addon.description ? ` — ${addon.description}` : ""}</li>)}</ul><p className="mt-2 text-[10px] text-[#7D6B63]">Final selection and terms are confirmed through the booking quotation.</p></div>}{listing.vendor_service_id && <button onClick={() => { setSelectedServiceForModal(listing.vendor_service_id || undefined); setSelectedPackageForModal(undefined); setBookingModalOpen(true); }} className="mt-4 rounded-xl bg-[#681B1D] px-4 py-2 text-xs font-bold text-white">Request this service</button>}</article>)}</div></div>}

            {/* Gallery Images */}
            {vendor.galleryImages.length > 0 && (
              <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-4">
                <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Portfolio Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vendor.galleryImages.map((img, idx) => (
                    <div key={idx} className="h-56 rounded-2xl overflow-hidden border border-[#EAD2B0] dark:border-[#4D3331]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="Portfolio showcase" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!!vendor.reviews?.length && <div className="space-y-4 rounded-3xl border border-[#EAD2B0] bg-[#FFFDF9] p-8 shadow-sm dark:border-[#4D3331] dark:bg-[#231715]"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#FFF3E3]">Customer reviews</h2>{reviewReportMessage && <p role="status" className="text-sm text-[#715D54]">{reviewReportMessage}</p>}{vendor.reviews.map((review) => <article key={review.id} className="border-b border-[#EAD2B0] pb-4 last:border-0 dark:border-[#4D3331]"><p className="font-semibold text-[#B77A36]">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</p><p className="mt-1 text-sm">{review.review_text}</p>{review.vendor_response && <p className="mt-3 rounded-xl bg-[#FFF3E3] p-3 text-sm dark:bg-[#1A1211]"><b>Vendor response</b><span className="mt-1 block">{review.vendor_response}</span></p>}<button type="button" onClick={() => void reportReview(review.id)} className="mt-2 text-xs text-[#806D63] underline">Report review</button></article>)}</div>}

            {/* Services Offered */}
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-4">
              <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Signature Services Included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vendor.services.map((svc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] flex items-center gap-2.5 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                    <CheckCircle2 className="w-4 h-4 text-[#B77A36] dark:text-[#EAD2B0] shrink-0" />
                    <span>{svc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Packages */}
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-6">
              <h2 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Curated Packages</h2>
              <div className="space-y-4">
                {vendor.packages.map((pkg, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAD2B0] dark:border-[#4D3331] pb-3">
                      <h3 className="text-base font-bold text-[#30221D] dark:text-[#FFF3E3]">{pkg.name}</h3>
                      <span className="text-lg font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                        {formatINR(pkg.price)}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-[#30221D]/80 dark:text-[#FFF3E3]/80">
                      {pkg.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#B77A36]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-3 border-t border-[#EAD2B0] dark:border-[#4D3331] flex items-center justify-between">
                      <span className="text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70">25% advance lock available</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackageForModal(pkg.name);
                          setSelectedServiceForModal(undefined);
                          setBookingModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#EAD2B0]" />
                        <span>Book Package</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Enquiry Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl space-y-6">
              {/* Direct Booking Card */}
              <div className="p-5 rounded-2xl bg-[#681B1D]/10 dark:bg-[#681B1D]/30 border border-[#B77A36]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#681B1D] dark:text-[#EAD2B0]">
                    Verified Booking
                  </span>
                  <span className="text-[11px] font-bold text-[#681B1D] dark:text-[#EAD2B0]">
                    25% Advance Lock
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackageForModal(undefined);
                    setSelectedServiceForModal(undefined);
                    setBookingModalOpen(true);
                  }}
                  className="w-full py-3 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#EAD2B0]" />
                  <span>Book This Vendor Now</span>
                </button>
                <div className="text-[10px] text-center text-[#30221D]/70 dark:text-[#FFF3E3]/70 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-[#B77A36]" />
                  <span>Secure Razorpay Escrow Guarantee</span>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#EAD2B0] dark:border-[#4D3331]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#30221D]/60 dark:text-[#FFF3E3]/60">Contact the vendor</span>
                <div className="flex-grow border-t border-[#EAD2B0] dark:border-[#4D3331]"></div>
              </div>

              <div className="space-y-2 text-xs text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                <p>Contact {vendor.name} directly for availability and custom requirements, or create a booking request using the secure booking flow above.</p>
                <div className="pt-2 border-t border-[#EAD2B0] dark:border-[#4D3331] space-y-1.5 text-[11px] text-[#30221D]/70 dark:text-[#FFF3E3]/70">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#B77A36]" />
                  <span>{vendor.contactPhone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#B77A36]" />
                  <span>{vendor.contactEmail}</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        vendor={vendor}
        initialPackageName={selectedPackageForModal}
        initialServiceId={selectedServiceForModal}
        eventId={eventId}
        workspacePath={embedded ? "/dashboard/vendors" : "/vendors"}
      />

      {!embedded && <Footer />}
    </div>
  );
}
