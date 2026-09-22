import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAYS,
  PARTICIPANTS,
  type Candidate,
  type Duration,
  type Tolerance,
  findMatches,
  leastDisruptive,
} from "./lib/scheduling";
import {
  type ChangeMessage,
  type ResultSnapshot,
  diffMessage,
  organizerTime,
} from "./lib/explain";

const ORGANIZER = PARTICIPANTS.find((p) => p.organizer)!;
import { ProductIntro } from "./components/ProductIntro";
import { MeetingHeader } from "./components/MeetingHeader";
import { ConstraintPanel } from "./components/ConstraintPanel";
import { AvailabilityGrid } from "./components/AvailabilityGrid";
import { MatchSummary } from "./components/MatchSummary";
import { TimeInspector } from "./components/TimeInspector";

type Theme = "system" | "light" | "dark";

export default function App() {
  const [duration, setDuration] = useState<Duration>(45);
  const [tolerance, setTolerance] = useState<Tolerance>(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [inspected, setInspected] = useState<Candidate | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [change, setChange] = useState<ChangeMessage | null>(null);
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const matches = useMemo(
    () => findMatches(PARTICIPANTS, duration, tolerance),
    [duration, tolerance]
  );
  const recommendation = useMemo(
    () => leastDisruptive(PARTICIPANTS, duration),
    [duration]
  );

  const matchesPerDay = useMemo(
    () =>
      DAYS.map((d) => ({
        perfect: matches.filter((c) => c.day === d.index && c.verdict === "perfect").length,
        acceptable: matches.filter((c) => c.day === d.index && c.verdict === "acceptable")
          .length,
      })),
    [matches]
  );

  const perfectCount = matches.filter((c) => c.verdict === "perfect").length;
  const acceptableCount = matches.filter((c) => c.verdict === "acceptable").length;
  const maxCompromised = matches.reduce(
    (m, c) => (c.verdict === "acceptable" ? Math.max(m, c.compromisedCount) : m),
    0
  );

  // "What changed?" — compare the new results against the previous snapshot and
  // explain the consequence. Also drop a stale selection when constraints move.
  const prevSnapshot = useRef<ResultSnapshot>({
    duration,
    tolerance,
    perfect: perfectCount,
    acceptable: acceptableCount,
    maxCompromised,
  });

  useEffect(() => {
    const next: ResultSnapshot = {
      duration,
      tolerance,
      perfect: perfectCount,
      acceptable: acceptableCount,
      maxCompromised,
    };
    const msg = diffMessage(prevSnapshot.current, next);
    prevSnapshot.current = next;
    if (msg) {
      setChange(msg);
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, tolerance]);

  return (
    <div className="ftt-app">
      <ProductIntro />
      <MeetingHeader duration={duration} />

      <div className="ftt-body">
        <div className="ftt-main">
          <AvailabilityGrid
            duration={duration}
            tolerance={tolerance}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            matchesPerDay={matchesPerDay}
          />
          <MatchSummary
            matches={matches}
            recommendation={recommendation}
            selected={selected}
            revealed={revealed}
            change={change}
            onInspect={setInspected}
            onReveal={() => recommendation && setRevealed(true)}
          />
        </div>

        <ConstraintPanel
          duration={duration}
          tolerance={tolerance}
          onDuration={setDuration}
          onTolerance={setTolerance}
        />
      </div>

      <div className="ftt-sr" role="status" aria-live="polite">
        {change ? `${change.headline}. ${change.detail}` : ""}
      </div>
      <div className="ftt-sr" role="status" aria-live="polite">
        {selected
          ? `${DAYS[selected.day].weekday} ${organizerTime(selected, ORGANIZER)} Dublin selected.`
          : ""}
      </div>

      <footer className="ftt-foot">
        <span>A product design prototype by Naureen Shahid. Mock data; no calendars connected.</span>
        <div className="ftt-theme" role="group" aria-label="Colour theme">
          {(["system", "light", "dark"] as Theme[]).map((t) => (
            <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </footer>

      <TimeInspector
        candidate={inspected}
        onClose={() => setInspected(null)}
        onSelect={(c) => {
          setSelected(c);
          setInspected(null);
        }}
      />
    </div>
  );
}
