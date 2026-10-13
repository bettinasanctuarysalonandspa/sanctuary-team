# Sanctuary Growth — Coach & KPI Tracker

A fifth section on the home dashboard, same frosted sage design and simple chat as the other tools. One Growth Coach that knows each person, remembers their progress, and builds on it every week.

## The core idea: it remembers each person

Nobody re-enters information. Each team member has a running **growth profile** the coach keeps up to date:
- Their level, start date, and (for Associates) current training week
- Goals they've set and whether they hit them
- Every weekly check-in, kept as history so trends show over time
- Completed assignments, skills signed off, models and mannequin reps done
- Short coaching notes from past conversations (what they're working on, what was agreed)

Each time they open the coach, it already knows where they left off: "Last week you were at 62% rebooking and committed to pre-booking every color client. How did that go?"

Weekly check-ins are pre-filled from last week, so they only change what's different.

## What employees see

1. **Coach** — chat that adapts to their level:
   - Associates: 12-week training sequence, reps, models, graduation readiness
   - New Stylists: clientele, rebooking, retail, social content, open times
   - Designers: rebooking, utilization, retail-to-service, service performance
   - Ends with a weekly assignment, saved to their profile
2. **My Progress** — their history at a glance: trend of each number, goals, assignments done, training week checklist.
3. **My Zone** — red / yellow / green per number against their level, and what's needed for the next level.

## Owner (Admin)

- Leadership dashboard: each person's progress over time, zones, who needs support
- Targets editor (per-level red/yellow/green and next-level requirements)
- 12-week Associate program editor
- Coach knowledge and instructions
- Owner can view and correct anyone's progress record

## No invented content

The uploaded outline describes the coaching system but doesn't include the actual material. These stay empty ("coming soon") until the owner provides them: the Growth Coach instructions, the 12-week sequence, rebooking/utilization/RTS thresholds, social and client-building standards, any manuals or scripts. The approved Code of Honor from Sanctuary Guidance is reused.

## Technical details

- Tables (RLS + grants; employees see only their own rows, owner sees all): `growth_profiles` (level, start date, training week, current goals), `growth_checkins` (weekly numbers, history), `growth_assignments` (assigned/completed), `growth_notes` (coach-saved progress notes), `growth_level_targets`, `growth_training_weeks`, `growth_knowledge`, `growth_messages`, `growth_gateway_state`.
- Coach loads the profile, last ~8 check-ins, open assignments and recent notes on every request; it saves progress through tool calls (log check-in, set goal, complete assignment, add note) — server code writes the rows and computes zones, never the assistant.
- Route `_authenticated/_employee.growth.tsx`, tool card + nav, Admin sections, head metadata. No "AI"/"GPT" wording.
- Verify: build green; owner Playwright run — check-in saved, reopen shows it remembered and pre-filled, admin view shows history.
