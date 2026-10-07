CREATE TABLE public.employee_access_revocations (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, revoked_at timestamptz NOT NULL DEFAULT now(), revoked_by uuid NOT NULL);
GRANT SELECT ON public.employee_access_revocations TO authenticated;
GRANT ALL ON public.employee_access_revocations TO service_role;
ALTER TABLE public.employee_access_revocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own revocation" ON public.employee_access_revocations FOR SELECT TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_access_revocations;
CREATE FUNCTION public.sanctuary_session_valid() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT EXISTS (SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id = s.user_id WHERE s.id::text = auth.jwt()->>'session_id' AND s.user_id = auth.uid() AND s.created_at + interval '30 days' > now() AND (s.not_after IS NULL OR s.not_after > now()) AND (u.banned_until IS NULL OR u.banned_until <= now()) AND NOT EXISTS (SELECT 1 FROM public.employee_access_revocations r WHERE r.user_id = s.user_id));
$$;
REVOKE ALL ON FUNCTION public.sanctuary_session_valid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sanctuary_session_valid() TO authenticated, service_role;
CREATE FUNCTION public.sanctuary_session_status() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT jsonb_build_object('valid', public.sanctuary_session_valid(), 'expiresAt', (SELECT s.created_at + interval '30 days' FROM auth.sessions s WHERE s.id::text = auth.jwt()->>'session_id' AND s.user_id = auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.sanctuary_session_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sanctuary_session_status() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT public.sanctuary_session_valid() AND _user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;
ALTER POLICY "Read own profile" ON public.profiles USING (auth.uid() = id AND public.sanctuary_session_valid());
ALTER POLICY "Update own profile" ON public.profiles USING (auth.uid() = id AND public.sanctuary_session_valid()) WITH CHECK (auth.uid() = id AND public.sanctuary_session_valid());
ALTER POLICY "Read own roles" ON public.user_roles USING (auth.uid() = user_id AND public.sanctuary_session_valid());
CREATE FUNCTION public.revoke_sanctuary_employee(target_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501'; END IF;
 IF target_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin') THEN RAISE EXCEPTION 'Owner accounts cannot be revoked here' USING ERRCODE = '42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'employee') THEN RAISE EXCEPTION 'Approved employee not found'; END IF;
 INSERT INTO public.employee_access_revocations(user_id, revoked_by) VALUES (target_user_id, auth.uid()) ON CONFLICT (user_id) DO UPDATE SET revoked_at = now(), revoked_by = auth.uid();
 DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = 'employee';
END; $$;
REVOKE ALL ON FUNCTION public.revoke_sanctuary_employee(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_sanctuary_employee(uuid) TO authenticated;
CREATE FUNCTION public.list_sanctuary_employees() RETURNS TABLE(user_id uuid, display_name text, email text, revoked_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501'; END IF;
 RETURN QUERY SELECT p.id, p.display_name, u.email::text, r.revoked_at FROM public.profiles p JOIN auth.users u ON u.id = p.id LEFT JOIN public.employee_access_revocations r ON r.user_id = p.id WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AND (r.user_id IS NOT NULL OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'employee')) ORDER BY p.display_name, u.email;
END; $$;
REVOKE ALL ON FUNCTION public.list_sanctuary_employees() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_sanctuary_employees() TO authenticated;