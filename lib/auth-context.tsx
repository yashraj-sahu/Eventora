"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database, UserRole } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type VendorProfile = Database["public"]["Tables"]["vendor_profiles"]["Row"];
interface AuthContextValue {
  user: User | null; session: Session | null; profile: Profile | null; vendorProfile: VendorProfile | null;
  role: UserRole | null; roles: UserRole[]; isLoading: boolean; profileError: boolean; rolesError: boolean;
  isAuthenticated: boolean; hasRole: (role: UserRole) => boolean; signOut: () => Promise<void>; refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue>({ user: null, session: null, profile: null, vendorProfile: null, role: null, roles: [], isLoading: true, profileError: false, rolesError: false, isAuthenticated: false, hasRole: () => false, signOut: async () => {}, refreshProfile: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [rolesError, setRolesError] = useState(false);
  const accountRequest = useRef(0);

  const loadAccount = useCallback(async (activeUser: User | null) => {
    const requestId = ++accountRequest.current;
    if (!activeUser) {
      setProfile(null); setVendorProfile(null); setRoles([]); setProfileError(false); setRolesError(false); return;
    }
    try {
      const [profileResult, rolesResult, vendorResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", activeUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", activeUser.id).eq("is_active", true),
        supabase.from("vendor_profiles").select("*").eq("user_id", activeUser.id).maybeSingle(),
      ]);
      if (requestId !== accountRequest.current) return;
      setProfile(profileResult.data ?? null); setProfileError(Boolean(profileResult.error));
      setRoles((rolesResult.data ?? []).map((r) => r.role)); setRolesError(Boolean(rolesResult.error));
      setVendorProfile(vendorResult.data ?? null);
    } catch {
      if (requestId === accountRequest.current) { setProfileError(true); setRolesError(true); }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let latestEvent = 0;
    const apply = async (next: Session | null) => {
      const event = ++latestEvent;
      if (!mounted) return;
      setSession(next); setUser(next?.user ?? null);
      try { await loadAccount(next?.user ?? null); } finally { if (mounted && event === latestEvent) setIsLoading(false); }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { void apply(next); });
    void supabase.auth.getSession().then(({ data }) => { if (mounted && latestEvent === 0) void apply(data.session); }).catch(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadAccount]);

  const refreshProfile = useCallback(async () => loadAccount(user), [user, loadAccount]);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null); setVendorProfile(null); setRoles([]); setProfileError(false); setRolesError(false);
  }, []);
  const hasRole = useCallback((role: UserRole) => roles.includes(role) || (role === "admin" && roles.includes("platform_owner")), [roles]);
  const role = hasRole("customer") ? "customer" : hasRole("vendor") ? "vendor" : hasRole("admin") ? "admin" : null;
  return <AuthContext.Provider value={{ user, session, profile, vendorProfile, role, roles, isLoading, profileError, rolesError, isAuthenticated: Boolean(user), hasRole, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
