import { SegmentedControl } from "./SegmentedControl";
import type { Duration, Tolerance } from "../lib/scheduling";

interface Props {
  duration: Duration;
  tolerance: Tolerance;
  onDuration: (d: Duration) => void;
  onTolerance: (t: Tolerance) => void;
}

export function ConstraintPanel({ duration, tolerance, onDuration, onTolerance }: Props) {
  return (
    <aside className="ftt-card ftt-panel" aria-label="Scheduling constraints">
      <h2>Constraints</h2>

      <SegmentedControl<Duration>
        legend="Meeting duration"
        name="duration"
        value={duration}
        onChange={onDuration}
        options={[
          { value: 30, label: "30 min" },
          { value: 45, label: "45 min" },
          { value: 60, label: "60 min" },
        ]}
      />

      <SegmentedControl<Tolerance>
        legend="Working hours"
        name="tolerance"
        value={tolerance}
        onChange={onTolerance}
        orientation="column"
        note="How far outside someone's preferred hours a meeting may fall before it stops counting as a match."
        options={[
          { value: 0, label: "Keep within preferred hours" },
          { value: 30, label: "Allow up to 30 min outside" },
          { value: 60, label: "Allow up to 1 hour outside" },
        ]}
      />
    </aside>
  );
}
