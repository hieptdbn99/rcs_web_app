import React from "react";
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
        className="field-input field-textarea"
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
    <div className={field.wide ? "form-span-2" : ""}>
      <Field label={field.label}>
        <div className="input-row">
          <div className="input-grow">{input}</div>
          {field.qr && (
            <button
              type="button"
              onClick={() => startScan({ kind: "apiField", apiId, fieldName: field.name, label: field.label })}
              className="icon-button scan-button"
              aria-label={`Quét ${field.label}`}
            >
              QR
            </button>
          )}
        </div>
        {field.helper && <span className="field-helper">{field.helper}</span>}
      </Field>
    </div>
  );
}
