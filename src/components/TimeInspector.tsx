import { useEffect, useRef } from "react";
import {
  DAYS,
  PARTICIPANTS,
  type Candidate,
  type Evaluation,
  fmtTime,
} from "../lib/scheduling";
import { candidateReasoning, organizerTime, statusText } from "../lib/explain";

const ORGANIZER = PARTICIPANTS.find((p) => p.organizer)!;

function statusGlyph(e: Evaluation) {
  if (e.status === "ideal") return { glyph: "", cls: " ftt-glyph-ideal" };
  if (e.status === "busy") return { glyph: "×", cls: "" };
  return { glyph: "±", cls: "" };
}

export function TimeInspector({
  candidate,
  onClose,
  onSelect,
}: {
  candidate: Candidate | null;
  onClose: () => void;
  onSelect: (c: Candidate) => void;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!candidate) return;
    restoreRef.current = document.activeElement as HTMLElement;
    const node = drawerRef.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button, [href], select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus();
    };
  }, [candidate, onClose]);

  if (!candidate) return null;

  const day = DAYS[candidate.day];
  const time = organizerTime(candidate, ORGANIZER);
  const reasoning = candidateReasoning(candidate);

  return (
    <>
      <div className="ftt-scrim" onClick={onClose} />
      <div
        className="ftt-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ftt-drawer-title"
      >
        <div className="ftt-drawer-head">
          <div>
            <h2 className="ftt-drawer-title" id="ftt-drawer-title">
              {day.weekday} {time}{" "}
              <span style={{ color: "var(--text-3)", fontWeight: 400 }}>Dublin</span>
            </h2>
            <p className="ftt-drawer-sub">How this time lands for each participant</p>
          </div>
          <button className="ftt-iconbtn" onClick={onClose} aria-label="Close inspector">
            ✕
          </button>
        </div>

        <div className="ftt-drawer-body">
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {candidate.evaluations.map((e) => {
              const g = statusGlyph(e);
              return (
                <li className="ftt-pstatus" key={e.participant.id}>
                  <div className="ftt-pstatus-main">
                    <div className="ftt-pstatus-name">
                      <span className={"ftt-glyph" + g.cls} aria-hidden="true">
                        {g.glyph}
                      </span>
                      {e.participant.name}
                    </div>
                    <div className="ftt-pstatus-loc ftt-tnum">
                      {e.participant.city} · {e.participant.offsetLabel}
                    </div>
                    <div className="ftt-pstatus-note">{statusText(e)}</div>
                  </div>
                  <div className="ftt-pstatus-time ftt-tnum">
                    {fmtTime(e.localStartMin)}–{fmtTime(e.localEndMin)}
                    <small>local time</small>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="ftt-explain">
            <h4>Why this time</h4>
            {reasoning.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>

        <div className="ftt-drawer-foot">
          <button className="ftt-btn" onClick={onClose}>
            Back
          </button>
          <button className="ftt-btn ftt-btn-primary" onClick={() => onSelect(candidate)}>
            Select this time
          </button>
        </div>
      </div>
    </>
  );
}
