CREATE TABLE public.level_changers (user_id uuid PRIMARY KEY, granted_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.level_changers TO authenticated;
GRANT ALL ON public.level_changers TO service_role;
ALTER TABLE public.level_changers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own row readable" ON public.level_changers FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_sanctuary_owner());

CREATE OR REPLACE FUNCTION public.can_change_levels() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_sanctuary_owner() OR (public.is_sanctuary_employee() AND EXISTS (SELECT 1 FROM public.level_changers WHERE user_id = auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.correct_stylist_level(stylist_id bigint, new_level text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_change_levels() THEN RAISE EXCEPTION 'Level change access is required.'; END IF;
  PERFORM set_config('sanctuary.level_change', 'correction', true);
  UPDATE public.calc_stylists SET level = new_level, updated_at = now() WHERE id = stylist_id;
  PERFORM set_config('sanctuary.level_change', '', true);
END $function$;

CREATE OR REPLACE FUNCTION public.promote_associate(target_user_id uuid, stylist_name text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a record;
BEGIN
  IF NOT public.can_change_levels() THEN RAISE EXCEPTION 'Level change access is required.'; END IF;
  IF EXISTS (SELECT 1 FROM public.calc_stylists WHERE user_id = target_user_id) THEN RAISE EXCEPTION 'This person already has a stylist level.'; END IF;
  SELECT * INTO a FROM public.cj_attempts WHERE user_id = target_user_id AND purpose = 'advancement' AND current_level = 'Associate' AND proposed_level = 'New Stylist'
    AND passed AND used_for_promotion_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF a IS NULL THEN RAISE EXCEPTION 'A fresh passing Client Journey test for Associate → New Stylist is required first.'; END IF;
  UPDATE public.cj_attempts SET used_for_promotion_at = now() WHERE id = a.id;
  INSERT INTO public.calc_stylists (name, level, user_id) VALUES (left(trim(stylist_name), 120), 'New Stylist', target_user_id);
END $function$;

CREATE OR REPLACE FUNCTION public.promote_stylist(stylist_id bigint)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s record; nxt text; a record;
BEGIN
  IF NOT public.can_change_levels() THEN RAISE EXCEPTION 'Level change access is required.'; END IF;
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
END $function$;