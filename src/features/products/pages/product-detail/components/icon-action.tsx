import React from "react";

export function IconAction({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`vt-detail-icon-btn p-1 ${danger ? "vt-detail-icon-btn--danger" : ""}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
