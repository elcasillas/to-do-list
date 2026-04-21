import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { dbUpdateProfile } from "../lib/db";
import type { UserProfile, UserRole, UserStatus } from "../types";

function dbToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    fullName: (row.full_name as string) || "",
    email: row.email as string,
    avatarUrl: (row.avatar_url as string) || null,
    color: (row.color as string) || "#3b82f6",
    role: row.role as UserRole,
    status: row.status as UserStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const fetchTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("fetchProfile timeout")), 8_000)
    );
    const { data, error } = await Promise.race([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      fetchTimeout,
    ]);
    if (error || !data) return null;
    return dbToProfile(data);
  } catch {
    return null;
  }
}

interface AuthStore {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  /** True when a password-recovery link has been opened — show reset form. */
  recoveryMode: boolean;

  /**
   * Call once on app mount. Returns an unsubscribe function.
   * Resolves only after initial auth state is known.
   */
  initialize: () => Promise<() => void>;

  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Sends a password reset email; returns error message or null. */
  sendPasswordReset: (email: string) => Promise<string | null>;
  /** Updates password while in recovery mode; returns error message or null. */
  updatePassword: (password: string) => Promise<string | null>;
  /** Reload profile from DB (e.g. after an admin changes your role). */
  refreshProfile: () => Promise<void>;
  /**
   * Confirms the session is alive, attempting a token refresh if needed.
   * Returns true if valid, false if expired (also signs out in that case).
   */
  ensureSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  recoveryMode: false,

  initialize: async () => {
    // ── 1. Resolve initial session ────────────────────────────
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    if (initialSession) {
      const profile = await fetchProfile(initialSession.user.id);
      set({ session: initialSession, profile, loading: false });
    } else {
      set({ loading: false });
    }

    // ── 2. Subscribe to future auth events ───────────────────
    // Key invariant: when a valid session arrives (TOKEN_REFRESHED, SIGNED_IN,
    // etc.) we update the session object immediately so API calls keep working,
    // then fetch the profile in the background.  We do NOT overwrite an
    // existing profile with null — a fetchProfile timeout must not make the UI
    // look like the user is logged out when the session is still valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === "PASSWORD_RECOVERY") {
          set({ session: newSession, recoveryMode: true, loading: false });
          return;
        }

        if (newSession) {
          // Persist the fresh session token immediately
          set({ session: newSession, loading: false, recoveryMode: false });
          // Refresh profile in the background; keep existing profile on failure
          const profile = await fetchProfile(newSession.user.id);
          if (profile) set({ profile });
        } else {
          // Genuine sign-out (user action or expired refresh token)
          set({ session: null, profile: null, loading: false, recoveryMode: false });
        }
      }
    );

    // ── 3. Re-sync on tab visibility ──────────────────────────
    // Supabase can fire a spurious SIGNED_OUT when the background token-refresh
    // request fails due to a network hiccup, clearing the store session even
    // though the session is still in localStorage.  When the tab regains focus
    // we check storage and restore state if the session is still there.
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      const { data: { session } } = await supabase.auth.getSession();
      const { session: storeSession } = get();

      if (session && !storeSession) {
        // Session survived in storage but the store was incorrectly cleared
        const profile = await fetchProfile(session.user.id);
        set({ session, profile: profile ?? get().profile, loading: false, recoveryMode: false });
      } else if (!session && storeSession) {
        // Storage confirms no session — clear any stale store state
        set({ session: null, profile: null, loading: false });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Passed to raw_user_meta_data so the DB trigger can pick it up
        data: { full_name: fullName.trim() },
      },
    });
    return error?.message ?? null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  sendPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error?.message ?? null;
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    set({ recoveryMode: false });
    return null;
  },

  refreshProfile: async () => {
    const { session } = get();
    if (!session) return;
    const profile = await fetchProfile(session.user.id);
    if (profile) set({ profile });
  },

  ensureSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;
    // Token may be expired — attempt a silent refresh
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (refreshed) return true;
    // Refresh token is also dead — sign out cleanly
    await get().signOut();
    return false;
  },
}));

// ── Convenience selectors ─────────────────────────────────────

export function isAdmin(profile: UserProfile | null): boolean {
  return profile?.role === "admin";
}

export function isAtLeastManager(profile: UserProfile | null): boolean {
  return profile?.role === "admin" || profile?.role === "manager";
}

// Update own profile fields (name/avatar) — does not touch role/status
export async function updateOwnProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "fullName" | "avatarUrl">>
): Promise<string | null> {
  try {
    await dbUpdateProfile(userId, updates);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Update failed";
  }
}
