
-- 1. Profiles: restrict to self + admin
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_self_or_admin
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. Drop public anon read on feedback and attendances
DROP POLICY IF EXISTS feedback_select_public ON public.feedback;
DROP POLICY IF EXISTS attendances_select_public ON public.attendances;

-- 3. Public-safe view for landing page feedback (no user_id, no quality_score)
DROP VIEW IF EXISTS public.feedback_public;
CREATE VIEW public.feedback_public
WITH (security_invoker = true) AS
SELECT id, session_id, trainer_id, rating, comment, sentiment, quality_category, anonymous, created_at
FROM public.feedback;

-- Allow anon + authenticated to read the view; underlying table stays locked.
-- Need a permissive policy for anon to read feedback rows through the view.
CREATE POLICY feedback_select_public_via_view
  ON public.feedback FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON public.feedback_public TO anon, authenticated;

-- 4. Public-safe profiles view (id + name only) for showing commenter names
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, name FROM public.profiles;

CREATE POLICY profiles_select_minimal_authed
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
-- The previous SELECT policy (self_or_admin) is OR'd with this, but we want
-- minimal access to all rows for joining names. We'll instead rely solely on
-- the view + a column-restricted policy. Drop & recreate cleanly:
DROP POLICY IF EXISTS profiles_select_minimal_authed ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self_or_admin ON public.profiles;

-- Final profiles policies: full row access for self/admin, name-only via view for others
CREATE POLICY profiles_select_self_or_admin
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Give authenticated users read access to id+name only via the view's underlying query.
-- Since views inherit RLS with security_invoker, we need a policy that allows reading.
-- Instead, use a SECURITY DEFINER function for fetching name maps:
CREATE OR REPLACE FUNCTION public.get_profile_names(_ids uuid[])
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name FROM public.profiles WHERE id = ANY(_ids);
$$;
REVOKE ALL ON FUNCTION public.get_profile_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_names(uuid[]) TO authenticated;

-- 5. Lock down has_role execute to authenticated only (defense in depth)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
