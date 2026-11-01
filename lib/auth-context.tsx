"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database, UserRole } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type VendorProfile = Database["public"]["Tables"]["vendor_profiles"]["Row"];

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  vendorProfile: VendorProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  vendorProfile: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (activeUser: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", activeUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        if (data.role === "vendor") {
          const { data: vp } = await supabase
            .from("vendor_profiles")
            .select("*")
            .eq("user_id", activeUser.id)
            .maybeSingle();
          setVendorProfile(vp ?? null);
        } else {
          setVendorProfile(null);
        }
      } else {
        setProfile(null);
        setVendorProfile(null);
      }
    } catch (err) {
      console.warn("Error fetching profile:", err);
      setProfile(null);
      setVendorProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial session load
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        if (!isMounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          await fetchProfile(initialSession.user);
        }
      })
      .catch((err) => {
        console.warn("Error loading initial session:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    // 2. Auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
        setVendorProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out exception:", err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setVendorProfile(null);
      // Clean up storage key cookie if needed
      if (typeof document !== "undefined") {
        document.cookie = `sb-evntora-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        vendorProfile,
        role: profile?.role ?? null,
        isLoading,
        isAuthenticated: Boolean(user),
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
