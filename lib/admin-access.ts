import { getAuthenticatedUser } from "@/lib/supabase-server";

export type AdminPermission =
  | "vendor_read" | "vendor_verification" | "listing_moderation"
  | "user_read" | "user_manage" | "booking_support" | "support_read"
  | "finance_read" | "refund_issue" | "analytics_finance"
  | "admin_message";

export async function requireAdminPermission(permission: AdminPermission, request?: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || auth.error) return { ok: false as const, status: 401, error: "Sign in required." };
  const { data: allowed, error } = await auth.supabase.rpc("has_admin_permission", { p_permission: permission });
  if (error) return { ok: false as const, status: 503, error: "Administrator permissions could not be verified." };
  if (!allowed) return { ok: false as const, status: 403, error: "You do not have permission to perform this action." };
  return { ok: true as const, user: auth.user, supabase: auth.supabase };
}
