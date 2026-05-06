import React from "react";
import { Field } from "@/app/components/ui/Panel";
import type { ScanTarget } from "@/lib/rcsTypes";

export function CodeInput({
  label,
  value,
  onChange,
  scanTarget,
  startScan,
  placeholder,
  mark,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  scanTarget: ScanTarget;
  startScan: (target: ScanTarget) => void;
  placeholder: string;
  mark: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <div className="input-row">
        <div className="input-wrap">
          <span className="input-mark" aria-hidden="true">{mark}</span>
          <input
            suppressHydrationWarning
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="field-input field-input-code field-input-with-mark"
          />
        </div>
        <button
          type="button"
          onClick={() => startScan(scanTarget)}
          className="icon-button scan-button"
          aria-label={`Quét ${label}`}
        >
          QR
        </button>
      </div>
    </Field>
  );
}
