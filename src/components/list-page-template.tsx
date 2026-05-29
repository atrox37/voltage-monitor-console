import { type ReactNode, type ComponentType, useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, RotateCcw,
  Pencil, Trash2, Eye, Download, Power, RotateCw, Link2Off, Activity,
  Boxes, GitBranch, Send, Search, MoreVertical,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export type Column<T> = {
  key: keyof T | string;
  title: string;
  width?: string | number;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => ReactNode;
};

export type FilterField =
  | { type: "text"; key: string; label: string; placeholder?: string }
  | { type: "select"; key: string; label: string; options: { label: string; value: string }[] };

export type ListPageProps<T extends { id: string | number }> = {
  title: string;
  filters?: FilterField[];
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  onAdd?: () => void;
  rowActions?: (row: T) => ReactNode;
  emptyText?: string;
};

export function ListPageTemplate<T extends { id: string | number }>({
  title,
  filters = [],
  columns,
  rows,
  pageSize = 10,
  onAdd,
  rowActions,
  emptyText = "暂无数据",
}: ListPageProps<T>) {
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [compactActions, setCompactActions] = useState(false);

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const check = () => setCompactActions(el.clientWidth < 820);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      Object.entries(filterState).every(([k, v]) => {
        if (!v) return true;
        const val = String((r as any)[k] ?? "").toLowerCase();
        return val.includes(v.toLowerCase());
      }),
    );
  }, [rows, filterState]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const applyQuery = () => {
    setFilterState(draft);
    setPage(1);
  };
  const resetQuery = () => {
    setDraft({});
    setFilterState({});
    setPage(1);
  };

  return (
    <main className="vt-page-content">
      <h2 className="vt-section-title text-base">{title}</h2>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="vt-glass px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {filters.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <label className="whitespace-nowrap text-xs text-text-secondary">
                  {f.label}：
                </label>
                {f.type === "text" ? (
                  <input
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    placeholder={f.placeholder ?? "请输入"}
                    className="h-8 w-52 rounded-md border border-panel-border bg-background/40 px-3 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/60"
                  />
                ) : (
                  <select
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    className="h-8 w-52 rounded-md border border-panel-border bg-background/40 px-2 text-sm text-foreground outline-none focus:border-primary/60"
                  >
                    <option value="">全部</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            <div className="ml-auto flex gap-2">
              <button
                onClick={applyQuery}
                className="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-110"
              >
                <Search className="h-3.5 w-3.5" />
                查询
              </button>
              <button
                onClick={resetQuery}
                className="flex h-8 items-center gap-1 rounded-md border border-panel-border bg-panel px-3 text-xs text-text-secondary hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="vt-glass flex-1 p-0">
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-2.5">
          <span className="text-xs text-text-secondary">
            共 <span className="font-semibold text-foreground">{filtered.length}</span> 条
          </span>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" /> 新增
            </button>
          )}
        </div>
        <div ref={tableWrapRef} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-text-muted">
                {columns.map((c) => (
                  <th
                    key={String(c.key)}
                    style={{ width: c.width, textAlign: c.align ?? "left" }}
                    className="px-4 py-3 font-medium"
                  >
                    {c.title}
                  </th>
                ))}
                {rowActions && <th className="px-4 py-3 text-right font-medium">操作</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (rowActions ? 1 : 0)}
                    className="px-4 py-16 text-center text-sm text-text-muted"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, i) => (
                  <tr
                    key={row.id}
                    className="border-t border-panel-border/60 transition hover:bg-panel/40"
                  >
                    {columns.map((c) => (
                      <td
                        key={String(c.key)}
                        style={{ textAlign: c.align ?? "left" }}
                        className="px-4 py-3 text-foreground"
                      >
                        {c.render ? c.render(row, i) : String((row as any)[c.key] ?? "")}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3 text-right">{rowActions(row)}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-1 border-t border-panel-border px-4 py-2.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded border border-panel-border bg-panel text-text-secondary disabled:opacity-40 hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="rounded bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {page}
          </span>
          <span className="px-1 text-xs text-text-muted">/ {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded border border-panel-border bg-panel text-text-secondary disabled:opacity-40 hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </main>
  );
}

/* ---- helpers ---- */
export function StatusBadge({
  status,
}: {
  status: "online" | "warning" | "critical" | "disabled";
}) {
  const map = {
    online:   { cls: "text-status-online bg-status-online/15",     label: "正常" },
    warning:  { cls: "text-status-warning bg-status-warning/15",   label: "告警" },
    critical: { cls: "text-status-critical bg-status-critical/15", label: "故障" },
    disabled: { cls: "text-text-muted bg-panel-heavy",             label: "禁用" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const ROW_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  编辑: Pencil,
  删除: Trash2,
  详情: Eye,
  预览: Eye,
  导出: Download,
  启用: Power,
  停用: Power,
  禁用: Power,
  重启: RotateCw,
  解绑: Link2Off,
  测试连通: Activity,
  物模型: Boxes,
  新增子机构: GitBranch,
  下发: Send,
};

export function RowBtn({
  children, onClick, danger, icon: IconProp, confirm,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: ComponentType<{ className?: string }>;
  /** If provided, clicking opens a confirm dialog before invoking onClick. */
  confirm?: { description: ReactNode; title?: string; confirmText?: string };
}) {
  const label = typeof children === "string" ? children : "";
  const Icon = IconProp ?? ROW_ICON_MAP[label];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const triggerConfirm = danger || !!confirm;
  return (
    <>
      <button
        onClick={() => {
          if (triggerConfirm) setConfirmOpen(true);
          else onClick?.();
        }}
        className={`mx-0.5 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition ${
          danger
            ? "border-status-critical/40 text-status-critical hover:bg-status-critical/10"
            : "border-panel-border text-text-secondary hover:border-primary/40 hover:text-primary"
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {children}
      </button>
      {triggerConfirm && (
        <ConfirmDialog
          open={confirmOpen}
          title={confirm?.title ?? (danger ? "确认删除" : "确认操作")}
          description={
            confirm?.description ?? <>确定要执行此操作吗？该操作不可恢复。</>
          }
          confirmText={confirm?.confirmText ?? (danger ? "删除" : "确定")}
          danger={danger}
          onConfirm={() => onClick?.()}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
