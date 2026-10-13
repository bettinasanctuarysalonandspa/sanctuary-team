CREATE TABLE public.cj_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pass_percent integer NOT NULL DEFAULT 90 CHECK (pass_percent BETWEEN 1 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cj_settings (id) VALUES (1);
GRANT SELECT, UPDATE ON public.cj_settings TO authenticated;
GRANT ALL ON public.cj_settings TO service_role;
ALTER TABLE public.cj_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees read cj settings" ON public.cj_settings FOR SELECT TO authenticated USING (public.is_sanctuary_employee());
CREATE POLICY "owner updates cj settings" ON public.cj_settings FOR UPDATE TO authenticated USING (public.is_sanctuary_owner()) WITH CHECK (public.is_sanctuary_owner());

CREATE TABLE public.cj_assignments (
  user_id uuid PRIMARY KEY,
  educator_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cj_assignments TO authenticated;
GRANT ALL ON public.cj_assignments TO service_role;
ALTER TABLE public.cj_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read cj assignments" ON public.cj_assignments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bootcamp_educator() OR public.is_sanctuary_owner());
CREATE POLICY "owner manages cj assignments" ON public.cj_assignments FOR ALL TO authenticated USING (public.is_sanctuary_owner()) WITH CHECK (public.is_sanctuary_owner());

CREATE TABLE public.cj_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  stylist_name text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('bootcamp','advancement')),
  current_level text NOT NULL,
  proposed_level text,
  version text NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  percent integer NOT NULL,
  pass_percent integer NOT NULL,
  passed boolean NOT NULL,
  missed jsonb NOT NULL DEFAULT '[]'::jsonb,
  educator_id uuid,
  educator_followup text,
  followup_by uuid,
  followup_at timestamptz,
  owner_seen_at timestamptz,
  used_for_promotion_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cj_attempts_user_idx ON public.cj_attempts (user_id, created_at DESC);
GRANT SELECT ON public.cj_attempts TO authenticated;
GRANT ALL ON public.cj_attempts TO service_role;
ALTER TABLE public.cj_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read cj attempts" ON public.cj_attempts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bootcamp_educator() OR public.is_sanctuary_owner());

CREATE OR REPLACE FUNCTION public.cj_followup(attempt_id bigint, note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_bootcamp_educator() OR public.is_sanctuary_owner()) THEN RAISE EXCEPTION 'Educator access is required.'; END IF;
  UPDATE public.cj_attempts SET educator_followup = left(note, 4000), followup_by = auth.uid(), followup_at = now(),
    owner_seen_at = CASE WHEN public.is_sanctuary_owner() THEN now() ELSE owner_seen_at END
  WHERE id = attempt_id;
END $$;

CREATE OR REPLACE FUNCTION public.cj_mark_seen()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_sanctuary_owner() THEN RAISE EXCEPTION 'Owner access is required.'; END IF;
  UPDATE public.cj_attempts SET owner_seen_at = now() WHERE owner_seen_at IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.cj_level_rank(_level text) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT array_position(ARRAY['Associate','New Stylist','Designer 1','Designer 2','Advanced 1','Advanced 2','Master 1','Master 2','Legacy'], _level)
$$;

CREATE OR REPLACE FUNCTION public.calc_guard_level_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.level IS DISTINCT FROM OLD.level AND coalesce(current_setting('sanctuary.level_change', true), '') NOT IN ('promotion','correction') THEN
    RAISE EXCEPTION 'Use Promote or Correct level to change a stylist level.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER calc_stylists_guard_level BEFORE UPDATE ON public.calc_stylists FOR EACH ROW EXECUTE FUNCTION public.calc_guard_level_change();

CREATE OR REPLACE FUNCTION public.correct_stylist_level(stylist_id bigint, new_level text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_sanctuary_owner() THEN RAISE EXCEPTION 'Owner access is required.'; END IF;
  PERFORM set_config('sanctuary.level_change', 'correction', true);
  UPDATE public.calc_stylists SET level = new_level, updated_at = now() WHERE id = stylist_id;
  PERFORM set_config('sanctuary.level_change', '', true);
END $$;

CREATE OR REPLACE FUNCTION public.promote_stylist(stylist_id bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; nxt text; a record;
BEGIN
  IF NOT public.is_sanctuary_owner() THEN RAISE EXCEPTION 'Owner access is required.'; END IF;
  SELECT * INTO s FROM public.calc_stylists WHERE id = stylist_id FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Stylist not found.'; END IF;
  IF s.user_id IS NULL THEN RAISE EXCEPTION 'This stylist is not linked to a team account, so no test result can be checked.'; END IF;
  nxt := (ARRAY['Associate','New Stylist','Designer 1','Designer 2','Advanced 1','Advanced 2','Master 1','Master 2','Legacy'])[public.cj_level_rank(s.level) + 1];
  IF nxt IS NULL THEN RAISE EXCEPTION 'Legacy is the highest level.'; END IF;
  SELECT * INTO a FROM public.cj_attempts WHERE user_id = s.user_id AND purpose = 'advancement' AND current_level = s.level AND proposed_level = nxt
    AND passed AND used_for_promotion_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF a IS NULL THEN RAISE EXCEPTION 'A fresh passing Client Journey test for % → % is required first.', s.level, nxt; END IF;
  UPDATE public.cj_attempts SET used_for_promotion_at = now() WHERE id = a.id;
  PERFORM set_config('sanctuary.level_change', 'promotion', true);
  UPDATE public.calc_stylists SET level = nxt, updated_at = now() WHERE id = stylist_id;
  PERFORM set_config('sanctuary.level_change', '', true);
  RETURN nxt;
END $$;

CREATE OR REPLACE FUNCTION public.promote_associate(target_user_id uuid, stylist_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  IF NOT public.is_sanctuary_owner() THEN RAISE EXCEPTION 'Owner access is required.'; END IF;
  IF EXISTS (SELECT 1 FROM public.calc_stylists WHERE user_id = target_user_id) THEN RAISE EXCEPTION 'This person already has a stylist level.'; END IF;
  SELECT * INTO a FROM public.cj_attempts WHERE user_id = target_user_id AND purpose = 'advancement' AND current_level = 'Associate' AND proposed_level = 'New Stylist'
    AND passed AND used_for_promotion_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF a IS NULL THEN RAISE EXCEPTION 'A fresh passing Client Journey test for Associate → New Stylist is required first.'; END IF;
  UPDATE public.cj_attempts SET used_for_promotion_at = now() WHERE id = a.id;
  INSERT INTO public.calc_stylists (name, level, user_id) VALUES (left(trim(stylist_name), 120), 'New Stylist', target_user_id);
END $$;

REVOKE EXECUTE ON FUNCTION public.cj_followup(bigint, text), public.cj_mark_seen(), public.correct_stylist_level(bigint, text), public.promote_stylist(bigint), public.promote_associate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cj_followup(bigint, text), public.cj_mark_seen(), public.correct_stylist_level(bigint, text), public.promote_stylist(bigint), public.promote_associate(uuid, text) TO authenticated;