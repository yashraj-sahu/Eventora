/** Normalize an international phone number to E.164 without guessing a country. */
export function normalizePhoneNumber(value: string): string | null {
  const input = value.trim();
  if (!input || input.length > 40 || !/^\+?[0-9 ()-]+$/.test(input)) return null;
  const international = input.startsWith("00") ? `+${input.slice(2)}` : input;
  const digits = international.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  if (international.startsWith("+")) {
    if (digits.startsWith("91") && !/^91[6-9][0-9]{9}$/.test(digits)) return null;
    return `+${digits}`;
  }
  return null;
}
