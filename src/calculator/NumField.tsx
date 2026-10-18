import { useState } from "react";

interface Props {
  id: string;
  /** Visible label. Without one the input stands alone and needs `ariaLabel`. */
  label?: string;
  ariaLabel?: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  list?: string;
  className?: string;
}

/** A number input that keeps what is being typed while it has focus and only
 *  commits finite numbers. When not focused it shows the committed value. */
export function NumField({ id, label, ariaLabel, value, onCommit, min, max, step, disabled, list, className }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const input = (
    <input
      id={id}
      className={className}
      type="number"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      list={list}
      disabled={disabled}
      value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = parseFloat(e.target.value);
        if (isFinite(v)) onCommit(v);
      }}
    />
  );
  if (label === undefined) return input;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {input}
    </div>
  );
}
