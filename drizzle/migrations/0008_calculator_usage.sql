create or replace function public.list_calculator_usage()
returns table(user_id uuid, display_name text, questions bigint, days_used bigint, last_used timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_sanctuary_owner() then raise exception 'Owner access required'; end if;
  return query
  select p.id, p.display_name,
    count(m.id) filter (where m.role = 'user'),
    count(distinct (m.created_at at time zone 'America/New_York')::date) filter (where m.role = 'user'),
    max(m.created_at) filter (where m.role = 'user')
  from public.profiles p
  join public.user_roles r on r.user_id = p.id and r.role = 'employee'
  left join public.consultation_messages m on m.user_id = p.id
  group by p.id, p.display_name
  order by 5 desc nulls last, 2;
end $$;
revoke all on function public.list_calculator_usage() from public, anon;
grant execute on function public.list_calculator_usage() to authenticated;