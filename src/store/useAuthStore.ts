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
    role: row.role as UserRole,
    status: row.status as UserStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return dbToProfile(data);
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
    // Resolve current session synchronously
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const profile = await fetchProfile(session.user.id);
      set({ session, profile, loading: false });
    } else {
      set({ loading: false });
    }

    // Subscribe to future auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // User clicked a reset link — show the reset-password form
        set({ session, recoveryMode: true, loading: false });
        return;
      }

      if (session) {
        const profile = await fetchProfile(session.user.id);
        set({ session, profile, loading: false, recoveryMode: false });
      } else {
        set({ session: null, profile: null, loading: false, recoveryMode: false });
      }
    });

    return () => subscription.unsubscribe();
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
