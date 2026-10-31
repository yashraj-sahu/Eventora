import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Server-only Razorpay instance.
 * Never import this file into client components or expose secrets.
 */
let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay API credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your server environment."
    );
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return razorpayInstance;
}

export interface CreateOrderParams {
  amountPaise: number; // in integer paise (e.g. 500000 for ₹5,000)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes = {},
}: CreateOrderParams) {
  const razorpay = getRazorpayClient();

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("Invalid order amount. Amount must be a positive integer in paise.");
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt,
    notes,
  });

  return order;
}

/**
 * Verifies Razorpay checkout payment signature using constant-time HMAC-SHA256 comparison.
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured on the server.");
  }

  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(payload)
    .digest("hex");

  try {
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature using the raw payload body.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  if (!signature || !secret || !rawBody) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    console.error("Webhook signature verification error:", err);
    return false;
  }
}

/**
 * Fetches verified payment details from Razorpay to guarantee current status.
 */
export async function fetchRazorpayPayment(paymentId: string) {
  const razorpay = getRazorpayClient();
  return await razorpay.payments.fetch(paymentId);
}

/**
 * Issues a refund for a captured payment.
 */
export async function processRazorpayRefund({
  paymentId,
  amountPaise,
  notes = {},
}: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}) {
  const razorpay = getRazorpayClient();
  const options: { amount?: number; notes?: Record<string, string> } = { notes };
  if (amountPaise) {
    options.amount = amountPaise;
  }
  return await razorpay.payments.refund(paymentId, options);
}

