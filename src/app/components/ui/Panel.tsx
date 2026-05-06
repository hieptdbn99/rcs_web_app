import React from "react";

// ─── Panel ────────────────────────────────────────────────────────────────────

export function Panel({
  title,
  mark,
  children,
}: {
  title: string;
  mark: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-mark" aria-hidden="true">{mark}</span>
        <h2 className="panel-title">{title}</h2>
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
    </div>
  );
}

// ─── TopTab ───────────────────────────────────────────────────────────────────

export function TopTab({
  active,
  mark,
  label,
  onClick,
}: {
  active: boolean;
  mark: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`top-tab${active ? " top-tab-active" : ""}`}
    >
      <span className="top-tab-mark" aria-hidden="true">{mark}</span>
      <span>{label}</span>
    </button>
  );
}
