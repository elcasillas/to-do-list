-- ============================================================
-- Migration 004: RLS performance fixes
-- Run in: https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- ─── 1. profiles UPDATE — merge two permissive policies into one ──────────────
-- Fixes: auth_rls_initplan (auth.uid() called per-row)
-- Fixes: multiple_permissive_policies (profiles_update_own + profiles_update_admin)
-- The merged policy allows a user to update their own row OR any admin to update anyone.
-- (select auth.uid()) evaluates once per query, not per row.

DROP POLICY IF EXISTS profiles_update_own   ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING     ((select auth.uid()) = id OR public.is_admin())
  WITH CHECK ((select auth.uid()) = id OR public.is_admin());

-- ─── 2. pending_invites — eliminate SELECT overlap ───────────────────────────
-- Fixes: multiple_permissive_policies (invites_select + invites_admin both fire for SELECT)
-- Solution: keep invites_select for reads, replace invites_admin (FOR ALL) with
-- explicit INSERT and DELETE policies scoped to admins only.

DROP POLICY IF EXISTS invites_admin  ON public.pending_invites;

CREATE POLICY invites_insert_admin ON public.pending_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY invites_delete_admin ON public.pending_invites
  FOR DELETE TO authenticated
  USING (public.is_admin());
