import { type ReactNode, useEffect, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";
import { VtBtn } from "@/components/vt-drawer";

export function ConfirmDialog({
  open,
  title = "确认操作",
  description,
  confirmText = "删除",
  cancelText = "取消",
  danger = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[400px] overflow-hidden rounded-lg border border-panel-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-panel-border px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${danger ? "text-status-critical" : "text-status-warn"}`} />
            <h3 className="font-heading text-sm font-semibold tracking-wider text-foreground">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-text-muted transition hover:bg-panel hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="px-5 py-5 text-sm text-text-secondary">{description}</div>
        <footer className="flex justify-end gap-2 border-t border-panel-border px-5 py-3">
          <VtBtn variant="ghost" onClick={onClose}>{cancelText}</VtBtn>
          <VtBtn
            onClick={() => { onConfirm(); onClose(); }}
            className={danger ? "bg-status-critical hover:brightness-110" : ""}
          >
            {confirmText}
          </VtBtn>
        </footer>
      </div>
    </div>
  );
}

/** Imperative confirm hook — render {confirmNode} once, call confirm({...}) to trigger */
export function useConfirm() {
  const [state, setState] = useState<{
    description: ReactNode;
    title?: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const confirm = useCallback(
    (opts: {
      description: ReactNode;
      title?: string;
      confirmText?: string;
      danger?: boolean;
      onConfirm: () => void;
    }) => setState(opts),
    [],
  );

  const confirmNode = (
    <ConfirmDialog
      open={!!state}
      title={state?.title}
      description={state?.description ?? ""}
      confirmText={state?.confirmText}
      danger={state?.danger ?? true}
      onConfirm={() => state?.onConfirm()}
      onClose={() => setState(null)}
    />
  );

  return { confirm, confirmNode };
}
