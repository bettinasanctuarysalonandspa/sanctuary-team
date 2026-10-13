CREATE TABLE public.associate_daily_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  shift_date date NOT NULL,
  standards jsonb NOT NULL DEFAULT '[]',
  practiced text,
  learned text,
  improve text,
  better_tomorrow text,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.associate_daily_logs TO authenticated;
GRANT ALL ON public.associate_daily_logs TO service_role;
ALTER TABLE public.associate_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own daily log" ON public.associate_daily_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "read own daily log" ON public.associate_daily_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "educators read daily logs" ON public.associate_daily_logs FOR SELECT TO authenticated USING (public.is_bootcamp_educator());