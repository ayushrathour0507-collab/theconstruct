-- Series table
CREATE TABLE public.series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  clickup_parent_task_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE POLICY series_select_public ON public.series FOR SELECT TO anon USING (true);
CREATE POLICY series_select_auth ON public.series FOR SELECT TO authenticated USING (true);
CREATE POLICY series_admin_write ON public.series FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Link sessions to a series
ALTER TABLE public.sessions ADD COLUMN series_id UUID REFERENCES public.series(id) ON DELETE SET NULL;
CREATE INDEX idx_sessions_series_id ON public.sessions(series_id);

-- Attendances
CREATE TABLE public.attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendances_select_public ON public.attendances FOR SELECT TO anon USING (true);
CREATE POLICY attendances_select_auth ON public.attendances FOR SELECT TO authenticated USING (true);
CREATE POLICY attendances_insert_own ON public.attendances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY attendances_delete_own ON public.attendances FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_attendances_session_id ON public.attendances(session_id);