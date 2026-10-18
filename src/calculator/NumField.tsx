import { useState } from "react";

interface Props {
  id: string;
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/** A number input that keeps what is being typed while it has focus and only
 *  commits finite numbers. When not focused it shows the committed value. */
export function NumField({ id, label, value, onCommit, min, max, step }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft ?? String(value)}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = parseFloat(e.target.value);
          if (isFinite(v)) onCommit(v);
        }}
      />
    </div>
  );
}
