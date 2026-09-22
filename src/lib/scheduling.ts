/**
 * Constraint-aware group scheduling — domain model and solver.
 *
 * All time maths is done in UTC minutes. For the demo week we treat each
 * participant's UTC offset as fixed (a summer week, no DST transition inside
 * it). That keeps the model exact without pulling in a date library, and it's
 * an honest simplification for a single week: the interesting problem here is
 * the overlap of preferred hours, not DST arithmetic.
 */

export type ParticipantId = "naureen" | "marta" | "sam" | "alex";
export type Duration = 30 | 45 | 60;
export type Tolerance = 0 | 30 | 60;

/** A single day in the visible range. */
export interface DayMeta {
  index: number; // 0 = Monday ... 4 = Friday
  short: string; // "Mon"
  weekday: string; // "Monday"
  date: string; // "16 Jun"
}

export interface BusyBlock {
  day: number; // 0..4
  startLocal: number; // minutes since local midnight
  endLocal: number;
  label: string;
}

export interface Participant {
  id: ParticipantId;
  name: string;
  city: string;
  offsetLabel: string; // "GMT+1"
  offsetMin: number; // minutes from UTC for the demo week
  prefStartLocal: number; // preferred working hours, local minutes
  prefEndLocal: number;
  busy: BusyBlock[];
  organizer?: boolean;
}

/**
 * Per-participant outcome for a specific candidate meeting.
 * - ideal:      free, and the whole meeting sits inside preferred hours
 * - compromise: free, pokes outside preferred hours but within the tolerance
 * - outside:    free, but further outside preferred hours than tolerance allows
 * - busy:       overlaps an existing commitment (a hard conflict)
 */
export type SlotStatus = "ideal" | "compromise" | "outside" | "busy";

export interface Evaluation {
  participant: Participant;
  status: SlotStatus;
  localStartMin: number;
  localEndMin: number;
  driftMin: number; // minutes outside preferred hours (0 when ideal)
  edge: "before" | "after" | null; // which side of preferred hours they drift
  busyLabel?: string;
}

/** perfect: everyone ideal. acceptable: everyone free & within tolerance, at
 *  least one compromising. blocked: someone busy or beyond tolerance. */
export type Verdict = "perfect" | "acceptable" | "blocked";

export interface Candidate {
  day: number;
  utcStartMin: number;
  verdict: Verdict;
  evaluations: Evaluation[];
  totalDriftMin: number;
  compromisedCount: number;
}

// --- The demo week -----------------------------------------------------------

export const DAYS: DayMeta[] = [
  { index: 0, short: "Mon", weekday: "Monday", date: "16 Jun" },
  { index: 1, short: "Tue", weekday: "Tuesday", date: "17 Jun" },
  { index: 2, short: "Wed", weekday: "Wednesday", date: "18 Jun" },
  { index: 3, short: "Thu", weekday: "Thursday", date: "19 Jun" },
  { index: 4, short: "Fri", weekday: "Friday", date: "20 Jun" },
];

const h = (hours: number, mins = 0) => hours * 60 + mins;

export const PARTICIPANTS: Participant[] = [
  {
    id: "naureen",
    name: "Naureen",
    city: "Dublin",
    offsetLabel: "GMT+1",
    offsetMin: 60,
    prefStartLocal: h(8, 30),
    prefEndLocal: h(17, 30),
    organizer: true,
    busy: [{ day: 4, startLocal: h(15), endLocal: h(15, 30), label: "Focus block" }],
  },
  {
    id: "marta",
    name: "Marta",
    city: "Berlin",
    offsetLabel: "GMT+2",
    offsetMin: 120,
    prefStartLocal: h(9),
    prefEndLocal: h(18),
    busy: [{ day: 3, startLocal: h(17), endLocal: h(18), label: "Team retro" }],
  },
  {
    id: "sam",
    name: "Sam",
    city: "New York",
    offsetLabel: "GMT−4",
    offsetMin: -240,
    prefStartLocal: h(8),
    prefEndLocal: h(17),
    busy: [
      { day: 1, startLocal: h(11), endLocal: h(12), label: "1:1 with manager" },
      { day: 0, startLocal: h(13), endLocal: h(14), label: "Roadmap sync" },
    ],
  },
  {
    id: "alex",
    name: "Alex",
    city: "San Francisco",
    offsetLabel: "GMT−7",
    offsetMin: -420,
    prefStartLocal: h(8, 30),
    prefEndLocal: h(17),
    busy: [{ day: 2, startLocal: h(9, 30), endLocal: h(10, 30), label: "Standup + review" }],
  },
];

export const MEETING = {
  title: "Design Review",
  participantCount: PARTICIPANTS.length,
};

// Visible grid window, in Dublin local time (organizer's zone).
export const GRID_START_UTC = h(12); // Dublin 13:00
export const GRID_END_UTC = h(19); // Dublin 20:00
export const STEP = 30;

// Wider candidate search window (covers every participant's preferred hours).
const SEARCH_START_UTC = h(6);
const SEARCH_END_UTC = h(22);
// Nobody is offered a meeting this far outside preferred hours, regardless of
// tolerance — it stops "least disruptive" recommending a 3am call.
const HARD_BOUND = 120;

