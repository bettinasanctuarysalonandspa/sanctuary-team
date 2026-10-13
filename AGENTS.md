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
- Keep Content Studio knowledge and private transcripts isolated from calculator data; load approved dated owner-editable records on every request so corrections take effect without changing prices.
- Use AI Elements and authenticated same-origin streaming for Content Studio, replay server-owned history and persist plain text messages; keep the existing consultation interface unchanged.
- Point invitation and other auth email links at the canonical published site address, never a preview or development host, so links still open on the team's phones.
- Derive invitation "joined" status and employee membership from the account's own confirmation in the database, so the owner's roster stays correct even when someone completes setup through a path the app's accept step never ran.
- Growth coach: per-person progress lives in growth_* tables; zones computed in code from growth_level_targets, levels read from calc_stylists.user_id — single source of level truth.
- Bootcamp lessons live in code (src/lib/bootcamp) as the single source for co-stylist and educator views; educator edits are stored as per-lesson overrides, and approvals require the educator role in user_roles.
