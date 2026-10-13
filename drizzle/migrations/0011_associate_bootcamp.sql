ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'educator';

CREATE OR REPLACE FUNCTION public.is_bootcamp_educator() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.sanctuary_session_valid() AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('educator','admin'))
$$;

CREATE TABLE public.bootcamp_lesson_edits (
  lesson_id text PRIMARY KEY,
  content jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bootcamp_lesson_edits TO authenticated;
GRANT ALL ON public.bootcamp_lesson_edits TO service_role;
ALTER TABLE public.bootcamp_lesson_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees read lessons" ON public.bootcamp_lesson_edits FOR SELECT TO authenticated USING (public.is_sanctuary_employee());
CREATE POLICY "educators add lessons" ON public.bootcamp_lesson_edits FOR INSERT TO authenticated WITH CHECK (public.is_bootcamp_educator());
CREATE POLICY "educators edit lessons" ON public.bootcamp_lesson_edits FOR UPDATE TO authenticated USING (public.is_bootcamp_educator()) WITH CHECK (public.is_bootcamp_educator());

CREATE TABLE public.bootcamp_progress (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  costylist_id uuid NOT NULL,
  skill text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','demonstrated','practicing','ready','approved')),
  educator_id uuid,
  assessment_date date,
  notes text,
  timing_observed text,
  practice_assignment text,
  signed_off_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (costylist_id, skill)
);
GRANT SELECT, INSERT, UPDATE ON public.bootcamp_progress TO authenticated;
GRANT ALL ON public.bootcamp_progress TO service_role;
ALTER TABLE public.bootcamp_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or educator" ON public.bootcamp_progress FOR SELECT TO authenticated USING ((costylist_id = auth.uid() AND public.is_sanctuary_employee()) OR public.is_bootcamp_educator());
CREATE POLICY "educators add progress" ON public.bootcamp_progress FOR INSERT TO authenticated WITH CHECK (public.is_bootcamp_educator() AND educator_id = auth.uid());
CREATE POLICY "educators edit progress" ON public.bootcamp_progress FOR UPDATE TO authenticated USING (public.is_bootcamp_educator()) WITH CHECK (public.is_bootcamp_educator() AND educator_id = auth.uid());

CREATE TABLE public.bootcamp_practice (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  costylist_id uuid NOT NULL,
  educator_id uuid NOT NULL,
  assigned_service text NOT NULL,
  stylist_instructions text,
  application_time text,
  processing_time text,
  finishing_time text,
  result text,
  feedback text,
  next_assignment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bootcamp_practice TO authenticated;
GRANT ALL ON public.bootcamp_practice TO service_role;
ALTER TABLE public.bootcamp_practice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or educator practice" ON public.bootcamp_practice FOR SELECT TO authenticated USING ((costylist_id = auth.uid() AND public.is_sanctuary_employee()) OR public.is_bootcamp_educator());
CREATE POLICY "educators add practice" ON public.bootcamp_practice FOR INSERT TO authenticated WITH CHECK (public.is_bootcamp_educator() AND educator_id = auth.uid());

CREATE OR REPLACE FUNCTION public.list_bootcamp_roster() RETURNS TABLE(user_id uuid, display_name text, educator boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, EXISTS (SELECT 1 FROM public.user_roles r2 WHERE r2.user_id = p.id AND r2.role::text = 'educator')
  FROM public.profiles p
  WHERE public.is_bootcamp_educator()
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role::text IN ('employee','admin'))
    AND NOT EXISTS (SELECT 1 FROM public.employee_access_revocations v WHERE v.user_id = p.id)
  ORDER BY p.display_name
$$;

CREATE OR REPLACE FUNCTION public.set_bootcamp_educator(target_user_id uuid, make_educator boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_sanctuary_owner() THEN RAISE EXCEPTION 'Owner access is required.'; END IF;
  IF make_educator THEN
    INSERT INTO public.user_roles(user_id, role) SELECT target_user_id, 'educator'::text::public.app_role
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role::text = 'educator');
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role::text = 'educator';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_bootcamp_educator(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_bootcamp_educator(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_bootcamp_roster() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bootcamp_educator() TO authenticated;