-- Helper for the storage policy: user_roles has its own RLS, so a raw EXISTS inside a
-- policy would only ever see the caller's own rows. A security-definer function reads it properly.
create or replace function public.is_team_folder(folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      exists (
        select 1 from public.user_roles r
        where r.user_id = folder::uuid
          and r.role::text in ('employee','admin')
      )
    else false
  end
$$;

revoke all on function public.is_team_folder(text) from public;
grant execute on function public.is_team_folder(text) to authenticated;

-- Rebuild the upload policy using the helper.
drop policy if exists "proof upload own or on behalf" on storage.objects;
create policy "proof upload own or on behalf"
  on storage.objects
  as permissive
  for insert
  to authenticated
  with check (
    bucket_id = 'growth-proof'
    and public.is_sanctuary_employee()
    and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or (public.is_bootcamp_educator() and public.is_team_folder((storage.foldername(name))[1]))
    )
  );