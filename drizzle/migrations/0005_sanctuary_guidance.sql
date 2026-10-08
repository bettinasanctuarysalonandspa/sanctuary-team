CREATE TABLE public.guidance_knowledge (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, content text NOT NULL, source text NOT NULL, source_date date NOT NULL, approved boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_knowledge TO authenticated;
GRANT ALL ON public.guidance_knowledge TO service_role;
ALTER TABLE public.guidance_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY guidance_knowledge_employee_read ON public.guidance_knowledge FOR SELECT TO authenticated USING (approved AND public.is_sanctuary_employee());
CREATE POLICY guidance_knowledge_owner ON public.guidance_knowledge FOR ALL TO authenticated USING (public.is_sanctuary_owner()) WITH CHECK (public.is_sanctuary_owner());

CREATE TABLE public.guidance_messages (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id uuid NOT NULL, message_id text NOT NULL, message jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, message_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_messages TO authenticated;
GRANT ALL ON public.guidance_messages TO service_role;
ALTER TABLE public.guidance_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY guidance_messages_private ON public.guidance_messages FOR ALL TO authenticated USING (user_id = auth.uid() AND public.is_sanctuary_employee()) WITH CHECK (user_id = auth.uid() AND public.is_sanctuary_employee());

CREATE TABLE public.guidance_gateway_state (id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), paused boolean NOT NULL DEFAULT false, reason text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_gateway_state TO authenticated;
GRANT ALL ON public.guidance_gateway_state TO service_role;
ALTER TABLE public.guidance_gateway_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY guidance_gateway_owner ON public.guidance_gateway_state FOR ALL TO authenticated USING (public.is_sanctuary_owner()) WITH CHECK (public.is_sanctuary_owner());