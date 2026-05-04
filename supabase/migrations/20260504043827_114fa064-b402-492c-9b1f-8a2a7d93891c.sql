
-- Remove the policy that re-exposed feedback to anon
DROP POLICY IF EXISTS feedback_select_public_via_view ON public.feedback;

-- Recreate the public feedback view as SECURITY DEFINER (bypasses RLS via owner = postgres)
DROP VIEW IF EXISTS public.feedback_public;
CREATE VIEW public.feedback_public AS
SELECT id, session_id, trainer_id, rating, comment, sentiment, quality_category, anonymous, created_at
FROM public.feedback;
GRANT SELECT ON public.feedback_public TO anon, authenticated;

-- Public-safe profiles view (id + name only)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT id, name FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Lock down get_profile_names: only authenticated may execute
REVOKE EXECUTE ON FUNCTION public.get_profile_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_names(uuid[]) TO authenticated;

-- Re-tighten has_role: only authenticated callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
