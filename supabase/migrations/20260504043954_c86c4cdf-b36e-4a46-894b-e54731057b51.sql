
GRANT SELECT (id, name) ON public.profiles TO authenticated;
CREATE POLICY profiles_authed_name_read
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
