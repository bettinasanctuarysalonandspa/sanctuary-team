CREATE OR REPLACE FUNCTION public.sanctuary_session_valid()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND (u.banned_until IS NULL OR u.banned_until <= now())
      AND NOT EXISTS (
        SELECT 1 FROM public.employee_access_revocations r
        WHERE r.user_id = u.id
      )
      -- Absolute 30-day session age: use the persisted session row when one
      -- exists, otherwise fall back to the token's own issued-at time.
      AND COALESCE(
            (SELECT s.created_at FROM auth.sessions s
             WHERE s.id::text = auth.jwt()->>'session_id' AND s.user_id = u.id),
            to_timestamp((auth.jwt()->>'iat')::bigint)
          ) + interval '30 days' > now()
      -- Honor explicit session expiry when a session row exists.
      AND NOT EXISTS (
        SELECT 1 FROM auth.sessions s
        WHERE s.id::text = auth.jwt()->>'session_id'
          AND s.not_after IS NOT NULL AND s.not_after <= now()
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.sanctuary_session_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'valid', public.sanctuary_session_valid(),
    'expiresAt', COALESCE(
      (SELECT s.created_at FROM auth.sessions s
       WHERE s.id::text = auth.jwt()->>'session_id' AND s.user_id = auth.uid()),
      to_timestamp((auth.jwt()->>'iat')::bigint)
    ) + interval '30 days'
  );
$function$;