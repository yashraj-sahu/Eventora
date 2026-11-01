import type { UserRole } from "@/types/database";

export type PortalIntent = UserRole;

export function portalForPath(pathname: string): PortalIntent {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/vendor-portal")) return "vendor";
  return "customer";
}

export function portalHome(role: UserRole, vendorApproved = false): string {
  if (role === "admin") return "/admin";
  if (role === "vendor") return vendorApproved ? "/vendor-portal" : "/vendor-portal/pending";
  return "/dashboard";
}
