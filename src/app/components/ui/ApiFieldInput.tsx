import React from "react";
import { QrCode } from "lucide-react";
import { Field } from "@/app/components/ui/Panel";
import type { ApiFormField, ScanTarget } from "@/lib/rcsTypes";

export function ApiFieldInput({
  apiId,
  field,
  value,
  onChange,
  startScan,
}: {
  apiId: string;
  field: ApiFormField;
  value: string;
  onChange: (value: string) => void;
  startScan: (target: ScanTarget) => void;
}) {
  const input =
    field.type === "select" ? (
      <select suppressHydrationWarning value={value} onChange={(event) => onChange(event.target.value)} className="field-input">
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : field.type === "textarea" ? (
      <textarea
        suppressHydrationWarning
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="field-input resize-y"
        placeholder={field.placeholder}
      />
    ) : (
      <input
        suppressHydrationWarning
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={field.type === "number" ? "number" : "text"}
        className="field-input"
        placeholder={field.placeholder}
      />
    );

  return (
    <div className={field.wide ? "md:col-span-2" : ""}>
      <Field label={field.label}>
        <div className="flex gap-2">
          <div className="flex-1">{input}</div>
          {field.qr && (
            <button
              type="button"
              onClick={() => startScan({ kind: "apiField", apiId, fieldName: field.name, label: field.label })}
              className="icon-button h-12 w-12 shrink-0 bg-slate-950 text-white hover:bg-slate-800 active:bg-slate-700"
              aria-label={`Quét ${field.label}`}
            >
              <QrCode className="h-5 w-5" />
            </button>
          )}
        </div>
        {field.helper && <span className="mt-1 block text-xs text-slate-500">{field.helper}</span>}
      </Field>
    </div>
  );
}
