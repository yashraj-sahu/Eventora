import test from "node:test";
import assert from "node:assert/strict";
import { authorizedWorkspaces, workspaceForPath, portalHome } from "../lib/portal-routing.ts";
import { z } from "zod";

// Test portal-routing matrix
test("Portal Routing Matrix: Correctly resolves single-role users", () => {
  assert.deepEqual(authorizedWorkspaces(["customer"]), ["customer"]);
  assert.equal(portalHome("customer"), "/dashboard");

  assert.deepEqual(authorizedWorkspaces(["vendor"]), ["vendor"]);
  assert.equal(portalHome("vendor", false), "/vendor-portal/pending");
  assert.equal(portalHome("vendor", true), "/vendor-portal");

  assert.deepEqual(authorizedWorkspaces(["admin"]), ["admin"]);
  assert.equal(portalHome("admin"), "/admin");

  assert.deepEqual(authorizedWorkspaces(["platform_owner"]), ["admin"]);
  assert.equal(portalHome("platform_owner"), "/admin");
});

test("Portal Routing Matrix: Multi-role user has multi-workspace access", () => {
  const hybridVendor = authorizedWorkspaces(["customer", "vendor"]);
  assert.deepEqual(hybridVendor, ["customer", "vendor"]);

  const platformOwner = authorizedWorkspaces(["customer", "vendor", "platform_owner"]);
  assert.deepEqual(platformOwner, ["customer", "vendor", "admin"]);
});

test("Portal Routing Matrix: Workspace path protection mapping", () => {
  assert.equal(workspaceForPath("/dashboard"), "customer");
  assert.equal(workspaceForPath("/dashboard/events"), "customer");
  assert.equal(workspaceForPath("/dashboard/payments"), "customer");
  assert.equal(workspaceForPath("/checkout"), "customer");

  assert.equal(workspaceForPath("/vendor-portal"), "vendor");
  assert.equal(workspaceForPath("/vendor-portal/pending"), "vendor");

  assert.equal(workspaceForPath("/admin"), "admin");
  assert.equal(workspaceForPath("/admin/users"), "admin");
  assert.equal(workspaceForPath("/admin/payments"), "admin");

  assert.equal(workspaceForPath("/"), null);
  assert.equal(workspaceForPath("/vendors"), null);
  assert.equal(workspaceForPath("/planner"), null);
});

// Zod Input Schema Testing for Security & Attack Prevention
test("Security Input Validation: Booking Create Schema blocks malicious inputs", () => {
  const bookingInput = z.object({
    vendorProfileId: z.string().uuid(),
    eventId: z.string().uuid().nullable().optional(),
    packageId: z.string().uuid().nullable(),
    serviceId: z.string().uuid().nullable().optional(),
    eventDate: z.string().date(),
    eventCity: z.string().trim().min(2).max(120),
    guestCount: z.number().int().min(1).max(10000),
    advancePercentage: z.union([z.literal(25), z.literal(50), z.literal(100)]),
    requirements: z.string().trim().max(3000).default(""),
    idempotencyKey: z.string().uuid(),
  }).strict();

  // Valid payload
  const valid = bookingInput.safeParse({
    vendorProfileId: "11111111-1111-4111-8111-111111111111",
    eventDate: "2026-12-15",
    eventCity: "Udaipur",
    guestCount: 250,
    packageId: "22222222-2222-4222-8222-222222222222",
    advancePercentage: 25,
    requirements: "Royal celebration mandap and banquet",
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(valid.success, true);

  // SQL Injection attempt in ID
  const sqlInjection = bookingInput.safeParse({
    vendorProfileId: "'; DROP TABLE bookings; --",
    eventDate: "2026-12-15",
    eventCity: "Udaipur",
    guestCount: 250,
    packageId: null,
    advancePercentage: 25,
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(sqlInjection.success, false, "SQL injection string must fail UUID validation");

  // Invalid advance percentage (e.g. 0% or negative or arbitrary 1%)
  const invalidAdvance = bookingInput.safeParse({
    vendorProfileId: "11111111-1111-4111-8111-111111111111",
    eventDate: "2026-12-15",
    eventCity: "Udaipur",
    guestCount: 250,
    packageId: null,
    advancePercentage: 5, // Not 25, 50, or 100
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(invalidAdvance.success, false, "Non-standard advance percentage must be rejected");

  // Unexpected extra fields injection (mass assignment attack blocked by .strict())
  const extraFields = bookingInput.safeParse({
    vendorProfileId: "11111111-1111-4111-8111-111111111111",
    eventDate: "2026-12-15",
    eventCity: "Udaipur",
    guestCount: 250,
    packageId: null,
    advancePercentage: 25,
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    status: "confirmed", // Attacker trying to set status to confirmed directly
    paid_amount: 1000000,
  });
  assert.equal(extraFields.success, false, "Strict schema must block mass assignment / injected columns");
});

test("Security Input Validation: Payment Verification Schema rejects invalid signatures", () => {
  const verificationInput = z.object({
    razorpayOrderId: z.string().min(1).max(100),
    razorpayPaymentId: z.string().min(1).max(100),
    razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i),
    bookingId: z.string().uuid(),
  }).strict();

  // Valid inputs
  assert.ok(verificationInput.safeParse({
    razorpayOrderId: "order_12345",
    razorpayPaymentId: "pay_12345",
    razorpaySignature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    bookingId: "11111111-1111-4111-8111-111111111111",
  }).success);

  // Invalid signature format (less than 64 hex chars or XSS payload)
  assert.ok(!verificationInput.safeParse({
    razorpayOrderId: "order_12345",
    razorpayPaymentId: "pay_12345",
    razorpaySignature: "<script>alert(1)</script>",
    bookingId: "11111111-1111-4111-8111-111111111111",
  }).success);
});

test("Security Input Validation: Refund Request Schema enforces permission & UUID bounds", () => {
  const refundInput = z.object({
    paymentId: z.string().uuid(),
    amountPaise: z.number().int().positive().optional(),
    reason: z.string().trim().min(1).max(1000),
    idempotencyKey: z.string().uuid(),
  }).strict();

  assert.ok(refundInput.safeParse({
    paymentId: "11111111-1111-4111-8111-111111111111",
    amountPaise: 500000,
    reason: "Client rescheduled event by mutual agreement",
    idempotencyKey: "22222222-2222-4222-8222-222222222222",
  }).success);

  // Negative refund amount blocked
  assert.ok(!refundInput.safeParse({
    paymentId: "11111111-1111-4111-8111-111111111111",
    amountPaise: -5000,
    reason: "test",
    idempotencyKey: "22222222-2222-4222-8222-222222222222",
  }).success);

  // Zero refund amount blocked
  assert.ok(!refundInput.safeParse({
    paymentId: "11111111-1111-4111-8111-111111111111",
    amountPaise: 0,
    reason: "test",
    idempotencyKey: "22222222-2222-4222-8222-222222222222",
  }).success);
});

