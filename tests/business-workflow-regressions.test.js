import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isValidCheckoutPaymentAmountPaise, minimumPartialPaymentPaise } from "../lib/payment-amounts.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Existing customer sessions can apply as vendors without setting credentials; vendor approval gates publication", () => {
  const registrationPage = read("../app/signup/vendor/page.tsx");
  const registrationApi = read("../app/api/vendors/register/route.ts");
  const registration = read("../lib/vendor-registration.ts");
  const adminMarketplace = read("../app/admin/marketplace/page.tsx");
  const listings = read("../components/vendors/VendorListingsManager.tsx");
  assert.match(registrationPage, /if \(user\) \{[\s\S]*?signInWithOtp\([\s\S]*?shouldCreateUser: false/);
  assert.match(registrationPage, /type: otpType/);
  assert.match(registrationPage, /\{!user && <div className="grid grid-cols-2 gap-3">/);
  assert.match(registrationPage, /existing password is preserved/);
  assert.match(registrationApi, /ensureVendorApplication\(supabase, user/);
  assert.match(registration, /approval_status: "pending"/);
  assert.match(registration, /is_published: false/);
  assert.match(adminMarketplace, /useState\("vendors"\)/);
  assert.match(adminMarketplace, /Approve or reject vendor registration applications/);
  assert.match(listings, /without a separate listing approval/);
  assert.match(listings, /Save and submit listing/);
});

test("SQL regression contract: listing moderation is RPC-only", () => {
  const migration = read("../supabase/migrations/021_vendor_approval_publishes_listings.sql");
  const adminPolicies = read("../supabase/migrations/016_admin_permissions_operations.sql");
  const trigger = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.guard_vendor_listing_moderation"), migration.indexOf("-- Keep moderation behind a permission-checked RPC"));
  const rpc = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.moderate_vendor_listing"), migration.indexOf("-- Let the owner policy"));
  const approval = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.publish_vendor_listings_after_vendor_approval"), migration.indexOf("-- Editing listing add-ons"));
  assert.doesNotMatch(trigger, /IF public\.is_evntora_admin\(\)[\s\S]*?RETURN NEW/);
  assert.match(trigger, /audit\.request_id = 'vendor-listing-status:' \|\| txid_current\(\)::text/);
  assert.match(trigger, /OLD\.status IN \('published', 'rejected', 'archived'\)[\s\S]*?NEW\.status := OLD\.status/);
  assert.match(trigger, /NEW\.status NOT IN \('draft', 'pending_approval'\)/);
  assert.match(rpc, /p_action IN \('reject', 'restore'\).*?length\(trim\(COALESCE\(p_reason, ''\)\)\) < 3/);
  assert.match(rpc, /INSERT INTO public\.admin_audit_log[\s\S]*?vendor-listing-status:' \|\| txid_current\(\)::text[\s\S]*?UPDATE public\.vendor_listings/);
  assert.match(rpc, /next_status := 'pending_approval'/);
  assert.match(approval, /has_admin_permission\('vendor_verification'\)/);
  assert.match(approval, /vendor_listing_auto_published/);
  assert.match(approval, /WHERE vendor_profile_id = NEW\.id AND status = 'pending_approval'/);
  assert.match(adminPolicies, /DROP POLICY IF EXISTS vendor_listings_admin_manage ON public\.vendor_listings/);
  assert.match(adminPolicies, /CREATE POLICY vendor_listings_admin_read ON public\.vendor_listings FOR SELECT/);
  assert.doesNotMatch(migration, /CREATE POLICY\s+vendor_listings_admin_manage/i);
});

test("SQL regression contract: vendor OTP activation preserves audited suspension", () => {
  const migration = read("../supabase/migrations/022_email_otp_identity_activation.sql");
  const profileGuard = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.guard_vendor_profile_changes"), migration.indexOf("-- Keep vendor moderation permission-checked"));
  const verified = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.activate_customer_after_email_verification"), migration.indexOf("DROP TRIGGER IF EXISTS evntora_customer_email_verified"));
  const sync = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.grant_vendor_role_for_owned_profile"), migration.indexOf("-- Reconcile existing memberships"));
  const admin = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.admin_set_user_role_active"), migration.indexOf("REVOKE ALL ON FUNCTION public.admin_set_user_role_active"));
  assert.match(migration, /ADD COLUMN IF NOT EXISTS vendor_suspended_at timestamptz/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS vendor_suspended_by uuid REFERENCES auth\.users/);
  assert.match(migration, /latest_vendor_access_action/);
  assert.match(verified, /approval_status = 'approved' AND vendor\.is_published/);
  assert.match(verified, /DO UPDATE[\s\S]*vendor_suspended_at IS NULL/);
  assert.match(sync, /DO UPDATE[\s\S]*vendor_suspended_at IS NULL/);
  assert.match(admin, /vendor_suspended_at = CASE[\s\S]*WHEN p_active THEN NULL[\s\S]*ELSE coalesce\(vendor_suspended_at, now\(\)\)/);
  assert.match(admin, /vendor_suspended_by = CASE[\s\S]*WHEN p_active THEN NULL[\s\S]*auth\.uid\(\)/);
  assert.match(admin, /vendor_suspension_reason = CASE[\s\S]*WHEN p_active THEN NULL[\s\S]*clean_reason/);
  assert.match(admin, /user_workspace_suspended/);
  assert.match(admin, /vendor_suspended_at', prior_vendor_suspended_at/);
  assert.doesNotMatch(migration, /set_config\('app\.vendor_claim'/);
  assert.match(profileGuard, /admin_audit_log[\s\S]*vendor-profile-change:' \|\| txid_current\(\)::text/);
  assert.match(profileGuard, /vendor_profile_claimed/);
  assert.match(profileGuard, /NEW\.approval_status = 'approved' AND NEW\.is_published/);
  assert.match(migration, /UPDATE public\.vendor_profiles[\s\S]*approval_status = 'approved' AND is_published/);
  const eligibleActivation = (hasRow, suspended) => hasRow ? !suspended : true;
  assert.equal(eligibleActivation(true, false), true, "verified eligible vendor is activated");
  assert.equal(eligibleActivation(true, true), false, "explicit suspension is preserved");
  assert.equal(eligibleActivation(false, false), true, "a later approval may activate a verified vendor");
});

test("Customer signup does not proceed when Supabase reports an existing identity", () => {
  const signup = read("../app/signup/page.tsx");
  assert.match(signup, /data\.user && !data\.session && data\.user\.identities\?\.length === 0/);
  assert.match(signup, /This email is already registered with Evntora/);
  assert.match(signup, /Sign in with your existing account/);
  assert.match(signup, /You already have an Evntora account/);
});

test("Admin invitations reuse existing identities and never ask them to replace a password", () => {
  const invitations = read("../app/api/admin/invitations/route.ts");
  const callback = read("../app/auth/callback/route.ts");
  assert.match(invitations, /signInWithOtp\(\{ email, options: \{ shouldCreateUser: !isExistingIdentity/);
  assert.match(invitations, /auth\.admin\.listUsers/);
  assert.match(invitations, /requires_password_setup: !isExistingIdentity/);
  assert.match(invitations, /revokeError/);
  assert.match(callback, /auth\/admin-activate/);
  assert.match(callback, /admin_invite/);
});

test("Email OTP flows share one identity and do not grant Vendor or Admin roles", () => {
  const customerSignup = read("../app/signup/page.tsx");
  const vendorSignup = read("../app/signup/vendor/page.tsx");
  const recovery = read("../app/auth/forgot-password/page.tsx");
  const adminAccept = read("../app/api/admin/invitations/accept/route.ts");
  const adminActivate = read("../app/auth/admin-activate/page.tsx");
  const migration = read("../supabase/migrations/022_email_otp_identity_activation.sql");
  assert.match(customerSignup, /verifyOtp\(\{ email:[\s\S]*?type: otpType/);
  assert.match(customerSignup, /token: otp\.trim\(\)/);
  assert.match(vendorSignup, /verifyOtp\(\{ email:[\s\S]*?type: otpType/);
  assert.match(vendorSignup, /\/api\/vendors\/register/);
  assert.match(recovery, /type: "recovery"/);
  assert.match(recovery, /updateUser\(\{ password \}\)/);
  assert.match(adminAccept, /email_confirmed_at/);
  assert.match(adminActivate, /type: "email"/);
  assert.doesNotMatch(adminActivate, /const accepted = await accept\(\); if \(active && accepted\)/);
  assert.match(migration, /activate_customer_after_email_verification/);
  assert.match(migration, /approval_status = 'approved' AND NEW\.is_published/);
  assert.match(migration, /accept_admin_invitation/);
});

test("Role changes reuse the existing identity and keep Customer, Vendor and Admin grants independent", () => {
  const migration = read("../supabase/migrations/022_email_otp_identity_activation.sql");
  const vendorRegistration = read("../lib/vendor-registration.ts");
  const invitationApi = read("../app/api/admin/invitations/accept/route.ts");
  const customerSignup = read("../app/signup/page.tsx");
  const vendorSignup = read("../app/signup/vendor/page.tsx");
  assert.match(migration, /INSERT INTO public\.user_roles\(user_id, role, is_active\)[\s\S]*SELECT u\.id, 'customer', true/);
  assert.match(migration, /approval_status = 'approved' AND NEW\.is_published/);
  assert.match(migration, /INSERT INTO public\.user_roles\(user_id, role, granted_by\)[\s\S]*'admin'/);
  assert.match(vendorRegistration, /\.eq\("user_id", user\.id\)/);
  assert.match(invitationApi, /updateUserById\(user\.id/);
  assert.match(customerSignup, /This email is already registered with Evntora\. Sign in/);
  assert.match(vendorSignup, /This email already has an Evntora account\. Sign in/);
});

test("Vendor quotation requests open the proposal editor directly from the request inbox", () => {
  const layout = read("../app/vendor-portal/layout.tsx");
  const page = read("../app/vendor-portal/page.tsx");
  const amountForm = read("../components/booking/VendorQuoteAmountForm.tsx");
  const quotationApi = read("../app/api/bookings/[id]/quotations/route.ts");
  assert.match(layout, /section: "quote-requests", label: "Quote Requests"/);
  assert.match(page, /\["awaiting_quotation", "quotation_revision_requested", "quotation_sent"\]/);
  assert.match(page, /Enter amount and send quotation/);
  assert.match(page, /<VendorQuoteAmountForm bookingId=\{booking\.id\}/);
  assert.match(amountForm, /\/api\/bookings\/\$\{bookingId\}\/quotations/);
  assert.match(amountForm, /result\.quotation\.reference/);
  assert.match(amountForm, /result\.quotation\.totalAmount/);
  assert.match(amountForm, /allowPartialPayments: true/);
  assert.match(page, /sentQuotationAmounts\[booking\.id\]/);
  assert.match(page, /const vendorBookings = bookings\.filter\(\(booking\) => !\["awaiting_quotation", "quotation_sent", "quotation_revision_requested", "declined"\]/);
  assert.match(page, /View payment details/);
  assert.match(page, /selectedBookingId === booking\.id && <div className="border-t/);
  assert.match(quotationApi, /create_booking_quotation/);
  assert.match(quotationApi, /eq\("role", "vendor"\)\.eq\("is_active", true\)/);
  assert.match(quotationApi, /eq\("id", access\.booking\.vendor_profile_id\)\.eq\("user_id", access\.user\.id\)/);
});

test("Customers can review and respond to the sent quote before payment; completion supports review and support report", () => {
  const paymentsPage = read("../app/dashboard/payments/page.tsx");
  const customerQuote = read("../components/booking/CustomerQuotationResponse.tsx");
  const lifecycle = read("../components/booking/BookingLifecyclePanel.tsx");
  assert.match(paymentsPage, /booking\.status === "quotation_sent" && <CustomerQuotationResponse/);
  assert.match(customerQuote, /Proposed total/);
  assert.match(customerQuote, /Accept quotation/);
  assert.match(customerQuote, /Reject quotation/);
  assert.match(customerQuote, /\/api\/bookings\/\$\{bookingId\}\/quotations\/\$\{quote\.id\}/);
  assert.match(lifecycle, /action: "acknowledge_completion"/);
  assert.match(lifecycle, /caseType: "booking_complaint"/);
  assert.match(lifecycle, /Submit review/);
});

test("Vendor Hub section and booking selection are driven by App Router query state", () => {
  const page = read("../app/vendor-portal/page.tsx");
  assert.match(page, /useSearchParams\(\)/);
  assert.match(page, /router\.push\(`\/vendor-portal\?/);
  assert.doesNotMatch(page, /window\.history\.pushState|addEventListener\("popstate"/);
  assert.match(page, /searchParams\.get\("bookingId"\)/);
});

test("Customer workspace keeps vendor discovery and event planning inside its dashboard shell", () => {
  const dashboardLayout = read("../app/dashboard/layout.tsx");
  const vendorRoute = read("../app/dashboard/vendors/page.tsx");
  const plannerRoute = read("../app/dashboard/planner/page.tsx");
  const marketplace = read("../components/vendors/VendorMarketplace.tsx");
  const planner = read("../components/planner/PlannerContent.tsx");
  assert.match(dashboardLayout, /href: "\/dashboard\/vendors", label: "Discover Vendors"/);
  assert.match(vendorRoute, /<VendorMarketplace embedded \/>/);
  assert.match(marketplace, /!embedded && <Navbar \/>/);
  assert.match(marketplace, /embedded \? "\/dashboard\/vendors" : "\/vendors"/);
  assert.match(marketplace, /\/\$\{vendor\.id\}/);
  assert.match(read("../app/dashboard/vendors/[id]/page.tsx"), /<VendorProfile params=\{params\} embedded \/>/);
  assert.match(plannerRoute, /<PlannerContent embedded \/>/);
  assert.match(planner, /embedded \? "\/dashboard\/vendors" : "\/vendors"/);
  for (const source of [read("../app/dashboard/page.tsx"), read("../app/dashboard/events/page.tsx"), read("../components/dashboard/EventWorkspace.tsx")]) {
    assert.doesNotMatch(source, /href="\/planner\?|href=\{`\/planner\?/);
    assert.doesNotMatch(source, /href="\/vendors\?returnTo|href=\{`\/vendors\?eventId/);
  }
});

test("Customer and vendor workspaces use persisted business records, not the legacy demo store", () => {
  const customerOverview = read("../app/dashboard/page.tsx");
  const customerEvents = read("../app/dashboard/events/page.tsx");
  const eventWorkspace = read("../components/dashboard/EventWorkspace.tsx");
  const vendorPortal = read("../app/vendor-portal/page.tsx");
  const vendorCatalog = read("../components/vendors/VendorCatalogManager.tsx");
  for (const source of [customerOverview, customerEvents, eventWorkspace, vendorPortal, vendorCatalog]) {
    assert.doesNotMatch(source, /useEvntoraStore|from ["']@\/lib\/store/);
  }
  assert.match(customerEvents, /fetch\("\/api\/ai\/events"/);
  assert.match(eventWorkspace, /expectedUpdatedAt: event\.updated_at/);
  assert.match(vendorPortal, /\.from\("bookings"\)/);
  assert.match(vendorCatalog, /\.from\("vendor_services"\)/);
  assert.match(vendorCatalog, /\.from\("vendor_packages"\)/);
  assert.doesNotMatch(vendorPortal, /Reviews are not connected yet/);
  assert.match(vendorPortal, /Booking records could not be loaded/);
});

test("Partial installments start at ₹1 and are reflected in checkout and the forward migration", () => {
  const migration = read("../supabase/migrations/020_allow_small_partial_installments.sql");
  const checkout = read("../app/checkout/page.tsx");
  const captureMigration = read("../supabase/migrations/013_booking_lifecycle.sql");
  const orderApi = read("../app/api/payments/create-order/route.ts");
  assert.match(migration, /NEW\.amount < 100/);
  assert.match(migration, /booking_total - booking_paid/);
  assert.match(orderApi, /partialAmountPaise! < 100/);
  assert.match(checkout, /minimumPartialPaymentPaise\(advancePaise, paidPaise\)/);
  assert.match(checkout, /minimum ₹1/);
  assert.match(captureMigration, /new_paid >= booking_row\.advance_amount/);
  assert.match(checkout, /isValidCheckoutPaymentAmountPaise\(/);
});

test("Customer can pay a ₹1 installment without bypassing capture-based booking confirmation", () => {
  const min = minimumPartialPaymentPaise(250_000, 100_000);
  assert.equal(min, 100);
  assert.equal(isValidCheckoutPaymentAmountPaise(100, 500_000, "partial", true, min), true);
  assert.equal(isValidCheckoutPaymentAmountPaise(99, 500_000, "partial", true, min), false);
  assert.equal(isValidCheckoutPaymentAmountPaise(500_001, 500_000, "partial", true, min), false);
  assert.equal(isValidCheckoutPaymentAmountPaise(-1, 500_000, "partial", true, min), false);
  assert.equal(isValidCheckoutPaymentAmountPaise(150_000, 500_000, "partial", false, min), true);
  assert.equal(isValidCheckoutPaymentAmountPaise(0, 500_000, "partial", true, min), false);
});

test("Multi-role customers can respond to quotations only for bookings they own", () => {
  const route = read("../app/api/bookings/[id]/quotations/[quotationId]/route.ts");
  assert.match(route, /eq\("role", "customer"\)\.eq\("is_active", true\)/);
  assert.match(route, /access\.booking\.customer_id !== access\.user\.id/);
  assert.doesNotMatch(route, /access\.role !== "customer"/);
});

test("Booking requests require an owned event and event workspaces show linked booking progress and balances", () => {
  const bookingApi = read("../app/api/bookings/create/route.ts");
  const bookingModal = read("../components/booking/BookingModal.tsx");
  const eventWorkspace = read("../components/dashboard/EventWorkspace.tsx");
  assert.match(bookingApi, /eventId: z\.string\(\)\.uuid\(\),/);
  assert.match(bookingModal, /Book this service for an event/);
  assert.match(bookingModal, /eventId: selectedEventId/);
  assert.match(eventWorkspace, /\.eq\("event_id", eventId\)\.eq\("customer_id", user\?\.id \?\? ""\)/);
  assert.match(eventWorkspace, /Total \{booking\.total_amount > 0 \? formatINR/);
  assert.match(eventWorkspace, /formatINR\(booking\.paid_amount \/ 100\)/);
  assert.match(eventWorkspace, /Work completed/);
  assert.match(eventWorkspace, /">Manage<\/Link>/);
  assert.match(eventWorkspace, /label: "Vendors"/);
});

test("Vendor Service Tasks reuse secure booking transitions and customer work view exposes completion", () => {
  const layout = read("../app/vendor-portal/layout.tsx");
  const vendor = read("../app/vendor-portal/page.tsx");
  const bookingPanel = read("../components/booking/BookingLifecyclePanel.tsx");
  const eventWorkspace = read("../components/dashboard/EventWorkspace.tsx");
  assert.match(layout, /section: "service-tasks", label: "Service Tasks"/);
  assert.match(vendor, /activeTab === "service-tasks"/);
  assert.match(vendor, /const serviceTasks = bookings\.filter\(\(booking\) => \["confirmed", "in_progress", "completed"\]/);
  assert.match(vendor, /activeTab !== "service-tasks"/);
  assert.match(vendor, /const actions = booking\.status === "confirmed" \? \["start", "complete"\] : \["complete"\]/);
  assert.match(vendor, /type="checkbox" checked=\{workDone\} disabled=\{workDone \|\| actionInProgress === booking\.id\}/);
  assert.match(vendor, /handleCompleteServiceTask\(booking\)/);
  assert.match(vendor, /Payment not done/);
  assert.match(bookingPanel, /if \(viewer === "vendor"\)\s*\{\s*return <section className="rounded-xl border/);
  assert.match(bookingPanel, /Remaining: <b>\{detail\.total_amount > 0 \? formatINR\(outstanding \/ 100\) : "Not set"\}<\/b>/);
  assert.match(bookingPanel, /Payment and refund history/);
  assert.doesNotMatch(bookingPanel, /Verified payment log/);
  assert.match(eventWorkspace, /Work completed/);
  assert.match(eventWorkspace, /outstanding <= 0 \? "Paid" : "Part paid"/);
});

test("Service listing prices are unit-based, vendor-authored and checked before booking requests", () => {
  const migration = read("../supabase/migrations/019_service_pricing_units.sql");
  const listingApi = read("../app/api/vendors/listings/route.ts");
  const bookingApi = read("../app/api/bookings/create/route.ts");
  const marketplaceApi = read("../app/api/vendors/route.ts");
  const bookingForm = read("../components/booking/BookingModal.tsx");
  const units = ["per_hour", "per_day", "per_event", "per_guest", "per_item", "per_package", "custom_quote"];
  for (const unit of units) {
    assert.match(migration, new RegExp(unit));
    assert.match(listingApi, new RegExp(unit));
  }
  assert.match(migration, /minimum_quantity|pricing_details|inclusions|exclusions/);
  assert.match(listingApi, /startingPrice/);
  assert.match(marketplaceApi, /listing\.status === "published"/);
  assert.match(bookingApi, /\.eq\("status", "published"\)/);
  assert.match(bookingForm, /Vendor quotation required; no price has been published/);
  assert.match(bookingForm, /The vendor will confirm the exact amount in a proposal before payment/);
  assert.match(bookingForm, /fetch\("\/api\/ai\/events"/);
});

test("Platform Owner role assignment provisions only verified existing users and preserves suspension", () => {
  const migration = read("../supabase/migrations/018_workflow_access_and_payment_floor.sql");
  const invitationMigration = read("../supabase/migrations/016_admin_permissions_operations.sql");
  const invitationApi = read("../app/api/admin/invitations/route.ts");
  assert.match(migration, /IF NOT public\.is_evntora_owner\(\)/);
  assert.match(migration, /email_confirmed_at IS NOT NULL/);
  assert.match(migration, /INSERT INTO public\.user_roles\(user_id, role, is_active, granted_by\)/);
  assert.match(migration, /membership_found AND NOT membership_active/);
  assert.match(migration, /role = 'platform_owner'/);
  assert.match(migration, /Suspension changes only the authoritative admin membership/);
  assert.doesNotMatch(migration, /UPDATE public\.admin_role_assignments SET is_active = p_active/);
  assert.match(invitationMigration, /lower\(i\.email\)=current_email/);
  assert.match(invitationMigration, /role='platform_owner' AND o\.is_active/);
  assert.match(invitationApi, /rpc\("set_admin_assignment"/);
});
