CREATE TABLE public.proof_viewers (user_id uuid PRIMARY KEY, granted_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.proof_viewers TO authenticated;
GRANT ALL ON public.proof_viewers TO service_role;
ALTER TABLE public.proof_viewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads viewers" ON public.proof_viewers FOR SELECT TO authenticated USING (public.is_sanctuary_owner());

CREATE OR REPLACE FUNCTION public.can_view_proof() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.sanctuary_session_valid() AND (public.is_sanctuary_owner() OR (public.has_role(auth.uid(),'educator') AND EXISTS (SELECT 1 FROM public.proof_viewers WHERE user_id = auth.uid())))
$$;

CREATE OR REPLACE FUNCTION public.set_proof_viewer(target_user_id uuid, allow boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_sanctuary_owner() THEN RAISE EXCEPTION 'Owner only'; END IF;
  IF allow THEN INSERT INTO public.proof_viewers(user_id) VALUES (target_user_id) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.proof_viewers WHERE user_id = target_user_id; END IF;
END $$;

CREATE TABLE public.specialty_proof (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  costylist_id uuid NOT NULL,
  track text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('mannequin','model')),
  note text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','not_approved')),
  reviewer_id uuid,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.specialty_proof TO authenticated;
GRANT ALL ON public.specialty_proof TO service_role;
ALTER TABLE public.specialty_proof ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submit own proof" ON public.specialty_proof FOR INSERT TO authenticated
  WITH CHECK (costylist_id = auth.uid() AND status = 'pending' AND reviewer_id IS NULL AND public.sanctuary_session_valid() AND public.is_sanctuary_employee());
CREATE POLICY "read own or permitted proof" ON public.specialty_proof FOR SELECT TO authenticated
  USING (public.sanctuary_session_valid() AND (costylist_id = auth.uid() OR public.can_view_proof()));

CREATE OR REPLACE FUNCTION public.review_specialty_proof(proof_id bigint, approve boolean, note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.specialty_proof;
BEGIN
  SELECT * INTO p FROM public.specialty_proof WHERE id = proof_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF NOT public.can_view_proof() OR NOT public.can_sign_specialty(p.track) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  UPDATE public.specialty_proof SET status = CASE WHEN approve THEN 'approved' ELSE 'not_approved' END, reviewer_id = auth.uid(), reviewer_note = note, reviewed_at = now() WHERE id = proof_id;
  IF approve THEN
    INSERT INTO public.specialty_entries(costylist_id, track, stage, approved, result, feedback, educator_id)
    VALUES (p.costylist_id, p.track, p.stage, true, 'Approved from submitted photos/videos', note, auth.uid());
  END IF;
END $$;

CREATE POLICY "proof upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'growth-proof' AND (storage.foldername(name))[1] = auth.uid()::text AND public.is_sanctuary_employee());
CREATE POLICY "proof read own or permitted" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'growth-proof' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_view_proof()));