import type { UserRole } from "@/types/database";

export type PortalIntent = Exclude<UserRole, "platform_owner">;

export const WORKSPACE_COOKIE = "evntora_workspace";

export function authorizedWorkspaces(roles: UserRole[]): PortalIntent[] {
  const workspaces: PortalIntent[] = [];
  if (roles.includes("customer")) workspaces.push("customer");
  if (roles.includes("vendor")) workspaces.push("vendor");
  if (roles.includes("admin") || roles.includes("platform_owner")) workspaces.push("admin");
  return workspaces;
}

export function workspacePath(role: PortalIntent, vendorApproved = false): string {
  return portalHome(role, vendorApproved);
}

export function workspaceForPath(pathname: string): PortalIntent | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/vendor-portal" || pathname.startsWith("/vendor-portal/")) return "vendor";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/checkout" || pathname.startsWith("/checkout/")) return "customer";
  return null;
}

export function rememberWorkspace(role: PortalIntent, userId?: string): void {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${WORKSPACE_COOKIE}=${role}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  if (userId) {
    try { window.localStorage.setItem(`evntora:last-workspace:${userId}`, role); } catch { /* storage may be unavailable */ }
  }
}

export function rememberedWorkspace(roles: UserRole[], userId?: string): PortalIntent | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const value = window.localStorage.getItem(`evntora:last-workspace:${userId}`);
    return (value === "customer" || value === "vendor" || value === "admin") && authorizedWorkspaces(roles).includes(value) ? value : null;
  } catch { return null; }
}

export function portalForPath(pathname: string): PortalIntent {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/vendor-portal")) return "vendor";
  return "customer";
}

export function portalHome(role: UserRole, vendorApproved = false): string {
  if (role === "admin" || role === "platform_owner") return "/admin";
  if (role === "vendor") return "/vendor-portal";
  return "/dashboard";
}
