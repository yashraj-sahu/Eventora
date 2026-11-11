import test from "node:test";
import assert from "node:assert/strict";

// Helper functions modeling Evntora's SQL and API business rules
function calculateQuotation(items, discountPaise = 0, additionalChargesPaise = 0, advancePercentage = 25) {
  assert.ok(items.length > 0, "Quotation must have at least one item");
  assert.ok(advancePercentage >= 1 && advancePercentage <= 100, "Advance percentage must be between 1 and 100");

  let subtotal = 0;
  const processedItems = items.map((item, index) => {
    assert.ok(item.description && item.description.trim().length > 0, `Item ${index + 1} must have a description`);
    assert.ok(item.quantity > 0, `Item ${index + 1} quantity must be positive`);
    assert.ok(item.unitPricePaise >= 0, `Item ${index + 1} unit price must be non-negative`);

    const lineTotal = Math.round(item.quantity * item.unitPricePaise);
    subtotal += lineTotal;
    return { ...item, lineTotal };
  });

  const totalAmount = Math.max(0, subtotal - discountPaise + additionalChargesPaise);
  const advanceAmount = Math.round((totalAmount * advancePercentage) / 100);
  const remainingBalance = totalAmount - advanceAmount;

  return {
    items: processedItems,
    subtotal,
    discountPaise,
    additionalChargesPaise,
    totalAmount,
    advancePercentage,
    advanceAmount,
    remainingBalance,
  };
}

// Lifecycle State Machine modeling transition_booking RPC
const VALID_TRANSITIONS = {
  customer: {
    accept_quotation: ["quotation_sent"],
    decline_quotation: ["quotation_sent"],
    request_quotation_revision: ["quotation_sent"],
    pay_advance: ["awaiting_payment"],
    request_cancellation: ["confirmed", "awaiting_payment", "pending_vendor_confirmation"],
    acknowledge_completion: ["completed"],
  },
  vendor: {
    send_quotation: ["awaiting_quotation", "quotation_revision_requested"],
    withdraw_quotation: ["quotation_sent"],
    accept_booking: ["pending_vendor_confirmation"],
    reject_booking: ["pending_vendor_confirmation"],
    start_service: ["confirmed"],
    complete_service: ["in_progress", "confirmed"],
    approve_cancellation: ["cancellation_requested"],
    reject_cancellation: ["cancellation_requested"],
  },
  admin: {
    force_confirm: ["pending_vendor_confirmation", "awaiting_payment"],
    force_cancel: ["confirmed", "cancellation_requested", "awaiting_payment", "in_progress"],
    force_complete: ["in_progress", "confirmed"],
  },
};

function canTransition(actorRole, action, currentStatus) {
  const allowed = VALID_TRANSITIONS[actorRole]?.[action];
  if (!allowed) return false;
  return allowed.includes(currentStatus);
}

test("Quotation Math: Accurately calculates subtotal, discounts, advance and balance in paise", () => {
  const items = [
    { description: "Royal Mandap Setup", quantity: 1, unitPricePaise: 25000000 }, // ₹2,50,000
    { description: "Floral Decor & Chandeliers", quantity: 4, unitPricePaise: 5000000 }, // 4 x ₹50,000 = ₹2,00,000
    { description: "Sound & Stage Lighting", quantity: 2, unitPricePaise: 3000000 }, // 2 x ₹30,000 = ₹60,000
  ];

  const discountPaise = 1000000; // ₹10,000 discount
  const additionalChargesPaise = 500000; // ₹5,000 transport/setup fee
  const advancePercentage = 25; // 25% advance

  const result = calculateQuotation(items, discountPaise, additionalChargesPaise, advancePercentage);

  assert.equal(result.subtotal, 51000000); // ₹5,10,000
  assert.equal(result.totalAmount, 50500000); // ₹5,05,000 (5.1L - 10k + 5k)
  assert.equal(result.advanceAmount, 12625000); // ₹1,26,250 (25% of 5,05,000)
  assert.equal(result.remainingBalance, 37875000); // ₹3,78,750 (75%)
  assert.equal(result.advanceAmount + result.remainingBalance, result.totalAmount);
});

