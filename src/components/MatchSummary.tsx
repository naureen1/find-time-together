import { useState } from "react";
import { DAYS, PARTICIPANTS, type Candidate } from "../lib/scheduling";
import {
  candidateReasoning,
  compromiseLine,
  organizerTime,
  overlapExplanation,
  recommendationSummary,
  type ChangeMessage,
} from "../lib/explain";

const ORGANIZER = PARTICIPANTS.find((p) => p.organizer)!;
const keyOf = (c: Candidate) => `${c.day}-${c.utcStartMin}`;

interface Props {
  matches: Candidate[];
  recommendation: Candidate | null;
  selected: Candidate | null;
  revealed: boolean;
  change: ChangeMessage | null;
  onInspect: (c: Candidate) => void;
  onReveal: () => void;
}

export function MatchSummary({
  matches,
  recommendation,
  selected,
  revealed,
  change,
  onInspect,
  onReveal,
}: Props) {
  const perfect = matches.filter((c) => c.verdict === "perfect");
  const acceptable = matches.filter((c) => c.verdict === "acceptable");
  const isSelected = (c: Candidate) => !!selected && keyOf(c) === keyOf(selected);

  let title: string;
  let sub: string;
  if (perfect.length > 0) {
    const s = perfect.length === 1 ? "" : "s";
    title = `${perfect.length} time${s} fit everyone's preferred hours`;
    sub = "Choose one, or inspect how each lands for the group before you commit.";
  } else if (acceptable.length > 0) {
    const s = acceptable.length === 1 ? "" : "s";
    title = "No time fits everyone's preferred hours";
    sub = `${overlapExplanation(PARTICIPANTS)} ${acceptable.length} option${s} work within your flexibility.`;
  } else {
    title = "No time fits everyone's preferred hours";
    sub = `${overlapExplanation(PARTICIPANTS)} Try a shorter meeting, allow more flexibility, or take the closest option below.`;
  }

  // Shortlist. When the recommendation is shown in its own panel, keep it out
  // of the list to avoid repeating it.
  const shortlist: Candidate[] = [];
  const seen = new Set<string>();
  const push = (c: Candidate | null) => {
    if (c && !seen.has(keyOf(c))) {
      seen.add(keyOf(c));
      shortlist.push(c);
    }
  };
  if (revealed && recommendation) seen.add(keyOf(recommendation));
  else push(recommendation);
  for (const m of matches) {
    if (shortlist.length >= 4) break;
    push(m);
  }

  return (
    <section className="ftt-card ftt-summary" aria-label="Suggested times">
      <div className="ftt-summary-head">
        <div>
          <h2 className="ftt-summary-title">{title}</h2>
          <p className="ftt-summary-sub">{sub}</p>
        </div>
        <button className="ftt-btn ftt-btn-primary" onClick={onReveal}>
          Find least disruptive time
        </button>
      </div>

      {/* Consequence of the last constraint change. Visual only; the polite
          announcement is carried by a persistent live region in App. */}
      <div className="ftt-change">
        {change && (
          <>
            <span className="ftt-change-head">{change.headline}</span>
            <span className="ftt-change-detail">{change.detail}</span>
          </>
        )}
      </div>

      {revealed && recommendation && (
        <RecommendationPanel
          candidate={recommendation}
          selected={isSelected(recommendation)}
          onWhy={() => onInspect(recommendation)}
        />
      )}

      {/* Selected-time confirmation. Visual only; announced from App. */}
      <div className="ftt-selected-note">
        {selected && (
          <>
            <span className="ftt-check" aria-hidden="true">
              ✓
            </span>
            <span>
              <strong className="ftt-tnum">
                {DAYS[selected.day].weekday} · {organizerTime(selected, ORGANIZER)}
              </strong>{" "}
              selected <span className="ftt-selected-zone">Dublin</span>
            </span>
          </>
        )}
      </div>

      {shortlist.length > 0 && (
        <div className="ftt-times">
          {shortlist.map((c) => (
            <SuggestedTime
              key={keyOf(c)}
              candidate={c}
              recommended={!revealed && !!recommendation && keyOf(c) === keyOf(recommendation)}
              selected={isSelected(c)}
              onInspect={() => onInspect(c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecommendationPanel({
  candidate,
  selected,
  onWhy,
}: {
  candidate: Candidate;
  selected: boolean;
  onWhy: () => void;
}) {
  const day = DAYS[candidate.day];
  const time = organizerTime(candidate, ORGANIZER);
  return (
    <div
      className={"ftt-rec" + (selected ? " is-selected" : "")}
      aria-label="Least disruptive option"
    >
      <p className="ftt-rec-tag">Least disruptive option</p>
      <p className="ftt-rec-when ftt-tnum">
        {day.weekday} {time}
        <small>Dublin</small>
        {selected && <span className="ftt-badge ftt-badge-selected">Selected</span>}
      </p>
      <p className="ftt-rec-summary">{recommendationSummary(candidate)}</p>
      <p className="ftt-rec-metric">{compromiseLine(candidate)}</p>
      <div className="ftt-rec-actions">
        <button className="ftt-link" onClick={onWhy}>
          Why this time?
        </button>
      </div>
    </div>
  );
}

function SuggestedTime({
  candidate,
  recommended,
  selected,
  onInspect,
}: {
  candidate: Candidate;
  recommended: boolean;
  selected: boolean;
  onInspect: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const day = DAYS[candidate.day];
  const time = organizerTime(candidate, ORGANIZER);
  const reasoning = candidateReasoning(candidate);

  const badge = selected
    ? { text: "Selected", className: " ftt-badge-selected" }
    : candidate.verdict === "perfect"
    ? { text: "Fits everyone", className: "" }
    : recommended
    ? { text: "Least disruptive", className: "" }
    : { text: "Within flexibility", className: " ftt-badge-quiet" };

  return (
    <article
      className={
        "ftt-time" + (recommended ? " is-recommended" : "") + (selected ? " is-selected" : "")
      }
    >
      <div className="ftt-time-top">
        <h3 className="ftt-time-when ftt-tnum">
          {day.short} {time}
          <small>Dublin</small>
        </h3>
        <span className={"ftt-badge" + badge.className}>{badge.text}</span>
      </div>

      <div className="ftt-time-people">
        {candidate.evaluations.map((e) => (
          <span className="ftt-pill" key={e.participant.id}>
            <span
              className={"ftt-glyph" + (e.status === "ideal" ? " ftt-glyph-ideal" : "")}
              aria-hidden="true"
            >
              {e.status === "ideal" ? "" : "±"}
            </span>
            {e.participant.name}
            {e.driftMin > 0 && (
              <span className="ftt-tnum ftt-pill-drift">
                {" "}
                {e.edge === "before" ? "−" : "+"}
                {e.driftMin}m
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="ftt-time-actions">
        <button className="ftt-btn" onClick={onInspect}>
          Inspect per person
        </button>
        <button
          className="ftt-link"
          aria-expanded={showWhy}
          onClick={() => setShowWhy((v) => !v)}
        >
          {showWhy ? "Hide reasoning" : "Why this time?"}
        </button>
      </div>

      {showWhy && (
        <div className="ftt-why">
          <ul>
            {reasoning.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
