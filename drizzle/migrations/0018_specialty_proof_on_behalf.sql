-- Bettina (owner) and educators can log specialty progress on a stylist's behalf,
-- including mannequin-head photos and walkthrough videos.

-- 1) Storage: an educator/owner may place a file inside a teammate's proof folder.
drop policy if exists "proof upload own folder" on storage.objects;
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
      or (
        public.is_bootcamp_educator()
        and exists (
          select 1
          from public.user_roles r
          where r.user_id::text = (storage.foldername(name))[1]
            and r.role::text in ('employee','admin')
        )
      )
    )
  );

-- 2) Proof records: a stylist still submits their own as pending; an educator/owner
--    may record an approved one for a teammate they are allowed to sign off.
drop policy if exists "submit own proof" on public.specialty_proof;
create policy "submit own or educator proof"
  on public.specialty_proof
  as permissive
  for insert
  to authenticated
  with check (
    public.sanctuary_session_valid()
    and public.is_sanctuary_employee()
    and (
      (costylist_id = auth.uid() and status = 'pending' and reviewer_id is null)
      or (
        public.is_bootcamp_educator()
        and public.can_sign_specialty(track)
        and status = 'approved'
        and reviewer_id = auth.uid()
      )
    )
  );