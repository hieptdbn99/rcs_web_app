import React from "react";
import { QrCode } from "lucide-react";
import { Field } from "@/app/components/ui/Panel";
import type { ScanTarget } from "@/lib/rcsTypes";

export function CodeInput({
  label,
  value,
  onChange,
  scanTarget,
  startScan,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  scanTarget: ScanTarget;
  startScan: (target: ScanTarget) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
          <input
            suppressHydrationWarning
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="field-input pl-10 font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => startScan(scanTarget)}
          className="icon-button h-12 w-12 shrink-0 bg-slate-950 text-white hover:bg-slate-800 active:bg-slate-700"
          aria-label={`Quét ${label}`}
        >
          <QrCode className="h-5 w-5" />
        </button>
      </div>
    </Field>
  );
}
