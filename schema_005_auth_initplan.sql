-- ============================================================
-- Migration 005: Fix auth_rls_initplan on auth_all policies
-- Run in: https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- Wrapping auth.uid() in (select ...) makes it evaluate once per query
-- instead of once per row, which is a significant performance improvement
-- on large tables.

DROP POLICY IF EXISTS auth_all ON public.groups;
CREATE POLICY auth_all ON public.groups
  FOR ALL TO authenticated
  USING     ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS auth_all ON public.tasks;
CREATE POLICY auth_all ON public.tasks
  FOR ALL TO authenticated
  USING     ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS auth_all ON public.task_updates;
CREATE POLICY auth_all ON public.task_updates
  FOR ALL TO authenticated
  USING     ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);
