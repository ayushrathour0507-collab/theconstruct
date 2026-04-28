CREATE OR REPLACE FUNCTION public.sessions_set_month_year()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.month := EXTRACT(MONTH FROM NEW.session_date)::INT;
  NEW.year := EXTRACT(YEAR FROM NEW.session_date)::INT;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sessions_set_month_year() FROM PUBLIC, anon, authenticated;