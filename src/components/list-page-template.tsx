import { type ReactNode, useMemo, useRef, useState } from "react";
import { Button, Card, Dropdown, Form, Input, Pagination, Select, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { MoreOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Table } from "antd";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { getSorterColumnKey, useTableScrollSync, vtActionColumn } from "@/lib/table-utils";
import { useAdaptiveTableScrollY, useTableBodyMaxScrollY } from "@/lib/use-table-height";
import { useTranslation } from "@/i18n";
import { useFormPlaceholder } from "@/lib/form-placeholder";

export {
  RowActionBtn,
  RowActionGroup,
  RowActionToggle,
  RowBtn,
} from "@/components/row-action-buttons";
export { StatusBadge } from "@/components/status-display";
export type { StatusKind } from "@/components/status-display";

import type { PageQuery } from "@/types";

export type Column<T> = {
  key: keyof T | string;
  title: string;
  width?: string | number;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => ReactNode;
  /** 服务端排序字段（如 t.create_time） */
  sortKey?: string;
  sortable?: boolean;
};

export type FilterField =
  | { type: "text"; key: string; label: string; placeholder?: string }
  | { type: "select"; key: string; label: string; options: { label: string; value: string }[] }
  | {
      type: "orgTree";
      key: string;
      label: string;
      nodes: OrgNode[];
      placeholder?: string;
    };

export type ListPageProps<T extends { id: string | number }> = {
  title: string;
  filters?: FilterField[];
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  onAdd?: () => void;
  rowActions?: (row: T) => ReactNode;
  emptyText?: string;
  loading?: boolean;
  serverSide?: boolean;
  totalCount?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSearch?: () => void;
  onReset?: () => void;
  filterValues?: Record<string, string>;
  onFilterValuesChange?: (draft: Record<string, string>) => void;
  actionColumnWidth?: number;
  addNode?: ReactNode;
  sorts?: PageQuery["sorts"];
  onSortsChange?: (sorts: PageQuery["sorts"]) => void;
};

export function ListPageTemplate<T extends { id: string | number }>({
  title,
  filters = [],
  columns,
  rows,
  pageSize = DEFAULT_PAGE_SIZE,
  onAdd,
  rowActions,
  emptyText,
  loading = false,
  serverSide = false,
  totalCount,
  page: controlledPage,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onReset,
  filterValues,
  onFilterValuesChange,
  actionColumnWidth = 220,
  addNode,
  sorts,
  onSortsChange,
}: ListPageProps<T>) {
  const { t } = useTranslation();
  const ph = useFormPlaceholder();
  const resolvedEmpty = emptyText ?? t("common.noData");
  const [localDraft, setLocalDraft] = useState<Record<string, string>>({});
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [localPage, setLocalPage] = useState(1);

  const draft = filterValues ?? localDraft;
  const page = serverSide ? (controlledPage ?? 1) : localPage;

  const patchDraft = (patch: Record<string, string>) => {
    const next = { ...draft, ...patch };
    if (filterValues && onFilterValuesChange) onFilterValuesChange(next);
    else setLocalDraft(next);
  };

  const inputPlaceholder = (label: string) => ph.input(label);
  const selectPlaceholder = (label: string) => ph.select(label);

  const filtered = useMemo(() => {
    if (serverSide) return rows;
    return rows.filter((r) =>
      Object.entries(filterState).every(([k, v]) => {
        if (!v) return true;
        const val = String((r as Record<string, unknown>)[k] ?? "").toLowerCase();
        return val.includes(v.toLowerCase());
      }),
    );
  }, [rows, filterState, serverSide]);

  const totalItems = serverSide ? (totalCount ?? rows.length) : filtered.length;
  const pageRows = serverSide ? rows : filtered.slice((page - 1) * pageSize, page * pageSize);

  const setPage = (next: number) => {
    if (serverSide) onPageChange?.(next);
    else setLocalPage(next);
  };

  const applyQuery = () => {
    if (serverSide) onSearch?.();
    else {
      setFilterState(draft);
      setPage(1);
    }
  };

  const resetQuery = () => {
    const empty: Record<string, string> = {};
    if (serverSide) {
      onFilterValuesChange?.(empty);
      onReset?.();
    } else {
      setLocalDraft(empty);
      setFilterState(empty);
      setPage(1);
    }
  };

  const tableColumns: ColumnsType<T> = useMemo(() => {
    const activeSort = sorts?.[0];
    const cols: ColumnsType<T> = columns.map((c) => ({
      key: String(c.key),
      title: c.title,
      dataIndex: String(c.key),
      width: c.width,
      align: c.align,
      ellipsis: true,
      sorter: c.sortable ? true : undefined,
      sortOrder:
        c.sortable && c.sortKey && activeSort?.column === c.sortKey
          ? activeSort.order === "asc"
            ? "ascend"
            : "descend"
          : undefined,
      render: c.render
        ? (_: unknown, row: T, index: number) => c.render!(row, index)
        : (val: unknown) => (val == null || val === "" ? "—" : String(val)),
    }));
    if (rowActions) {
      cols.push(vtActionColumn(t("common.actions"), rowActions, actionColumnWidth));
    }
    return cols;
  }, [actionColumnWidth, columns, rowActions, sorts, t]);

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const maxScrollY = useTableBodyMaxScrollY(tableWrapRef);
  const syncRef = useTableScrollSync([pageRows, tableColumns, maxScrollY]);
  const tableScroll = useAdaptiveTableScrollY(syncRef, maxScrollY, [
    pageRows,
    tableColumns,
    maxScrollY,
  ]);

  return (
    <main className="vt-page-content vt-page-fill flex flex-col gap-3 p-4">
      <Typography.Title level={4} className="!mb-0 !text-foreground">
        {title}
      </Typography.Title>

      {filters.length > 0 && (
        <Card size="small" variant="borderless" className="vt-ant-filter-card shrink-0">
          <Form layout="inline" className="flex w-full flex-wrap items-center gap-y-2">
            {filters.map((f) => (
              <Form.Item key={f.key} label={f.label}>
                {f.type === "text" ? (
                  <Input
                    allowClear
                    value={draft[f.key] ?? ""}
                    placeholder={f.placeholder ?? inputPlaceholder(f.label)}
                    onChange={(e) => patchDraft({ [f.key]: e.target.value })}
                    style={{ width: 208 }}
                  />
                ) : f.type === "orgTree" ? (
                  <OrgTreeSelect
                    nodes={f.nodes}
                    value={draft[f.key] ?? ""}
                    onChange={(v) => patchDraft({ [f.key]: v })}
                    placeholder={f.placeholder ?? selectPlaceholder(f.label)}
                    style={{ width: 208 }}
                  />
                ) : (
                  <Select
                    allowClear
                    className="vt-select-control"
                    classNames={{ popup: { root: "vt-select-popup" } }}
                    placeholder={selectPlaceholder(f.label)}
                    value={draft[f.key] || undefined}
                    onChange={(v) => patchDraft({ [f.key]: String(v ?? "") })}
                    style={{ width: 208 }}
                    options={f.options.filter((opt) => opt.value !== "")}
                  />
                )}
              </Form.Item>
            ))}
            <Form.Item className="!mb-0 ml-auto">
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={applyQuery}>
                  {t("common.query")}
                </Button>
                <Button icon={<ReloadOutlined />} onClick={resetQuery}>
                  {t("common.reset")}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card
        size="small"
        variant="borderless"
        className="flex min-h-0 flex-1 flex-col vt-ant-table-card"
        styles={{
          body: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 0 },
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] px-4 py-2">
          <span className="text-xs text-[var(--text-secondary)]">
            {t("common.total", { count: totalItems })}
          </span>
          {addNode ??
            (onAdd ? (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>
                {t("common.add")}
              </Button>
            ) : null)}
        </div>

        <div ref={tableWrapRef} className="min-h-0 min-w-0 flex-1">
          <div ref={syncRef} className="h-full min-h-0 min-w-0">
          <Table<T>
            rowKey="id"
            size="middle"
            loading={loading}
            tableLayout="fixed"
            sticky
            pagination={false}
            className={`vt-ant-data-table ${tableScroll.hasVerticalOverflow ? "" : "vt-ant-data-table-no-y-scroll"}`.trim()}
            columns={tableColumns}
            dataSource={pageRows}
            scroll={{ x: "max-content", y: tableScroll.scrollY }}
            locale={{ emptyText: resolvedEmpty }}
            onChange={(_p, _f, sorter) => {
              if (!onSortsChange) return;
              const colKey = getSorterColumnKey(sorter);
              if (!colKey) return;
              const col = columns.find((c) => String(c.key) === colKey);
              if (!col?.sortKey) return;
              const order =
                !Array.isArray(sorter) && sorter.order === "ascend"
                  ? "asc"
                  : !Array.isArray(sorter) && sorter.order === "descend"
                    ? "desc"
                    : null;
              if (!order) {
                onSortsChange([]);
                return;
              }
              onSortsChange([{ column: col.sortKey, order }]);
            }}
          />
          </div>
        </div>

        <div className="vt-table-pagination-bar shrink-0 border-t border-[var(--panel-border)] px-4 py-2">
          <Pagination
            className="vt-ant-pagination"
            size="small"
            current={page}
            pageSize={pageSize}
            total={totalItems}
            showSizeChanger
            pageSizeOptions={[10, 20, 50, 100]}
            hideOnSinglePage={false}
            onChange={(p, s) => {
              if (s !== pageSize) onPageSizeChange?.(s);
              else setPage(p);
            }}
            onShowSizeChange={(_c, s) => onPageSizeChange?.(s)}
          />
        </div>
      </Card>
    </main>
  );
}

export function ActionsDropdown({ children }: { children: ReactNode }) {
  return (
    <Dropdown
      menu={{ items: [] }}
      dropdownRender={() => <Space direction="vertical">{children}</Space>}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );
}
