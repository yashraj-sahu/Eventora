export type CheckoutPaymentPurpose = "advance" | "remaining" | "full" | "partial";

export function minimumPartialPaymentPaise(advancePaise: number, alreadyPaidPaise: number): number {
  if (!Number.isSafeInteger(advancePaise) || advancePaise < 0
    || !Number.isSafeInteger(alreadyPaidPaise) || alreadyPaidPaise < 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  // A customer may pay any installment from ₹1 when the vendor permits
  // partial payments. Booking confirmation still waits until captured funds
  // satisfy the agreed advance amount.
  return 100;
}

export function isValidCheckoutPaymentAmountPaise(
  amountPaise: number,
  remainingPaise: number,
  purpose: CheckoutPaymentPurpose,
  _allowPartialPayments: boolean,
  minimumPartialPaise: number,
): boolean {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0
    || !Number.isSafeInteger(remainingPaise) || remainingPaise < 0
    || amountPaise > remainingPaise) return false;
  return purpose !== "partial"
    || (Number.isSafeInteger(minimumPartialPaise) && amountPaise >= minimumPartialPaise);
}
