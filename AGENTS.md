<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Use shared app chrome around the root Outlet and individual content routes, so navigation and page metadata remain consistent.
- Keep private tools and profiles beneath the managed authenticated layout; enforce employee/admin membership through validated server functions, so an arbitrary signed-in account cannot access employee resources.
- Store user-facing identity in profiles and privileges only in user_roles; never self-assign employee or owner access.
- Enforce absolute session age and revocation in database policies and owner RPCs using validated session IDs; browser timers never authorize access.
- Keep a single root session observer with persistent managed auth, realtime revocation, and foreground checks; clear private caches before sign-out.
- Revoke employee membership transactionally before attempting an Auth ban; prohibit owner targets and self-revocation.
- Build each tool only from owner-supplied approved data stored in owner-editable tables; quote math runs deterministically in code (integer cents, half-up) via an AI tool call, never AI arithmetic, so prices stay exact and auditable.
- Keep tools without approved information as empty pages, so nothing is invented.
- Allocate rounded checkout charges deterministically across quote categories using largest remainders, so charge-inclusive category totals reconcile exactly without modifying catalog prices.
