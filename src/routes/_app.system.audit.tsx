import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "@/i18n";
import { pageAuditLogs, deleteAuditLogBatch, type AuditLogDto } from "@/api/sys";
import { showApiError, showSuccess } from "@/lib/api-message";
import { useConfirm } from "@/components/confirm-dialog";
import { useServerPageQuery } from "@/hooks/use-server-page-query";
import { queryKeys } from "@/lib/query-keys";
import { subDays } from "date-fns";
import { useTableScrollSync } from "@/lib/table-utils";
import { useAdaptiveTableScrollY, useTableBodyMaxScrollY } from "@/lib/use-table-height";

export const Route = createFileRoute("/_app/system/audit")({
  component: AuditLogPage,
});

const METHOD_COLORS: Record<string, string> = {
  GET: "green",
  POST: "blue",
  PUT: "orange",
  DELETE: "red",
  WS: "purple",
};

function stateColor(state: number | null | undefined): string {
  if (!state) return "default";
  if (state >= 200 && state < 300) return "success";
  if (state >= 400 && state < 500) return "warning";
  if (state >= 500) return "error";
  return "default";
}

const DEFAULT_PAGE_SIZE = 20;

function AuditLogPage() {
  const { t } = useTranslation();
  const { confirm, confirmNode } = useConfirm();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [draftUsername, setDraftUsername] = useState("");
  const [draftMethod, setDraftMethod] = useState<string | undefined>(undefined);
  const [draftDateRange, setDraftDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs(subDays(new Date(), 7)),
    dayjs(),
  ]);

  const [appliedUsername, setAppliedUsername] = useState("");
  const [appliedMethod, setAppliedMethod] = useState<string | undefined>(undefined);
  const [appliedDateRange, setAppliedDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs(subDays(new Date(), 7)),
    dayjs(),
  ]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const listQuery = useMemo(() => {
    const terms: { column: string; value: string; termType: string; type: string }[] = [];
    if (appliedDateRange[0]) {
      terms.push({
        column: "t.create_time",
        value: appliedDateRange[0].format("YYYY-MM-DD") + " 00:00:00",
        termType: "gte",
        type: "and",
      });
    }
    if (appliedDateRange[1]) {
      terms.push({
        column: "t.create_time",
        value: appliedDateRange[1].format("YYYY-MM-DD") + " 23:59:59",
        termType: "lte",
        type: "and",
      });
    }
    if (appliedUsername.trim()) {
      terms.push({
        column: "t1.username",
        value: appliedUsername.trim(),
        termType: "like",
        type: "and",
      });
    }
    if (appliedMethod) {
      terms.push({ column: "method", value: appliedMethod, termType: "eq", type: "and" });
    }
    return {
      terms,
      sorts: [{ column: "t.create_time", order: "desc" as const }],
    };
  }, [appliedDateRange, appliedUsername, appliedMethod]);

  const {
    rows: list,
    total,
    loading,
  } = useServerPageQuery<AuditLogDto, AuditLogDto>({
    queryKey: queryKeys.audit.list(listQuery),
    page,
    pageSize,
    query: listQuery,
    fetchPage: pageAuditLogs,
    mapRow: (row) => row,
    errorMessage: t("errors.loadFailedDesc"),
  });

  const invalidateList = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.root });

  const applyQuery = () => {
    setAppliedUsername(draftUsername);
    setAppliedMethod(draftMethod);
    setAppliedDateRange(draftDateRange);
    setPage(1);
  };

  const resetQuery = () => {
    const def: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs(subDays(new Date(), 7)), dayjs()];
    setDraftUsername("");
    setDraftMethod(undefined);
    setDraftDateRange(def);
    setAppliedUsername("");
    setAppliedMethod(undefined);
    setAppliedDateRange(def);
    setPage(1);
  };

  const deleteBatchMutation = useMutation({
    mutationFn: (ids: number[]) => deleteAuditLogBatch(ids),
    onSuccess: () => {
      showSuccess(t("common.deleteSuccess"));
      setSelectedIds([]);
      invalidateList();
    },
    onError: (err) => showApiError(err),
  });

  const handleDeleteBatch = () => {
    if (selectedIds.length === 0) return;
    confirm({
      description: t("auditLog.deleteConfirm", { count: selectedIds.length }),
      onConfirm: () => deleteBatchMutation.mutate(selectedIds),
    });
  };

  const columns: ColumnsType<AuditLogDto> = [
    {
      key: "createTime",
      title: t("common.time"),
      width: 180,
      render: (_, r) => (
        <span className="font-mono text-xs text-text-secondary">{r.auditPo.createTime}</span>
      ),
    },
    {
      key: "username",
      title: t("auditLog.username"),
      width: 120,
      render: (_, r) => r.userPo?.username ?? "-",
    },
    {
      key: "org",
      title: t("auditLog.org"),
      width: 120,
      render: (_, r) => r.dimensionPo?.name ?? "-",
    },
    {
      key: "method",
      title: t("auditLog.method"),
      width: 100,
      render: (_, r) => (
        <Tag color={METHOD_COLORS[r.auditPo.method] ?? "default"}>{r.auditPo.method}</Tag>
      ),
    },
    {
      key: "url",
      title: t("auditLog.url"),
      render: (_, r) => (
        <Tooltip title={r.auditPo.url} placement="topLeft" overlayStyle={{ maxWidth: 560 }}>
          <span className="text-xs text-text-secondary">{r.auditPo.url}</span>
        </Tooltip>
      ),
    },
    {
      key: "ip",
      title: t("auditLog.ip"),
      width: 140,
      render: (_, r) => (
        <span className="font-mono text-xs text-text-secondary">{r.auditPo.ip}</span>
      ),
    },
    {
      key: "state",
      title: t("auditLog.state"),
      width: 110,
      render: (_, r) =>
        r.auditPo.state != null ? (
          <Tag color={stateColor(r.auditPo.state)}>{r.auditPo.state}</Tag>
        ) : (
          "-"
        ),
    },
    {
      key: "durationMs",
      title: t("auditLog.durationMs"),
      width: 110,
      render: (_, r) => (
        <span className="font-mono text-xs text-text-secondary">
          {r.auditPo.durationMs != null ? `${r.auditPo.durationMs} ms` : "-"}
        </span>
      ),
    },
  ];

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const maxScrollY = useTableBodyMaxScrollY(tableWrapRef);
  const syncRef = useTableScrollSync([list, columns, maxScrollY, selectedIds]);
  const tableScroll = useAdaptiveTableScrollY(syncRef, maxScrollY, [
    list,
    columns,
    maxScrollY,
    selectedIds,
  ]);

  return (
    <main className="vt-page-content vt-page-fill flex flex-col gap-3 p-4">
      <h2 className="vt-section-title text-base">{t("auditLog.title")}</h2>

      {/* 筛选区 */}
      <Card size="small" variant="borderless" className="vt-ant-filter-card shrink-0">
        <Form layout="inline" className="flex w-full flex-wrap items-center gap-y-2">
          <Form.Item label={t("common.timeRange")}>
            <DatePicker.RangePicker
              size="middle"
              value={draftDateRange}
              onChange={(dates) => {
                if (dates?.[0] && dates?.[1]) setDraftDateRange([dates[0], dates[1]]);
              }}
            />
          </Form.Item>
          <Form.Item label={t("auditLog.username")}>
            <Input
              allowClear
              value={draftUsername}
              placeholder={`${t("common.inputPlaceholder")}${t("auditLog.username")}`}
              onChange={(e) => setDraftUsername(e.target.value)}
              style={{ width: 208 }}
            />
          </Form.Item>
          <Form.Item label={t("auditLog.method")}>
            <Select
              allowClear
              className="vt-select-control"
              classNames={{ popup: { root: "vt-select-popup" } }}
              placeholder={`${t("common.select")}${t("auditLog.method")}`}
              value={draftMethod}
              onChange={(v) => setDraftMethod(v)}
              style={{ width: 208 }}
              options={[
                { label: "GET", value: "GET" },
                { label: "POST", value: "POST" },
                { label: "PUT", value: "PUT" },
                { label: "DELETE", value: "DELETE" },
                { label: "WS", value: "WS" },
              ]}
            />
          </Form.Item>
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

      {/* 表格区 */}
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
            {t("common.total", { count: total })}
          </span>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={selectedIds.length === 0}
            onClick={handleDeleteBatch}
          >
            {t("auditLog.deleteSelected", { count: selectedIds.length })}
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div ref={tableWrapRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div ref={syncRef} className="h-full min-h-0 min-w-0">
              <Table<AuditLogDto>
                rowKey={(r) => r.auditPo.id}
                size="middle"
                tableLayout="fixed"
                sticky
                loading={loading}
                className={`vt-ant-data-table ${tableScroll.hasVerticalOverflow ? "" : "vt-ant-data-table-no-y-scroll"}`.trim()}
                columns={columns}
                dataSource={list}
                scroll={{ x: "max-content", y: tableScroll.scrollY }}
                locale={{ emptyText: t("common.noData") }}
                rowSelection={{
                  selectedRowKeys: selectedIds,
                  onChange: (keys) => setSelectedIds(keys as number[]),
                }}
                expandable={{
                  expandedRowRender: (r) => (
                    <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-panel/60 p-3 text-xs text-text-secondary">
                      {r.auditPo.body || t("auditLog.noBody")}
                    </pre>
                  ),
                  rowExpandable: (r) => !!r.auditPo.body,
                }}
                pagination={false}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end border-t border-[var(--panel-border)] px-4 py-2">
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={[10, 20, 50, 100]}
              showTotal={(n) => t("common.total", { count: n })}
              className="vt-ant-pagination"
              onChange={(p, s) => {
                if (s !== pageSize) {
                  setPageSize(s);
                  setPage(1);
                } else {
                  setPage(p);
                }
              }}
            />
          </div>
        </div>
      </Card>
      {confirmNode}
    </main>
  );
}