// --- Evaluation --------------------------------------------------------------

function overlapsBusy(p: Participant, day: number, localStart: number, localEnd: number) {
  return p.busy.find(
    (b) => b.day === day && localStart < b.endLocal && localEnd > b.startLocal
  );
}

/** How far a meeting drifts outside a participant's preferred hours. */
function drift(localStart: number, localEnd: number, prefStart: number, prefEnd: number) {
  const before = Math.max(0, prefStart - localStart);
  const after = Math.max(0, localEnd - prefEnd);
  const edge: "before" | "after" | null = before > 0 ? "before" : after > 0 ? "after" : null;
  return { amount: before + after, edge };
}

export function evaluate(
  p: Participant,
  day: number,
  utcStart: number,
  duration: Duration,
  tolerance: number
): Evaluation {
  const localStart = utcStart + p.offsetMin;
  const localEnd = localStart + duration;

  const busy = overlapsBusy(p, day, localStart, localEnd);
  if (busy) {
    return {
      participant: p,
      status: "busy",
      localStartMin: localStart,
      localEndMin: localEnd,
      driftMin: 0,
      edge: null,
      busyLabel: busy.label,
    };
  }

  const { amount, edge } = drift(localStart, localEnd, p.prefStartLocal, p.prefEndLocal);
  let status: SlotStatus;
  if (amount === 0) status = "ideal";
  else if (amount <= tolerance) status = "compromise";
  else status = "outside";

  return {
    participant: p,
    status,
    localStartMin: localStart,
    localEndMin: localEnd,
    driftMin: amount,
    edge,
  };
}

export function evaluateCandidate(
  participants: Participant[],
  day: number,
  utcStart: number,
  duration: Duration,
  tolerance: number
): Candidate {
  const evaluations = participants.map((p) => evaluate(p, day, utcStart, duration, tolerance));

  const anyBlocked = evaluations.some((e) => e.status === "busy" || e.status === "outside");
  const anyCompromise = evaluations.some((e) => e.status === "compromise");

  let verdict: Verdict;
  if (anyBlocked) verdict = "blocked";
  else if (anyCompromise) verdict = "acceptable";
  else verdict = "perfect";

  const totalDriftMin = evaluations.reduce((sum, e) => sum + e.driftMin, 0);
  const compromisedCount = evaluations.filter((e) => e.driftMin > 0).length;

  return { day, utcStartMin: utcStart, verdict, evaluations, totalDriftMin, compromisedCount };
}

/** Candidate start times used for both the grid and the search. */
export function gridTimes(): number[] {
  const out: number[] = [];
  for (let t = GRID_START_UTC; t < GRID_END_UTC; t += STEP) out.push(t);
  return out;
}

/** All matches (perfect or acceptable) across the whole week, best first. */
export function findMatches(
  participants: Participant[],
  duration: Duration,
  tolerance: Tolerance
): Candidate[] {
  const matches: Candidate[] = [];
  for (const day of DAYS) {
    for (let t = SEARCH_START_UTC; t < SEARCH_END_UTC; t += STEP) {
      const c = evaluateCandidate(participants, day.index, t, duration, tolerance);
      if (c.verdict !== "blocked") matches.push(c);
    }
  }
  return matches.sort(rank);
}

/**
 * The least-disruptive time. Considers every time nobody is busy and nobody is
 * pushed past the hard bound — even beyond the current tolerance — so there is
 * always an explainable recommendation, and picks the smallest total
 * compromise. This is the "Find least disruptive time" logic: deterministic,
 * inspectable, no black box.
 */
export function leastDisruptive(
  participants: Participant[],
  duration: Duration
): Candidate | null {
  const reachable: Candidate[] = [];
  for (const day of DAYS) {
    for (let t = SEARCH_START_UTC; t < SEARCH_END_UTC; t += STEP) {
      const c = evaluateCandidate(participants, day.index, t, duration, HARD_BOUND);
      const hardConflict = c.evaluations.some((e) => e.status === "busy");
      if (!hardConflict) reachable.push(c);
    }
  }
  reachable.sort(rank);
  return reachable[0] ?? null;
}

function rank(a: Candidate, b: Candidate): number {
  if (a.totalDriftMin !== b.totalDriftMin) return a.totalDriftMin - b.totalDriftMin;
  if (a.compromisedCount !== b.compromisedCount) return a.compromisedCount - b.compromisedCount;
  if (a.day !== b.day) return a.day - b.day;
  return a.utcStartMin - b.utcStartMin;
}

// --- Formatting helpers ------------------------------------------------------

export function fmtTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

export function fmtDrift(min: number): string {
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? "" : "s"}`;
  if (min < 60) return `${min} minutes`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function participantById(id: ParticipantId): Participant {
  const p = PARTICIPANTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown participant ${id}`);
  return p;
}

export const TOLERANCE_LABEL: Record<Tolerance, string> = {
  0: "Keep within preferred hours",
  30: "Allow up to 30 min outside",
  60: "Allow up to 1 hour outside",
};
