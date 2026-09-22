import {
  DAYS,
  PARTICIPANTS,
  type Duration,
  type Evaluation,
  type Tolerance,
  type Verdict,
  evaluate,
  evaluateCandidate,
  fmtTime,
  gridTimes,
} from "../lib/scheduling";
import { statusText } from "../lib/explain";

const ORGANIZER_OFFSET = PARTICIPANTS.find((p) => p.organizer)!.offsetMin;

function cellMeta(e: Evaluation): { className: string; glyph: string } {
  switch (e.status) {
    case "ideal":
      return { className: "ftt-cell-ideal", glyph: "" };
    case "compromise":
      return { className: "ftt-cell-compromise", glyph: "±" };
    case "busy":
      return { className: "ftt-cell-busy", glyph: "×" };
    case "outside":
      return { className: "ftt-cell-outside", glyph: "" };
  }
}

const VERDICT_TEXT: Record<Verdict, { label: string; sr: string; className: string }> = {
  perfect: {
    label: "Yes",
    sr: "Everyone can meet at this time",
    className: "ftt-verdict-perfect",
  },
  acceptable: {
    label: "Close",
    sr: "Everyone can meet, with a small compromise",
    className: "ftt-verdict-acceptable",
  },
  blocked: {
    label: "–",
    sr: "Not everyone can meet — someone is busy or outside their hours",
    className: "ftt-verdict-blocked",
  },
};

interface Props {
  duration: Duration;
  tolerance: Tolerance;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  matchesPerDay: { perfect: number; acceptable: number }[];
}

export function AvailabilityGrid({
  duration,
  tolerance,
  selectedDay,
  onSelectDay,
  matchesPerDay,
}: Props) {
  const times = gridTimes();
  const day = DAYS[selectedDay];

  const dayHint = (i: number) => {
    const m = matchesPerDay[i];
    if (m.perfect > 0) return `${m.perfect} fit`;
    if (m.acceptable > 0) return `${m.acceptable} close`;
    return "—";
  };

  return (
    <section className="ftt-card" aria-label="Participant availability">
      <div
        className="ftt-tabs"
        role="tablist"
        aria-label="Day"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const dir = e.key === "ArrowRight" ? 1 : -1;
            const next = (selectedDay + dir + DAYS.length) % DAYS.length;
            onSelectDay(next);
            requestAnimationFrame(() =>
              document.getElementById(`ftt-tab-${next}`)?.focus()
            );
          }
        }}
      >
        {DAYS.map((d, i) => (
          <button
            key={d.index}
            role="tab"
            id={`ftt-tab-${i}`}
            aria-selected={i === selectedDay}
            aria-controls="ftt-grid-panel"
            tabIndex={i === selectedDay ? 0 : -1}
            className="ftt-tab"
            onClick={() => onSelectDay(i)}
          >
            <span className="ftt-tab-day">{d.short}</span>
            <span className="ftt-tab-hint ftt-tnum">{dayHint(i)}</span>
          </button>
        ))}
      </div>

      <div
        className="ftt-grid-wrap"
        id="ftt-grid-panel"
        role="tabpanel"
        aria-labelledby={`ftt-tab-${selectedDay}`}
        tabIndex={0}
      >
        <table className="ftt-grid">
          <caption>
            Availability on {day.weekday} {day.date}, in Dublin time, for a{" "}
            {duration}-minute meeting starting at each time. The top row shows whether
            everyone can meet; the rows below show each participant.
          </caption>
          <thead>
            <tr>
              <th className="ftt-rowhead" scope="col">
                <span className="ftt-sr">Participant</span>
              </th>
              {times.map((t) => (
                <th key={t} scope="col" className="ftt-tnum">
                  {fmtTime(t + ORGANIZER_OFFSET)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="ftt-overlaprow">
              <th className="ftt-rowhead" scope="row">
                Everyone
                <small>can meet?</small>
              </th>
              {times.map((t) => {
                const c = evaluateCandidate(PARTICIPANTS, day.index, t, duration, tolerance);
                const v = VERDICT_TEXT[c.verdict];
                return (
                  <td key={t}>
                    <span className="ftt-sr">{v.sr}</span>
                    <div className={`ftt-verdict ${v.className}`} aria-hidden="true">
                      {v.label}
                    </div>
                  </td>
                );
              })}
            </tr>
            {PARTICIPANTS.map((p) => (
              <tr className="ftt-prow" key={p.id}>
                <th className="ftt-rowhead" scope="row">
                  {p.name}
                  <small className="ftt-tnum">
                    {p.city} · {p.offsetLabel}
                  </small>
                </th>
                {times.map((t) => {
                  const ev = evaluate(p, day.index, t, duration, tolerance);
                  const meta = cellMeta(ev);
                  return (
                    <td key={t}>
                      <span className="ftt-sr">{statusText(ev)}</span>
                      <div
                        className={`ftt-cell ${meta.className}`}
                        aria-hidden="true"
                        title={statusText(ev)}
                      >
                        {meta.glyph}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ftt-legend" aria-hidden="true">
        <span className="ftt-legend-item">
          <span className="ftt-swatch ftt-cell-ideal" /> Within preferred hours
        </span>
        <span className="ftt-legend-item">
          <span className="ftt-swatch ftt-cell-compromise">±</span> Outside, within tolerance
        </span>
        <span className="ftt-legend-item">
          <span className="ftt-swatch ftt-cell-outside" /> Outside preferred hours
        </span>
        <span className="ftt-legend-item">
          <span className="ftt-swatch ftt-cell-busy">×</span> Busy
        </span>
      </div>
    </section>
  );
}
