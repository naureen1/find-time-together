import { MEETING, PARTICIPANTS, type Duration } from "../lib/scheduling";

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export function MeetingHeader({ duration }: { duration: Duration }) {
  return (
    <header className="ftt-header">
      <div>
        <p className="ftt-eyebrow">Scheduling</p>
        <h1 className="ftt-title">{MEETING.title}</h1>
        <div className="ftt-meta">
          <span className="ftt-tnum">{duration} minutes</span>
          <span className="ftt-meta-sep" aria-hidden="true" />
          <span>{MEETING.participantCount} participants</span>
          <span className="ftt-meta-sep" aria-hidden="true" />
          <span>across 4 time zones</span>
        </div>
      </div>
      <ul className="ftt-people" aria-label="Participants">
        {PARTICIPANTS.map((p) => (
          <li key={p.id} className="ftt-person">
            <span className="ftt-avatar" aria-hidden="true">
              {initials(p.name)}
            </span>
            <span>
              <span className="ftt-person-name">{p.name}</span>{" "}
              <span className="ftt-person-city ftt-tnum">
                {p.city} · {p.offsetLabel}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </header>
  );
}
