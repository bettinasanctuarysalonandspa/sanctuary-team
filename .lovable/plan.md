# Sanctuary Growth — Coach & KPI Tracker

A fifth section on the home dashboard, matching the existing frosted sage design and conversational style.

## What employees see

- **Growth Coach chat** — a conversational assistant like the other four tools. Stylists ask about goals, growing their book, retail confidence, rebooking conversations. Uses its own approved knowledge (empty until the owner adds it in Admin; never invents advice).
- **My Numbers** — a simple weekly entry screen where each stylist logs their own:
  - Clients served
  - Retail sales ($)
  - Rebooking rate (%)
  - Service revenue ($)
- **My Zone** — each stylist sees their current level (from the existing stylist list) and a red / yellow / green zone per number, plus what they'd need to reach the next level.

## Zones and level targets

- Targets and zone cutoffs are **owner-supplied only** — stored in an owner-editable table, empty at launch so nothing is invented.
- Until the owner enters targets, the zone area shows an elegant "targets coming soon" state.
- Owner edits them in Admin alongside the other tools.

## Owner (Admin) view

- New "Sanctuary Growth" area in Admin:
  - Edit level targets and red/yellow/green cutoffs per level
  - Manage the coach's approved knowledge (same pattern as Guidance/Support)
  - See each stylist's latest numbers and zones (read-only roster view)

## Data & security

- New tables: weekly KPI entries (stylist's own rows only — they can add/edit their own, never see others'), level targets (all employees read, owner writes), growth knowledge (approved records readable by employees, owner manages), coach chat messages (private per user, same as other tools).
- All tables get RLS + grants per project rules; employee role checked via existing `is_sanctuary_employee()` / `is_sanctuary_owner()`.

## Wiring

- New route `_authenticated/_employee.growth.tsx` (coach chat + My Numbers tabs), admin section in `_employee.admin.tsx`, card added to the tools grid and navigation, route head metadata, frosted sage styling throughout.
- No "AI"/"GPT" wording; name shown as "Sanctuary Growth — Coach & KPI Tracker".

## Verification

- Typecheck/build green; Playwright check as the owner: dashboard card renders, growth page loads, weekly entry saves, admin target editor works.
