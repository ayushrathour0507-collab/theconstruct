CREATE POLICY "sessions_select_public" ON public.sessions FOR SELECT TO anon USING (true);
CREATE POLICY "trainers_select_public" ON public.trainers FOR SELECT TO anon USING (true);
CREATE POLICY "feedback_select_public" ON public.feedback FOR SELECT TO anon USING (true);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS clickup_task_id text UNIQUE;