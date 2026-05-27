import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function VtDrawer({
  open,
  onClose,
  title,
  width = 480,
  footer,
  children,
  offsetRight = 0,
  hideOverlay = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  footer?: ReactNode;
  children: ReactNode;
  offsetRight?: number;
  hideOverlay?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {!hideOverlay && (
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      <aside
        style={{ width, right: offsetRight }}
        className={`absolute top-0 flex h-full flex-col border-l border-panel-border bg-background shadow-2xl transition-all duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex h-14 items-center justify-between border-b border-panel-border px-5">
          <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted transition hover:bg-panel hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

/* ---- form primitives ---- */
export function VtField({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  /** Stack label above content (use for wide editors like tables) */
  full?: boolean;
}) {
  if (full) {
    return (
      <div className="mb-4">
        <label className="mb-1 block text-xs text-text-secondary">
          {required && <span className="mr-0.5 text-status-critical">*</span>}
          {label}
        </label>
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div className="mb-4 grid grid-cols-[72px_1fr] items-center gap-3">
      <label className="text-right text-xs text-text-secondary">
        {required && <span className="mr-0.5 text-status-critical">*</span>}
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

export const vtInputCls =
  "h-9 w-full rounded-md border border-panel-border bg-background/40 px-3 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/60";

export function VtBtn({
  variant = "primary",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const cls =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:brightness-110"
      : "border border-panel-border bg-panel text-text-secondary hover:text-foreground";
  return (
    <button
      {...rest}
      className={`h-8 rounded-md px-4 text-xs font-semibold transition ${cls} ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function VtSegmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T; tone?: "critical" | "online" }[];
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-panel-border">
      {options.map((o) => {
        const active = value === o.value;
        const tone =
          o.tone === "critical"
            ? "bg-status-critical text-white"
            : o.tone === "online"
              ? "bg-status-online text-white"
              : "bg-primary text-primary-foreground";
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1 text-xs transition ${
              active ? tone : "bg-panel text-text-secondary hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
