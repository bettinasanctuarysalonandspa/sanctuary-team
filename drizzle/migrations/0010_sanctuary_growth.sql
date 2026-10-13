ALTER TABLE public.calc_stylists ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE TABLE public.growth_profiles (
  user_id uuid PRIMARY KEY,
  start_date date,
  training_week integer CHECK (training_week BETWEEN 1 AND 12),
  focus text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.growth_checkins (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
CREATE TABLE public.growth_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('goal','assignment','note')),
  content text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX growth_items_user_idx ON public.growth_items(user_id, created_at DESC);
CREATE TABLE public.growth_level_targets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level text NOT NULL,
  metric text NOT NULL,
  green_min numeric,
  yellow_min numeric,
  next_level_requirement text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (level, metric)
);
CREATE TABLE public.growth_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, content text NOT NULL, source text NOT NULL, source_date date NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.growth_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL, message_id text NOT NULL, message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
CREATE TABLE public.growth_gateway_state (
  id integer PRIMARY KEY DEFAULT 1, paused boolean NOT NULL DEFAULT false, reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_profiles, public.growth_checkins, public.growth_items, public.growth_level_targets, public.growth_knowledge, public.growth_messages, public.growth_gateway_state TO authenticated;
GRANT ALL ON public.growth_profiles, public.growth_checkins, public.growth_items, public.growth_level_targets, public.growth_knowledge, public.growth_messages, public.growth_gateway_state TO service_role;

ALTER TABLE public.growth_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_level_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_gateway_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY growth_profiles_own ON public.growth_profiles FOR ALL TO authenticated
  USING ((user_id = auth.uid() AND is_sanctuary_employee()) OR is_sanctuary_owner())
  WITH CHECK ((user_id = auth.uid() AND is_sanctuary_employee()) OR is_sanctuary_owner());
CREATE POLICY growth_checkins_own ON public.growth_checkins FOR ALL TO authenticated
  USING ((user_id = auth.uid() AND is_sanctuary_employee()) OR is_sanctuary_owner())
  WITH CHECK ((user_id = auth.uid() AND is_sanctuary_employee()) OR is_sanctuary_owner());
CREATE POLICY growth_items_own ON public.growth_items FOR ALL TO authenticated
  USING ((user_id = auth.uid() AND is_sanctuary_employee()) OR is_sanctuary_owner())
  WITH CHECK ((user_id = auth.uid() AND is_sanctuary_employee()) OR is_sanctuary_owner());
CREATE POLICY growth_targets_read ON public.growth_level_targets FOR SELECT TO authenticated USING (is_sanctuary_employee());
CREATE POLICY growth_targets_owner ON public.growth_level_targets FOR ALL TO authenticated USING (is_sanctuary_owner()) WITH CHECK (is_sanctuary_owner());
CREATE POLICY growth_knowledge_employee_read ON public.growth_knowledge FOR SELECT TO authenticated USING (approved AND is_sanctuary_employee());
CREATE POLICY growth_knowledge_owner ON public.growth_knowledge FOR ALL TO authenticated USING (is_sanctuary_owner()) WITH CHECK (is_sanctuary_owner());
CREATE POLICY growth_messages_private ON public.growth_messages FOR ALL TO authenticated
  USING (user_id = auth.uid() AND is_sanctuary_employee()) WITH CHECK (user_id = auth.uid() AND is_sanctuary_employee());
CREATE POLICY growth_gateway_owner ON public.growth_gateway_state FOR ALL TO authenticated USING (is_sanctuary_owner()) WITH CHECK (is_sanctuary_owner());

CREATE OR REPLACE FUNCTION public.my_stylist_level()
RETURNS TABLE(name text, level text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.name, s.level FROM public.calc_stylists s WHERE s.user_id = auth.uid() AND s.active AND public.is_sanctuary_employee() LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.list_growth_roster()
RETURNS TABLE(user_id uuid, display_name text, level text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, s.level FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'employee'
  LEFT JOIN public.calc_stylists s ON s.user_id = p.id AND s.active
  WHERE public.is_sanctuary_owner() AND NOT EXISTS (SELECT 1 FROM public.employee_access_revocations v WHERE v.user_id = p.id)
  ORDER BY p.display_name
$$;