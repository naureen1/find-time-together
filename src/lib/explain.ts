import {
  type Candidate,
  type Duration,
  type Evaluation,
  type Participant,
  type Tolerance,
  fmtDrift,
  fmtTime,
} from "./scheduling";

/** A single participant's compromise, in plain language. */
export function driftPhrase(e: Evaluation): string {
  if (e.edge === "before") {
    return `${e.participant.name} starts ${fmtDrift(e.driftMin)} before preferred hours`;
  }
  return `${e.participant.name} finishes ${fmtDrift(e.driftMin)} after preferred hours`;
}

/** The reasoning behind a recommended time, as a list of sentences. */
export function candidateReasoning(c: Candidate): string[] {
  const drifting = c.evaluations.filter((e) => e.driftMin > 0);
  if (drifting.length === 0) {
    return ["Everyone is free and inside their preferred working hours."];
  }
  const sentences = ["Everyone is free."];
  for (const e of drifting) sentences.push(`${driftPhrase(e)}.`);
  sentences.push("No existing meetings or focus blocks are affected.");
  return sentences;
}

/** Short per-participant status text — used where colour must not carry meaning. */
export function statusText(e: Evaluation): string {
  switch (e.status) {
    case "ideal":
      return "Within preferred hours";
    case "compromise":
      return e.edge === "before"
        ? `${fmtDrift(e.driftMin)} before preferred hours`
        : `${fmtDrift(e.driftMin)} after preferred hours`;
    case "outside":
      return e.edge === "before"
        ? `${fmtDrift(e.driftMin)} before preferred hours`
        : `${fmtDrift(e.driftMin)} after preferred hours`;
    case "busy":
      return `Busy — ${e.busyLabel}`;
  }
}

/** The window, in UTC minutes, where every participant is inside preferred hours. */
export function preferredOverlap(participants: Participant[]) {
  let start = -Infinity;
  let end = Infinity;
  for (const p of participants) {
    start = Math.max(start, p.prefStartLocal - p.offsetMin);
    end = Math.min(end, p.prefEndLocal - p.offsetMin);
  }
  const width = Math.max(0, end - start);
  return { startUTC: start, endUTC: end, width };
}

/** Explains why no perfect time exists, in the organizer's (Dublin) zone. */
export function overlapExplanation(participants: Participant[]): string {
  const { width } = preferredOverlap(participants);
  const cities = participants.map((p) => p.city);
  const cityList =
    cities.slice(0, -1).join(", ") + " and " + cities[cities.length - 1];
  if (width <= 0) {
    return `Preferred hours across ${cityList} never all overlap on the same clock, so no time sits inside everyone's working day at once.`;
  }
  return `Preferred hours across ${cityList} overlap for only ${fmtDrift(width)} a day. A longer meeting can't fit inside that window without asking someone to shift.`;
}

/** Meeting time in the organizer's zone (Dublin), e.g. "16:30". */
export function organizerTime(c: Candidate, organizer: Participant): string {
  return fmtTime(c.utcStartMin + organizer.offsetMin);
}

/** One-line summary of a recommendation, generated from its evaluation. */
export function recommendationSummary(c: Candidate): string {
  const drifting = c.evaluations.filter((e) => e.driftMin > 0);
  if (drifting.length === 0) {
    return "Everyone is available and within their preferred hours.";
  }
  return "Everyone is available. " + drifting.map(driftPhrase).join(". ") + ".";
}

/** The compromise metric for a candidate, e.g. "Total compromise: 15 min across 1 participant." */
export function compromiseLine(c: Candidate): string {
  if (c.totalDriftMin === 0) return "No compromise — this fits everyone's preferred hours.";
  const who = `${c.compromisedCount} participant${c.compromisedCount === 1 ? "" : "s"}`;
  return `Total compromise: ${c.totalDriftMin} min across ${who}.`;
}

// --- "What changed?" feedback -----------------------------------------------

export interface ResultSnapshot {
  duration: Duration;
  tolerance: Tolerance;
  perfect: number;
  acceptable: number;
  maxCompromised: number; // most people asked to shift in any acceptable match
}

export interface ChangeMessage {
  headline: string;
  detail: string;
}

const times = (n: number) => `${n} time${n === 1 ? "" : "s"}`;

/**
 * Explains the consequence of a constraint change, derived from the difference
 * between the previous and new results. Returns null when nothing relevant
 * changed. This is what makes the loop explicit: change -> recompute ->
 * understand.
 */
export function diffMessage(prev: ResultSnapshot, next: ResultSnapshot): ChangeMessage | null {
  const changedDuration = prev.duration !== next.duration;
  const changedTolerance = prev.tolerance !== next.tolerance;
  if (!changedDuration && !changedTolerance) return null;

  const prevMatches = prev.perfect + prev.acceptable;
  const nextMatches = next.perfect + next.acceptable;
  const delta = nextMatches - prevMatches;

  if (changedDuration) {
    if (delta > 0) {
      const shorter = next.duration < prev.duration;
      return {
        headline: `${times(delta)} opened up`,
        detail: shorter
          ? `Shortening the meeting by ${prev.duration - next.duration} minutes ${
              next.tolerance === 0
                ? "lets these times fit everyone's preferred hours."
                : "makes room for these times."
            }`
          : `A ${next.duration}-minute meeting leaves more workable times.`,
      };
    }
    if (delta < 0) {
      const longer = next.duration > prev.duration;
      return {
        headline: `${times(-delta)} dropped off`,
        detail: longer
          ? `A ${next.duration}-minute meeting no longer fits ${
              -delta === 1 ? "that time" : "those times"
            } within everyone's ${next.tolerance === 0 ? "preferred hours" : "flexibility"}.`
          : `Fewer times work at ${next.duration} minutes.`,
      };
    }
    return {
      headline: nextMatches === 0 ? "Still nothing fits everyone" : `Still ${times(nextMatches)}`,
      detail:
        nextMatches === 0
          ? `A ${next.duration}-minute meeting still doesn't fit everyone's ${
              next.tolerance === 0 ? "preferred hours" : "flexibility"
            }. More flexibility would help.`
          : "Changing the duration didn't change how many times work.",
    };
  }

  // Working-hours flexibility changed.
  const looser = next.tolerance > prev.tolerance;
  if (delta > 0) {
    const who = next.maxCompromised <= 1 ? "one participant" : "a participant or two";
    return {
      headline: `${delta} close match${delta === 1 ? "" : "es"} opened up`,
      detail: `Each asks ${who} to shift by up to ${next.tolerance} minutes.`,
    };
  }
  if (delta < 0) {
    return {
      headline: `${times(-delta)} dropped off`,
      detail: `Tightening working hours rules ${-delta === 1 ? "it" : "them"} out.`,
    };
  }
  return {
    headline: nextMatches === 0 ? "Still nothing fits everyone" : "No new times",
    detail: looser
      ? `Even with more flexibility, no extra times open up at ${next.duration} minutes. A shorter meeting would.`
      : "Tightening working hours didn't remove any times.",
  };
}
