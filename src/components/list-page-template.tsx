import { type ReactNode, type ComponentType, useMemo, useState } from "react";
import {
  Button, Card, Dropdown, Form, Input, Pagination, Select, Space, Tag, Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined,
  LinkOutlined, MoreOutlined, PlayCircleOutlined, PlusOutlined,
  PoweroffOutlined, ReloadOutlined, SearchOutlined, SendOutlined,
  SyncOutlined, ApartmentOutlined, AppstoreOutlined, RadarChartOutlined,
} from "@ant-design/icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { OrgTreeSelect, type OrgNode } from "@/components/org-tree-select";
import { VtDataTable, vtActionColumn } from "@/components/vt-table";
import { useTranslation } from "@/i18n";

export type Column<T> = {
  key: keyof T | string;
  title: string;
  width?: string | number;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => ReactNode;
};

export type FilterField =
  | { type: "text"; key: string; label: string; placeholder?: string }
  | { type: "select"; key: string; label: string; options: { label: string; value: string }[] }
  | { type: "orgTree"; key: string; label: string; nodes: OrgNode[]; allowAll?: boolean; placeholder?: string };

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
  onSearch?: () => void;
  onReset?: () => void;
  filterValues?: Record<string, string>;
  onFilterValuesChange?: (draft: Record<string, string>) => void;
  actionColumnWidth?: number;
};

export function ListPageTemplate<T extends { id: string | number }>({
  title,
  filters = [],
  columns,
  rows,
  pageSize = 10,
  onAdd,
  rowActions,
  emptyText,
  loading = false,
  serverSide = false,
  totalCount,
  page: controlledPage,
  onPageChange,
  onSearch,
  onReset,
  filterValues,
  onFilterValuesChange,
  actionColumnWidth = 220,
}: ListPageProps<T>) {
  const { t } = useTranslation();
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
    const cols: ColumnsType<T> = columns.map((c) => ({
      key: String(c.key),
      title: c.title,
      dataIndex: String(c.key),
      width: c.width,
      align: c.align,
      ellipsis: true,
      render: c.render
        ? (_: unknown, row: T, index: number) => c.render!(row, index)
        : (val: unknown) => (val == null || val === "" ? "—" : String(val)),
    }));
    if (rowActions) {
      cols.push(vtActionColumn(t("common.actions"), rowActions, actionColumnWidth));
    }
    return cols;
  }, [actionColumnWidth, columns, rowActions, t]);

  return (
    <main className="vt-page-content vt-page-fill flex flex-col gap-3 p-4">
      <Typography.Title level={4} className="!mb-0 !text-foreground">
        {title}
      </Typography.Title>

      {filters.length > 0 && (
        <Card size="small" bordered={false} className="vt-ant-filter-card shrink-0">
          <Form layout="inline" className="flex flex-wrap gap-y-2">
            {filters.map((f) => (
              <Form.Item key={f.key} label={f.label}>
                {f.type === "text" ? (
                  <Input
                    allowClear
                    value={draft[f.key] ?? ""}
                    placeholder={f.placeholder ?? "请输入"}
                    onChange={(e) => patchDraft({ [f.key]: e.target.value })}
                    style={{ width: 208 }}
                  />
                ) : f.type === "orgTree" ? (
                  <OrgTreeSelect
                    nodes={f.nodes}
                    value={draft[f.key] ?? ""}
                    onChange={(v) => patchDraft({ [f.key]: v })}
                    allowAll={f.allowAll ?? true}
                    placeholder={f.placeholder ?? "请选择机构"}
                    style={{ width: 208 }}
                  />
                ) : (
                  <Select
                    allowClear
                    placeholder="全部"
                    value={draft[f.key] || undefined}
                    onChange={(v) => patchDraft({ [f.key]: String(v ?? "") })}
                    style={{ width: 208 }}
                    options={[{ label: "全部", value: "" }, ...f.options]}
                  />
                )}
              </Form.Item>
            ))}
            <Form.Item className="ml-auto">
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
        bordered={false}
        className="flex min-h-0 flex-1 flex-col vt-ant-table-card"
        styles={{ body: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 0 } }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] px-4 py-2">
          <span className="text-xs text-[var(--text-secondary)]">
            {t("common.total", { count: totalItems })}
          </span>
          {onAdd && (
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>
              {t("common.add")}
            </Button>
          )}
        </div>

        <VtDataTable<T>
          rowKey="id"
          loading={loading}
          columns={tableColumns}
          dataSource={pageRows}
          fillHeight
          scrollX="max-content"
          locale={{ emptyText: resolvedEmpty }}
        />

        <div className="flex shrink-0 justify-end border-t border-[var(--panel-border)] px-4 py-2">
          <Pagination
            size="small"
            current={page}
            pageSize={pageSize}
            total={totalItems}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </Card>
    </main>
  );
}

