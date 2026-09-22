# Find Time Together

A small, coded product prototype exploring constraint-aware group scheduling.

Built with React, TypeScript and plain CSS. No UI framework, no state library. The
interesting logic is a real constraint solver, not a set of hard-coded screens.

**Live prototype:** _(published link)_
**Run locally:** `npm install && npm run dev`

---

## The problem

When you schedule a meeting across several time zones, there is often no time that sits
inside everyone's preferred working hours. Most tools respond in one of two unsatisfying
ways: they surface a wall of raw availability and leave the organizer to reconcile it by
hand, or they collapse the whole thing to "No times available" and hide the fact that a
good-enough option was one small compromise away.

## The hypothesis

> When no ideal meeting time exists, a scheduling tool should help the organizer
> understand the trade-offs and find the least disruptive alternative, without hiding
> the decision from them.

This is a product exploration, not a claim that Cal.com users have this exact problem
today.

## Two principles this prototype is built on

1. **This is decision support, not a black box, and deliberately not a chatbot.** The
   system does the arithmetic and recommends a time. The organizer stays in control and
   can see exactly why.
2. **The explanation shown to the user is generated from the same evaluation state that
   produced the recommendation.** There is no separate copy deck that could drift out of
   sync with the logic.

## The scenario

A 45-minute Design Review with four people in Dublin, Berlin, New York and San
Francisco. Each has their own preferred working hours and a few existing commitments.
Their preferred hours overlap for only about half an hour a day, so a 45-minute meeting
cannot fit inside everyone's working day at once. That tension is the whole point, and
the interface is built to make it legible rather than to paper over it.

## What you can do

Kept deliberately tight:

1. **Change the meeting duration** (30 / 45 / 60). Perfect matches appear and disappear
   as the meeting has to fit a narrower or wider window.
2. **Change working hours** (keep within preferred hours / allow up to 30 min outside /
   allow up to 1 hour outside). This is how far outside someone's preferred hours a time
   may fall before it stops counting as a match.
3. **Read what changed.** Each time you move a constraint, the results area explains the
   consequence in plain language, for example "3 times opened up. Shortening the meeting
   by 15 minutes lets these times fit everyone's preferred hours." This closes the loop:
   change a constraint, the system recalculates, you understand the effect.
4. **Find the least disruptive time.** This surfaces a clear recommendation with the
   total compromise it costs and who it affects, derived from the same solver.
5. **Inspect and select.** Open any suggestion to see each person's local time and the
   exact compromise being asked of them, then select it to set a lightweight confirmed
   state. You can select a different time afterwards.

Everything responds to the same underlying data. For example: 45 min while keeping within
preferred hours yields no perfect times; drop to 30 min and three open up; go back to 45
and allow 30 min outside and a set of close matches appears.

## How the recommendation works

`src/lib/scheduling.ts` holds the model and solver. For every candidate start time it
evaluates each participant as one of:

- **ideal**: free, and the whole meeting sits inside preferred hours
- **compromise**: free, pokes outside preferred hours but within the chosen flexibility
- **outside**: free, but further out than the flexibility allows
- **busy**: overlaps an existing commitment

A candidate is _perfect_ if everyone is ideal, _acceptable_ if everyone is free and
within flexibility with at least one compromise, otherwise _blocked_. "Find least
disruptive time" scans every time nobody is busy and nobody is pushed past a hard sanity
bound, then picks the smallest total compromise, tie-broken by fewest people affected and
then the earliest slot. It is deterministic and fully inspectable, which is what lets the
"Why this time?" explanation be honest.

`src/lib/explain.ts` turns that solver output into the plain-language reasoning, the
recommendation summary, and the "what changed" message. All of it reads from the
evaluation, so nothing is hand-written per slot.

## Design decisions worth calling out

- **Group decision first, individual explanation second.** The availability grid leads
  with a prominent "Everyone / can meet?" row that answers the organizer's first question
  at a glance, with the quieter per-participant rows below for the "if not, why?"
  follow-up.
- **Status never depends on colour alone.** Availability is carried by fill, pattern and
  a glyph, with a text label and a screen-reader description on every cell. The single
  accent colour marks a positive group outcome and focus rings, never a good/bad
  shorthand, which sidesteps the red/amber/green traffic light that fails for colour-blind
  users.
- **The grid is a real, semantic table.** Time columns and participant rows are proper
  `<th scope>` headers, so a screen-reader user hears "Marta, 16:30, busy, team retro"
  rather than navigating a soup of divs.
- **Restraint over decoration.** No gradients, glass, or oversized cards. Density and
  typography do the work, which is what makes it feel like product infrastructure rather
  than a concept shot.

## Accessibility

Semantic HTML, keyboard-operable controls (native radios behind the segmented controls,
arrow-key day tabs with roving `tabindex`), a focus-trapped inspector dialog that restores
focus on close, visible focus states, polite `aria-live` regions that announce both the
consequence of a constraint change and the time you select, adequate contrast, no
colour-only signalling, and a `prefers-reduced-motion` path. ARIA is used only where
native HTML does not already express the relationship: the segmented controls rely on a
`fieldset` and `legend` rather than a redundant `radiogroup` role.

## Honest limitations

- **Time zones use fixed UTC offsets for a single demo week.** The problem here is the
  overlap of preferred hours, not DST arithmetic, so the model stays exact and
  dependency-free rather than pulling in a date library. Real calendars would need proper
  zone and DST handling.
- **Availability is mock data** in `scheduling.ts`; nothing connects to a calendar.
- **The scope is one meeting in one week.** There is no date-range picker, no
  invitations, and no booking; selecting a time sets a local confirmed state only. Those
  are deliberately out of scope so the concept stays the focus.

## Where this would go in production

The controls (segmented control, dialog, tabs) are hand-built here to keep the prototype
self-contained. In the Cal.com codebase they would be composed from the open-source
component library on top of Base UI, so the accessibility primitives come from a shared,
tested foundation rather than being re-implemented per screen. The solver would move
behind an API and take real free/busy data. The interaction model and the "explain the
compromise" principle are the parts worth keeping.

## Project structure

```
src/
  lib/
    scheduling.ts    model, mock data, and the constraint solver
    explain.ts       solver output to plain-language reasoning and "what changed"
  components/
    ProductIntro     understated framing for the exploration
    MeetingHeader    title and participants
    ConstraintPanel  duration and working-hours controls
    AvailabilityGrid day tabs, group row, participant x time grid
    MatchSummary     suggested times, recommendation, "what changed", selected state
    TimeInspector    per-person drawer with select action
    SegmentedControl reusable radio-group control
  styles/app.css     tokens, layout, the status pattern system, dark mode
  App.tsx            state and the derived solver results
```
