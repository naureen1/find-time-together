interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  orientation?: "row" | "column";
  note?: string;
}

/**
 * A segmented control. Native radios keep it keyboard-operable and announced
 * as a group; the visual segments are purely presentational on top.
 */
export function SegmentedControl<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  orientation = "row",
  note,
}: Props<T>) {
  return (
    <fieldset className="ftt-field">
      <legend>{legend}</legend>
      {/* The fieldset + legend already exposes this as a labelled group of
          native radios, so no explicit role/aria-label is needed here. */}
      <div className={"ftt-seg" + (orientation === "column" ? " ftt-seg-col" : "")}>
        {options.map((opt) => (
          <label key={String(opt.value)}>
            <input
              type="radio"
              name={name}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {note && <p className="ftt-field-note">{note}</p>}
    </fieldset>
  );
}
