# Sanctuary Growth — Coach & KPI Tracker

A fifth section on the home dashboard, matching the frosted sage design and the same simple chat experience as the other tools. Built from the owner's outline: one Growth Coach that adapts to each person's level, plus weekly number tracking and a leadership view.

## What employees see

One page with three simple tabs:

1. **Coach** — a conversational assistant. It knows the person's level (from the stylist list) and coaches accordingly:
   - **Associates:** follows the 12-week training sequence (weekly skills, mannequin reps, model requirements, graduation readiness).
   - **New Stylists:** business building — growing clientele, rebooking, retail, social content, filling open times.
   - **Designers:** performance coaching on rebooking, utilization, retail-to-service (RTS), service performance.
   - Gives a weekly assignment based on level, and points out gaps from their latest numbers.
2. **My Week** — a short weekly check-in the stylist fills in themselves:
   - Clients served, new clients, service revenue, retail sales, rebooking %, utilization %
   - Social posts, models, practice/mannequin reps, goals and completed actions
   - Associates also see their current training week checklist.
3. **My Zone** — red / yellow / green for each number against their level's targets, and what's needed to reach the next level.

## Owner (Admin) area

- **Leadership dashboard:** every team member's latest week, zones, training week, and who needs support.
- **Targets editor:** per-level thresholds for red/yellow/green and "next level" requirements.
- **12-week Associate program editor:** each week's skills, reps, models, checklist.
- **Coach knowledge:** approved instructions and documents (same pattern as Guidance/Support).

## No invented content

The outline describes what exists but doesn't include the actual material. Until the owner provides it, these stay empty with an elegant "coming soon" state:
- The full Sanctuary Growth Coach instructions
- The 12-week Associate sequence
- Rebooking, utilization and RTS thresholds per level
- Social media / client-building accountability standards
- Any training manuals, consultation scripts, retail standards

The Code of Honor already in Sanctuary Guidance will be reused as approved knowledge.

## Technical details

- Tables (RLS + grants; `is_sanctuary_employee()` / `is_sanctuary_owner()`): `growth_weekly_entries` (own rows only; owner reads all), `growth_level_targets`, `growth_training_weeks` (employees read, owner writes), `growth_knowledge` (approved readable), `growth_messages` (private per user), `growth_gateway_state`.
- Route `_authenticated/_employee.growth.tsx`; tool card + nav entry; admin sections in Admin; head metadata.
- Coach uses the existing assistant pattern (Content Studio/Guidance) with server-side zone calculation passed as context — zones computed in code, never by the assistant.
- Wording avoids "AI"/"GPT"; displayed as "Sanctuary Growth — Coach & KPI Tracker".
- Verify: build green; owner Playwright check of dashboard card, weekly entry save, zone display, admin editors.
