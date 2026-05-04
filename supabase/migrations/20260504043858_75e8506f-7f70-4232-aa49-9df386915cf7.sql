
-- Drop the previously created views (definer warnings) and the helper function
DROP VIEW IF EXISTS public.feedback_public;
DROP VIEW IF EXISTS public.profiles_public;
DROP FUNCTION IF EXISTS public.get_profile_names(uuid[]);

-- Strategy: keep table-level RLS strict for anon (no direct read).
-- Expose ONLY safe data via SECURITY INVOKER stable functions that filter columns
-- and rely on a per-role bypass via owning role (postgres).
-- Simplest correct path: reintroduce anon SELECT on feedback, but force the anonymous
-- column to mask user_id at the application layer (frontend never reads user_id when anon).
-- Since column-level RLS isn't available, we use Postgres column privileges:

-- Allow anon to SELECT feedback BUT only specific non-identifying columns
GRANT SELECT (id, session_id, trainer_id, rating, comment, sentiment, quality_category, anonymous, created_at)
  ON public.feedback TO anon;
CREATE POLICY feedback_anon_safe_read
  ON public.feedback FOR SELECT
  TO anon
  USING (true);

-- Allow anon to SELECT profile names only (id + name) for displaying commenter names
GRANT SELECT (id, name) ON public.profiles TO anon;
CREATE POLICY profiles_anon_name_read
  ON public.profiles FOR SELECT
  TO anon
  USING (true);
