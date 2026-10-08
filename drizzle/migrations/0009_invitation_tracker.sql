create or replace function public.list_invitation_tracker()
returns table(invitation_id uuid, opened_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_sanctuary_owner() then raise exception 'Owner access required'; end if;
  return query
  select i.id, u.email_confirmed_at, u.last_sign_in_at
  from public.employee_invitations i
  left join auth.users u on u.id = i.user_id or (i.user_id is null and lower(u.email) = lower(i.email))
  where i.status <> 'revoked';
end $$;
revoke all on function public.list_invitation_tracker() from public, anon;
grant execute on function public.list_invitation_tracker() to authenticated;