test("Quotation Expiry Validation: Expired quotations cannot be accepted", () => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 2).toISOString().slice(0, 10);
  const futureDate = new Date(now.getTime() + 86400000 * 5).toISOString().slice(0, 10);

  const isQuoteExpired = (validUntilDate) => {
    const today = new Date().toISOString().slice(0, 10);
    return validUntilDate < today;
  };

  assert.equal(isQuoteExpired(pastDate), true, "Past valid_until must be expired");
  assert.equal(isQuoteExpired(futureDate), false, "Future valid_until is active");
});

test("Booking State Transitions: Customer actions follow strict permissions", () => {
  // Customer can accept quote when quotation_sent
  assert.ok(canTransition("customer", "accept_quotation", "quotation_sent"));
  // Customer cannot accept quote if already awaiting payment or confirmed
  assert.ok(!canTransition("customer", "accept_quotation", "awaiting_payment"));
  assert.ok(!canTransition("customer", "accept_quotation", "confirmed"));

  // Customer cannot start or complete service
  assert.ok(!canTransition("customer", "start_service", "confirmed"));
  assert.ok(!canTransition("customer", "complete_service", "in_progress"));

  // Customer can request cancellation for confirmed booking
  assert.ok(canTransition("customer", "request_cancellation", "confirmed"));
});

test("Booking State Transitions: Vendor actions follow strict permissions", () => {
  // Vendor can send quote on awaiting_quotation
  assert.ok(canTransition("vendor", "send_quotation", "awaiting_quotation"));
  // Vendor can withdraw quotation when quotation_sent
  assert.ok(canTransition("vendor", "withdraw_quotation", "quotation_sent"));

  // Vendor cannot accept customer's proposal (only customer accepts vendor quote)
  assert.ok(!canTransition("vendor", "accept_quotation", "quotation_sent"));

  // Vendor can start service when confirmed
  assert.ok(canTransition("vendor", "start_service", "confirmed"));
  // Vendor can mark complete when in_progress
  assert.ok(canTransition("vendor", "complete_service", "in_progress"));
  // Vendor can approve cancellation when customer requested
  assert.ok(canTransition("vendor", "approve_cancellation", "cancellation_requested"));
});

test("Booking State Transitions: Admin oversight and emergency transitions", () => {
  assert.ok(canTransition("admin", "force_cancel", "confirmed"));
  assert.ok(canTransition("admin", "force_cancel", "cancellation_requested"));
  assert.ok(canTransition("admin", "force_complete", "in_progress"));
});

test("Full Quotation-to-Booking Journey State Progression", () => {
  const lifecycle = [];

  let status = "awaiting_quotation";
  lifecycle.push(status);

  // 1. Vendor prepares and submits proposal/quotation
  assert.ok(canTransition("vendor", "send_quotation", status));
  status = "quotation_sent";
  lifecycle.push(status);

  // 2. Customer reviews and accepts quotation
  assert.ok(canTransition("customer", "accept_quotation", status));
  status = "awaiting_payment";
  lifecycle.push(status);

  // 3. Customer pays advance lock via Razorpay
  assert.ok(canTransition("customer", "pay_advance", status));
  status = "confirmed";
  lifecycle.push(status);

  // 4. On event day, vendor starts service
  assert.ok(canTransition("vendor", "start_service", status));
  status = "in_progress";
  lifecycle.push(status);

  // 5. Vendor completes celebration execution
  assert.ok(canTransition("vendor", "complete_service", status));
  status = "completed";
  lifecycle.push(status);

  // 6. Customer acknowledges completion and leaves review
  assert.ok(canTransition("customer", "acknowledge_completion", status));

  assert.deepEqual(lifecycle, [
    "awaiting_quotation",
    "quotation_sent",
    "awaiting_payment",
    "confirmed",
    "in_progress",
    "completed",
  ]);
});

