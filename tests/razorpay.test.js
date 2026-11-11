import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyRazorpaySignature, verifyWebhookSignature } from "../lib/razorpay-server.ts";

test("Razorpay Signature Verification: Valid signature passes", () => {
  const secret = "test_secret_key_12345";
  process.env.RAZORPAY_KEY_SECRET = secret;

  const orderId = "order_O123456789";
  const paymentId = "pay_P987654321";
  const payload = `${orderId}|${paymentId}`;
  const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const result = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: validSignature,
  });

  assert.equal(result, true, "Valid Razorpay signature must be accepted");
});

test("Razorpay Signature Verification: Tampered signature is rejected", () => {
  const secret = "test_secret_key_12345";
  process.env.RAZORPAY_KEY_SECRET = secret;

  const orderId = "order_O123456789";
  const paymentId = "pay_P987654321";
  const forgedSignature = "a".repeat(64);

  const result = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: forgedSignature,
  });

  assert.equal(result, false, "Forged signature must be rejected");
});

test("Razorpay Signature Verification: Tampered orderId or paymentId is rejected", () => {
  const secret = "test_secret_key_12345";
  process.env.RAZORPAY_KEY_SECRET = secret;

  const orderId = "order_O123456789";
  const paymentId = "pay_P987654321";
  const payload = `${orderId}|${paymentId}`;
  const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  // Tampered order ID
  const tamperedOrderResult = verifyRazorpaySignature({
    orderId: "order_O999999999",
    paymentId,
    signature: validSignature,
  });
  assert.equal(tamperedOrderResult, false, "Signature with tampered orderId must fail");

  // Tampered payment ID
  const tamperedPaymentResult = verifyRazorpaySignature({
    orderId,
    paymentId: "pay_P000000000",
    signature: validSignature,
  });
  assert.equal(tamperedPaymentResult, false, "Signature with tampered paymentId must fail");
});

test("Razorpay Signature Verification: Non-hex or invalid length signature fails gracefully", () => {
  const secret = "test_secret_key_12345";
  process.env.RAZORPAY_KEY_SECRET = secret;

  const resultShort = verifyRazorpaySignature({
    orderId: "order_1",
    paymentId: "pay_1",
    signature: "short",
  });
  assert.equal(resultShort, false, "Short signature must fail");

  const resultInvalid = verifyRazorpaySignature({
    orderId: "order_1",
    paymentId: "pay_1",
    signature: "zzzz-invalid-hex-characters",
  });
  assert.equal(resultInvalid, false, "Non-hex signature must fail safely without crash");
});

test("Razorpay Webhook Verification: Authentic webhook passes", () => {
  const secret = "webhook_secret_secure_99";
  const rawBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_123456",
          order_id: "order_123456",
          amount: 5000000,
          currency: "INR",
          status: "captured",
          captured: true,
        },
      },
    },
  });

  const validSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const result = verifyWebhookSignature({
    rawBody,
    signature: validSignature,
    secret,
  });

  assert.equal(result, true, "Authentic webhook signature must pass");
});

test("Razorpay Webhook Verification: Modified payload is rejected", () => {
  const secret = "webhook_secret_secure_99";
  const rawBody = JSON.stringify({ event: "payment.captured", amount: 500000 });
  const validSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  // Tamper with the raw body
  const tamperedBody = JSON.stringify({ event: "payment.captured", amount: 100 });

  const result = verifyWebhookSignature({
    rawBody: tamperedBody,
    signature: validSignature,
    secret,
  });

  assert.equal(result, false, "Tampered webhook payload must be rejected");
});

test("Razorpay Webhook Verification: Missing inputs fail gracefully", () => {
  assert.equal(verifyWebhookSignature({ rawBody: "", signature: "sig", secret: "sec" }), false);
  assert.equal(verifyWebhookSignature({ rawBody: "body", signature: "", secret: "sec" }), false);
  assert.equal(verifyWebhookSignature({ rawBody: "body", signature: "sig", secret: "" }), false);
});

test("Payment Calculations: Integer paise conversion maintains 100% precision", () => {
  const toPaise = (inr) => Math.round(inr * 100);
  const toINR = (paise) => paise / 100;

  // Typical Indian event budgets and pricing
  const testAmountsINR = [
    50000,       // 50k
    250000,      // 2.5L
    4500000,     // 45L
    12500000,    // 1.25 Cr
    4999.50,     // Decimal amount
    99999.99,    // Max precision decimal
  ];

  for (const inr of testAmountsINR) {
    const paise = toPaise(inr);
    assert.ok(Number.isInteger(paise), `Paise must be an integer: ${paise}`);
    assert.equal(toINR(paise), inr, `Round-trip conversion failed for ₹${inr}`);
  }
});

test("Payment Balance & Advance Rules: Advance percentage and remaining calculation", () => {
  const calculateAdvance = (totalPaise, percentage) => {
    assert.ok([25, 50, 100].includes(percentage), "Valid advance percentages are 25%, 50%, or 100%");
    return Math.round((totalPaise * percentage) / 100);
  };

  const totalPaise = 10000000; // ₹1,00,000

  // 25% advance
  const advance25 = calculateAdvance(totalPaise, 25);
  assert.equal(advance25, 2500000); // ₹25,000
  const remaining25 = totalPaise - advance25;
  assert.equal(remaining25, 7500000); // ₹75,000

  // 50% advance
  const advance50 = calculateAdvance(totalPaise, 50);
  assert.equal(advance50, 5000000); // ₹50,000

  // 100% full payment
  const advance100 = calculateAdvance(totalPaise, 100);
  assert.equal(advance100, 10000000); // ₹1,00,000
  assert.equal(totalPaise - advance100, 0);
});

test("Refund Safety: Refund cannot exceed total paid amount", () => {
  const paidAmountPaise = 5000000; // ₹50,000 paid
  let refundedSoFarPaise = 0;

  const validateRefund = (requestedRefundPaise) => {
    const remainingRefundable = paidAmountPaise - refundedSoFarPaise;
    if (requestedRefundPaise <= 0) return { valid: false, error: "Must be positive" };
    if (requestedRefundPaise > remainingRefundable) return { valid: false, error: "Exceeds balance" };
    return { valid: true, remainingAfter: remainingRefundable - requestedRefundPaise };
  };

  // Valid partial refund
  const refund1 = validateRefund(2000000); // ₹20,000
  assert.equal(refund1.valid, true);
  refundedSoFarPaise += 2000000;

  // Second partial refund
  const refund2 = validateRefund(3000000); // ₹30,000
  assert.equal(refund2.valid, true);
  refundedSoFarPaise += 3000000;

  // Excessive refund rejected
  const refund3 = validateRefund(100); // ₹1 over limit
  assert.equal(refund3.valid, false);
  assert.equal(refund3.error, "Exceeds balance");
});

