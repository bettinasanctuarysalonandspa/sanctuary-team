CREATE TABLE public.bootcamp_reflections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  learned text NOT NULL,
  question text,
  educator_reply text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bootcamp_reflections TO authenticated;
GRANT ALL ON public.bootcamp_reflections TO service_role;
ALTER TABLE public.bootcamp_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or educator reflections" ON public.bootcamp_reflections FOR SELECT TO authenticated USING ((user_id = auth.uid() AND public.is_sanctuary_employee()) OR public.is_bootcamp_educator());
CREATE POLICY "add own reflection" ON public.bootcamp_reflections FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_sanctuary_employee() AND educator_reply IS NULL);
CREATE POLICY "educators reply" ON public.bootcamp_reflections FOR UPDATE TO authenticated USING (public.is_bootcamp_educator()) WITH CHECK (public.is_bootcamp_educator());