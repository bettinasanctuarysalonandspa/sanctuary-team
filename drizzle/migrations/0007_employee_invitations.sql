CREATE TABLE public.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  invited_by uuid NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_invitations TO authenticated;
GRANT ALL ON public.employee_invitations TO service_role;
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_invitations_owner ON public.employee_invitations FOR ALL TO authenticated USING (public.is_sanctuary_owner()) WITH CHECK (public.is_sanctuary_owner());

CREATE OR REPLACE FUNCTION public.accept_sanctuary_invitation() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_email text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = auth.uid();
  IF v_email IS NULL THEN
    RETURN 'none';
  END IF;
  SELECT i.id INTO v_id FROM public.employee_invitations i
    WHERE lower(i.email) = lower(v_email) AND i.status = 'pending'
    ORDER BY i.created_at DESC LIMIT 1;
  IF v_id IS NULL THEN
    RETURN 'none';
  END IF;
  UPDATE public.employee_invitations
    SET status = 'accepted', accepted_at = now(), user_id = auth.uid(), updated_at = now()
    WHERE id = v_id;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN 'accepted';
END; $$;
REVOKE ALL ON FUNCTION public.accept_sanctuary_invitation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_sanctuary_invitation() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_sanctuary_invitations() RETURNS TABLE(id uuid, email text, display_name text, status text, created_at timestamptz, accepted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.email, i.display_name, i.status, i.created_at, i.accepted_at
    FROM public.employee_invitations i
    WHERE i.status <> 'revoked'
    ORDER BY i.status, i.created_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.list_sanctuary_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_sanctuary_invitations() TO authenticated;