export function StatusBadge({
  status,
}: {
  status: "online" | "warning" | "critical" | "disabled";
}) {
  const { t } = useTranslation();
  const map = {
    online: { color: "success" as const, key: "status.online" },
    warning: { color: "warning" as const, key: "status.warning" },
    critical: { color: "error" as const, key: "status.critical" },
    disabled: { color: "default" as const, key: "status.disabled" },
  };
  const s = map[status];
  return <Tag color={s.color}>{t(s.key)}</Tag>;
}

const ROW_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  编辑: EditOutlined,
  Edit: EditOutlined,
  删除: DeleteOutlined,
  Delete: DeleteOutlined,
  详情: EyeOutlined,
  Details: EyeOutlined,
  预览: EyeOutlined,
  Preview: EyeOutlined,
  导出: DownloadOutlined,
  Export: DownloadOutlined,
  启用: PoweroffOutlined,
  Enable: PoweroffOutlined,
  停用: PoweroffOutlined,
  Disable: PoweroffOutlined,
  禁用: PoweroffOutlined,
  重启: ReloadOutlined,
  Restart: ReloadOutlined,
  解绑: LinkOutlined,
  Unbind: LinkOutlined,
  物模型: AppstoreOutlined,
  新增子机构: ApartmentOutlined,
  下发: SendOutlined,
  同步: SyncOutlined,
  Sync: SyncOutlined,
  测试: PlayCircleOutlined,
  Test: PlayCircleOutlined,
  总招: RadarChartOutlined,
  Recruit: RadarChartOutlined,
};

export function RowBtn({
  children, onClick, danger, icon: IconProp, confirm, disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  confirm?: { description: ReactNode; title?: string; confirmText?: string };
}) {
  const { t } = useTranslation();
  const label = typeof children === "string" ? children : "";
  const Icon = IconProp ?? ROW_ICON_MAP[label];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const triggerConfirm = (danger || !!confirm) && !disabled;

  return (
    <>
      <Button
        size="small"
        disabled={disabled}
        danger={danger}
        icon={Icon ? <Icon /> : undefined}
        className="!inline-flex shrink-0"
        onClick={() => {
          if (disabled) return;
          if (triggerConfirm) setConfirmOpen(true);
          else onClick?.();
        }}
      >
        {children}
      </Button>
      {triggerConfirm && (
        <ConfirmDialog
          open={confirmOpen}
          title={confirm?.title ?? (danger ? t("common.confirmDelete") : t("common.confirmAction"))}
          description={confirm?.description ?? <>{t("common.confirmActionDesc")}</>}
          confirmText={confirm?.confirmText ?? (danger ? t("common.delete") : t("common.confirm"))}
          danger={danger}
          onConfirm={() => onClick?.()}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

export function ActionsDropdown({ children }: { children: ReactNode }) {
  return (
    <Dropdown menu={{ items: [] }} dropdownRender={() => <Space direction="vertical">{children}</Space>}>
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );
}
