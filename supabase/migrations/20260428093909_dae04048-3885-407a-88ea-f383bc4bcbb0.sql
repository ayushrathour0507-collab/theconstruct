-- Roles enum + table (separate from profiles for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Trainers
CREATE TABLE public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  session_date DATE NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  quality_score INT,
  quality_category TEXT,
  sentiment TEXT,
  keywords TEXT[],
  anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- AI session summary (one per session)
CREATE TABLE public.session_summary (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  summary TEXT,
  key_points TEXT[],
  sentiment TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_summary ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Roles policies
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trainers policies
CREATE POLICY "trainers_select_authenticated" ON public.trainers FOR SELECT TO authenticated USING (true);
CREATE POLICY "trainers_admin_write" ON public.trainers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sessions policies
CREATE POLICY "sessions_select_authenticated" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_admin_write" ON public.sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Feedback policies
CREATE POLICY "feedback_select_authenticated" ON public.feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_insert_own" ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_update_own_or_admin" ON public.feedback FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "feedback_delete_admin" ON public.feedback FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Session summary policies
CREATE POLICY "summary_select_authenticated" ON public.session_summary FOR SELECT TO authenticated USING (true);
CREATE POLICY "summary_admin_write" ON public.session_summary FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-fill month/year from session_date
CREATE OR REPLACE FUNCTION public.sessions_set_month_year()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.month := EXTRACT(MONTH FROM NEW.session_date)::INT;
  NEW.year := EXTRACT(YEAR FROM NEW.session_date)::INT;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sessions_month_year
BEFORE INSERT OR UPDATE OF session_date ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.sessions_set_month_year();

-- New user trigger: profile + default role; first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_summary;