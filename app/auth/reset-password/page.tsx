import { redirect } from "next/navigation";

// Legacy Supabase recovery links must use the new one-time-code screen.
export default function LegacyResetPasswordPage() {
  redirect("/auth/forgot-password");
}
