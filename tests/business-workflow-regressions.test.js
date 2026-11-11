import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isValidCheckoutPaymentAmountPaise, minimumPartialPaymentPaise } from "../lib/payment-amounts.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

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
  assert.match(lifecycle, /action: "complete"/);
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
  assert.match(bookingPanel, /Verified payment log/);
  assert.match(bookingPanel, /payment\.status\)\)/);
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
