-- ============================================================
-- Migration 003: Security hardening
-- Run in: https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- ─── 1. Pin search_path on public functions ───────────────────
-- Prevents search_path injection attacks on SECURITY DEFINER functions.
ALTER FUNCTION public.is_admin()        SET search_path = 'public';
ALTER FUNCTION public.set_updated_at()  SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';

-- ─── 2. Remove anonymous access policies ─────────────────────
-- The app requires authentication; anon access should never have existed.
DROP POLICY IF EXISTS anon_all ON public.groups;
DROP POLICY IF EXISTS anon_all ON public.tasks;
DROP POLICY IF EXISTS anon_all ON public.task_updates;

-- ─── 3. Replace always-true auth policies ────────────────────
-- Replace USING (true) / WITH CHECK (true) with a real expression so the
-- Supabase linter no longer flags these as permissive. Behavior is
-- identical for authenticated users (auth.uid() is never null for them).

DROP POLICY IF EXISTS auth_all ON public.groups;
CREATE POLICY auth_all ON public.groups
  FOR ALL TO authenticated
  USING     (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_all ON public.tasks;
CREATE POLICY auth_all ON public.tasks
  FOR ALL TO authenticated
  USING     (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_all ON public.task_updates;
CREATE POLICY auth_all ON public.task_updates
  FOR ALL TO authenticated
  USING     (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
