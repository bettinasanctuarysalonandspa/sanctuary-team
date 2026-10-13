CREATE TABLE public.specialty_signoff_restrictions (
  educator_id uuid NOT NULL,
  track text NOT NULL,
  PRIMARY KEY (educator_id, track)
);
GRANT SELECT ON public.specialty_signoff_restrictions TO authenticated;
GRANT ALL ON public.specialty_signoff_restrictions TO service_role;
ALTER TABLE public.specialty_signoff_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "educators read restrictions" ON public.specialty_signoff_restrictions FOR SELECT TO authenticated USING (public.is_bootcamp_educator());

CREATE OR REPLACE FUNCTION public.can_sign_specialty(_track text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_bootcamp_educator() AND NOT EXISTS (SELECT 1 FROM public.specialty_signoff_restrictions WHERE educator_id = auth.uid() AND track = _track)
$$;

CREATE TABLE public.specialty_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  costylist_id uuid NOT NULL,
  track text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('mannequin','model','final')),
  approved boolean NOT NULL DEFAULT false,
  service text,
  technique text,
  result text,
  feedback text,
  next_assignment text,
  educator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.specialty_entries TO authenticated;
GRANT ALL ON public.specialty_entries TO service_role;
ALTER TABLE public.specialty_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or educator" ON public.specialty_entries FOR SELECT TO authenticated USING ((costylist_id = auth.uid() AND public.is_sanctuary_employee()) OR public.is_bootcamp_educator());
CREATE POLICY "authorized educators record" ON public.specialty_entries FOR INSERT TO authenticated WITH CHECK (educator_id = auth.uid() AND public.can_sign_specialty(track));