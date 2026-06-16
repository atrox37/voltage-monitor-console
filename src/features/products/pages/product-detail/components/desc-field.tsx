import React from "react";

export function DescField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-panel-border/40 py-2">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
