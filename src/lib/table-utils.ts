import { createElement, useEffect, useRef, type ReactNode } from "react";
import type { ColumnsType } from "antd/es/table";
import { RowActionGroup } from "@/components/row-action-buttons";

export {
  TABLE_HEAD_HEIGHT_MIDDLE,
  TABLE_HEAD_HEIGHT_SMALL,
  TABLE_PAGINATION_HEIGHT,
} from "@/lib/table-layout";

export function getSorterColumnKey(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const s = item as { columnKey?: React.Key; field?: React.Key };
  const key = s.columnKey ?? s.field;
  return key == null ? "" : String(key);
}

/** 横向滚动时同步表头 / 表体 / 底部 sticky 滚动条，避免固定列错位 */
export function useTableScrollSync(deps: unknown[]) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const body = root.querySelector<HTMLElement>(".ant-table-body");
    const header = root.querySelector<HTMLElement>(".ant-table-header");
    const stickyBar = root.querySelector<HTMLElement>(".ant-table-sticky-scroll");

    if (!body) return;

    const syncFromBody = () => {
      const left = body.scrollLeft;
      if (header && header.scrollLeft !== left) header.scrollLeft = left;
      if (stickyBar && stickyBar.scrollLeft !== left) stickyBar.scrollLeft = left;
    };

    const syncFromHeader = () => {
      if (!header) return;
      const left = header.scrollLeft;
      if (body.scrollLeft !== left) body.scrollLeft = left;
      if (stickyBar && stickyBar.scrollLeft !== left) stickyBar.scrollLeft = left;
    };

    const syncFromSticky = () => {
      if (!stickyBar) return;
      const left = stickyBar.scrollLeft;
      if (body.scrollLeft !== left) body.scrollLeft = left;
      if (header && header.scrollLeft !== left) header.scrollLeft = left;
    };

    body.addEventListener("scroll", syncFromBody, { passive: true });
    header?.addEventListener("scroll", syncFromHeader, { passive: true });
    stickyBar?.addEventListener("scroll", syncFromSticky, { passive: true });

    const ro = new ResizeObserver(syncFromBody);
    ro.observe(body);

    const t0 = window.setTimeout(syncFromBody, 0);
    const t1 = window.setTimeout(syncFromBody, 120);

    return () => {
      body.removeEventListener("scroll", syncFromBody);
      header?.removeEventListener("scroll", syncFromHeader);
      stickyBar?.removeEventListener("scroll", syncFromSticky);
      ro.disconnect();
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return wrapRef;
}

export function vtActionColumn<T>(
  title: string,
  render: (row: T) => ReactNode,
  width = 220,
): ColumnsType<T>[number] {
  return {
    key: "__actions",
    title,
    fixed: "right",
    width,
    align: "left",
    render: (_: unknown, row: T) => createElement(RowActionGroup, null, render(row)),
  };
}
