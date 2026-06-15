import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOutlined, LoadingOutlined, RadarChartOutlined } from "@ant-design/icons";
import { showError, showSuccess } from "@/lib/api-message";
import {
  deleteGateway,
  getDimensionTree,
  pageBoardLogs,
  pageGateways,
  pageNetworks,
  pageProtocols,
  saveGateway,
} from "@/api";
import { DatePicker, Drawer, Form, Input, Pagination, Select, Switch, Table } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { drawerFooter, drawerFormItemProps } from "@/components/drawer-form";
import { ListPageTemplate, RowBtn } from "@/components/list-page-template";
import type { OrgNode } from "@/components/org-tree-select";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import {
  mapGatewayDtoToRow,
  networkPoFromGatewayDto,
  type GatewayListRow,
  type MqttClientConfiguration,
} from "@/features/ingest/lib/ingest-mappers";
import { ALL_PAGE_QUERY, termEq, termLike, toDbId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import stompManager from "@/lib/stomp";
import { useTableHeight } from "@/lib/use-table-height";
import { useTranslation } from "@/i18n";
import type { DeviceProtocolPageDto, GatewayDto, NetworkConfigPo, PageQuery } from "@/types";

export const Route = createFileRoute("/_app/ingest/gateways")({
  component: GatewaysPage,
});

const DEFAULT_SORTS: PageQuery["sorts"] = [{ column: "t.update_time", order: "desc" }];
const BOARD_SORTS: PageQuery["sorts"] = [{ column: "ts", order: "desc" }];
const TYPE_OPTIONS = [{ label: "MQTT CLIENT", value: "MQTT_CLIENT" }];

type GatewayForm = {
  id: string;
  name: string;
  networkId: string;
  protocolId: string;
  enabled: boolean;
};

function GatewaysPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<GatewayListRow[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [filterDraft, setFilterDraft] = useState({ name: "", orgId: "", networkComponentType: "" });
  const [filterApplied, setFilterApplied] = useState({
    name: "",
    orgId: "",
    networkComponentType: "",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editGatewayRaw, setEditGatewayRaw] = useState<GatewayDto | null>(null);
  const [form, setForm] = useState<GatewayForm>({
    id: "",
    name: "",
    networkId: "",
    protocolId: "",
    enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [zhaoTarget, setZhaoTarget] = useState<GatewayListRow | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const terms = [];
      const name = filterApplied.name.trim();
      if (name) terms.push(termLike("t.name", name));
      if (filterApplied.orgId) terms.push(termEq("t.org_id", toDbId(filterApplied.orgId)));
      if (filterApplied.networkComponentType)
        terms.push(termEq("t1.type", filterApplied.networkComponentType));

      const result = await pageGateways({
        current: page,
        size: pageSize,
        terms,
        sorts: DEFAULT_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRows(list.map(mapGatewayDtoToRow));
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRows([]);
      setTotal(0);
      showError(err instanceof Error ? err.message : t("ingest.gateways.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [
    filterApplied.name,
    filterApplied.orgId,
    filterApplied.networkComponentType,
    page,
    pageSize,
    t,
  ]);

  useEffect(() => {
    void getDimensionTree()
      .then((root) => setOrgNodes(dimensionToOrgNodes(root)))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const openAdd = () => {
    setDrawerMode("add");
    setEditGatewayRaw(null);
    setForm({ id: "", name: "", networkId: "", protocolId: "", enabled: false });
    setDrawerOpen(true);
  };

  const openEdit = (row: GatewayListRow) => {
    setDrawerMode("edit");
    setEditGatewayRaw(row.raw);
    setForm({
      id: row.id,
      name: row.name,
      networkId: row.networkId,
      protocolId: row.protocolId,
      enabled: row.enabled,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (data: GatewayForm) => {
    setSaving(true);
    try {
      await saveGateway({
        id: data.id ? toDbId(data.id) : undefined,
        name: data.name,
        state: data.enabled ? 1 : 0,
        networkId: toDbId(data.networkId),
        protocolId: toDbId(data.protocolId),
      });
      showSuccess(t("common.saveSuccess"));
      setDrawerOpen(false);
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("common.loadFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: GatewayListRow) => {
    try {
      await deleteGateway(row.id);
      showSuccess(t("common.deleteSuccess"));
      await fetchRows();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showError(err instanceof Error ? err.message : t("common.loadFailed"));
    }
  };

  return (
    <>
      <ListPageTemplate<GatewayListRow>
        actionColumnWidth={260}
        title={t("ingest.gateways.title")}
        loading={loading}
        serverSide
        rows={rows}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onSearch={() => {
          setFilterApplied({ ...filterDraft });
          setPage(1);
        }}
        onReset={() => {
          const empty = { name: "", orgId: "", networkComponentType: "" };
          setFilterDraft(empty);
          setFilterApplied(empty);
          setPage(1);
        }}
        filterValues={filterDraft}
        onFilterValuesChange={(draft) =>
          setFilterDraft({
            name: draft.name ?? "",
            orgId: draft.orgId ?? "",
            networkComponentType: draft.networkComponentType ?? "",
          })
        }
        filters={[
          { type: "text", key: "name", label: t("common.nameLabel") },
          {
            type: "orgTree",
            key: "orgId",
            label: t("common.orgLabel"),
            nodes: orgNodes,
          },
          {
            type: "select",
            key: "networkComponentType",
            label: t("common.networkCompType"),
            options: TYPE_OPTIONS,
          },
        ]}
        columns={[
          { key: "name", title: t("common.nameLabel") },
          {
            key: "networkComponent",
            title: t("ingest.gateways.networkCompCol"),
            render: (r) => (
              <span className="inline-flex items-center gap-2">
                <span className="text-foreground">{r.networkComponent}</span>
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary">
                  {r.networkComponentType}
                </span>
              </span>
            ),
          },
          { key: "protocol", title: t("ingest.gateways.protocol") },
          { key: "org", title: t("common.orgLabel") },
          {
            key: "enabled",
            title: t("common.status"),
            render: (r) => (
              <span
                className={`rounded px-2 py-0.5 text-[11px] ${r.enabled ? "bg-status-online/15 text-status-online" : "bg-status-warning/15 text-status-warning"}`}
              >
                {r.enabled ? t("common.yes") : t("common.no")}
              </span>
            ),
          },
          {
            key: "updateTime",
            title: t("common.updatedAt"),
            render: (r) => <span className="text-text-secondary">{r.updateTime}</span>,
          },
        ]}
        onAdd={openAdd}
        rowActions={(r) => (
          <>
            <RowBtn onClick={() => openEdit(r)}>{t("common.edit")}</RowBtn>
            <RowBtn icon={RadarChartOutlined} onClick={() => setZhaoTarget(r)}>
              {t("ingest.gateways.recruit")}
            </RowBtn>
            <RowBtn
              danger
              confirm={{
                title: t("common.confirmDelete"),
                description: t("common.confirmDeleteDesc", {
                  target: t("ingest.gateways.title"),
                  name: r.name,
                }),
                confirmText: t("common.delete"),
              }}
              onClick={() => void handleDelete(r)}
            >
              {t("common.delete")}
            </RowBtn>
          </>
        )}
      />

      {drawerOpen && (
        <GatewayDrawer
          mode={drawerMode}
          value={form}
          fallbackNetwork={editGatewayRaw ? networkPoFromGatewayDto(editGatewayRaw) : undefined}
          saving={saving}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      )}

      {zhaoTarget && <ZhaoDrawer gateway={zhaoTarget} onClose={() => setZhaoTarget(null)} />}
    </>
  );
}

function GatewayDrawer({
  mode,
  value,
  fallbackNetwork,
  saving,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  value: GatewayForm;
  fallbackNetwork?: NetworkConfigPo;
  saving: boolean;
  onClose: () => void;
  onSave: (g: GatewayForm) => void;
}) {
  const { t } = useTranslation();
  const [d, setD] = useState<GatewayForm>(value);
  const [networks, setNetworks] = useState<NetworkConfigPo[]>([]);
  const [protocols, setProtocols] = useState<DeviceProtocolPageDto[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    setD(value);
  }, [value]);

  useEffect(() => {
    let canceled = false;
    setOptionsLoading(true);
    void Promise.all([
      pageNetworks({ ...ALL_PAGE_QUERY, terms: [{ column: "t2.id", termType: "isnull" }] }),
      pageProtocols(ALL_PAGE_QUERY),
    ])
      .then(([netRes, protoRes]) => {
        if (canceled) return;
        const netList = (netRes.records ?? netRes.data ?? []).map((row) => row.t1.networkConfigPo);
        const protoList = protoRes.records ?? protoRes.data ?? [];
        const mergedNetworks = [...netList];
        if (value.networkId) {
          const exists = mergedNetworks.some((n) => String(n.id) === value.networkId);
          if (!exists && fallbackNetwork) mergedNetworks.unshift(fallbackNetwork);
        }
        setNetworks(mergedNetworks);
        setProtocols(protoList);
      })
      .catch((err) => {
        if (isRequestCanceled(err) || canceled) return;
        showError(err instanceof Error ? err.message : t("ingest.gateways.loadOptionsFailed"));
      })
      .finally(() => {
        if (!canceled) setOptionsLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [fallbackNetwork, t, value.networkId]);

  const selectedNetwork = networks.find((n) => String(n.id) === d.networkId);
  const protocolOptions = useMemo(() => {
    if (!selectedNetwork?.type) return protocols;
    return protocols.filter((p) => p.support?.includes(selectedNetwork.type!));
  }, [protocols, selectedNetwork?.type]);

  const set = <K extends keyof GatewayForm>(k: K, v: GatewayForm[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === "add" ? t("common.addTitle") : t("common.editTitle")}
      width={520}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
      footer={drawerFooter([
        { key: "cancel", label: t("common.cancel"), onClick: onClose },
        {
          key: "save",
          label: saving ? t("common.saving") : t("common.save"),
          type: "primary",
          disabled: saving || optionsLoading,
          onClick: () => onSave(d),
        },
      ])}
    >
      {optionsLoading && (
        <div className="mb-3 flex items-center gap-2 text-xs text-text-secondary">
          <LoadingOutlined spin className="text-sm" />
          {t("common.loading")}
        </div>
      )}
      <Form.Item label={t("common.nameLabel")} required {...drawerFormItemProps}>
        <Input
          placeholder={t("common.inputPlaceholder")}
          value={d.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Form.Item>

      <Form.Item label={t("ingest.gateways.networkComp")} required {...drawerFormItemProps}>
        <Select
          value={d.networkId || undefined}
          placeholder={t("common.select")}
          onChange={(networkId) => {
            set("networkId", networkId);
            set("protocolId", "");
          }}
          options={networks.map((n) => ({
            value: String(n.id),
            label: `${n.name} (${n.type})`,
          }))}
        />
      </Form.Item>

      <Form.Item label={t("ingest.gateways.protocol")} required {...drawerFormItemProps}>
        <Select
          value={d.protocolId || undefined}
          placeholder={d.networkId ? t("common.select") : t("ingest.gateways.selectNetworkFirst")}
          disabled={!d.networkId || optionsLoading}
          onChange={(protocolId) => set("protocolId", protocolId)}
          options={protocolOptions.map((p) => ({
            value: String(p.id),
            label: p.name ?? "",
          }))}
        />
      </Form.Item>

      <Form.Item label={t("common.status")} {...drawerFormItemProps}>
        <Switch checked={d.enabled} onChange={(enabled) => set("enabled", enabled)} />
        <span className="ml-2 text-xs text-text-secondary">
          {d.enabled ? t("common.on") : t("common.off")}
        </span>
      </Form.Item>
    </Drawer>
  );
}

type BoardItem = { id: string; name: string };

function ZhaoDrawer({ gateway, onClose }: { gateway: GatewayListRow; onClose: () => void }) {
  const { t } = useTranslation();
  const network = networkPoFromGatewayDto(gateway.raw);
  const netId = network?.id;
  const boards = useMemo<BoardItem[]>(() => {
    const cfg = (network?.configuration ?? {}) as MqttClientConfiguration;
    return (cfg.boards ?? []).map((b) => ({ id: String(b.id ?? ""), name: b.name ?? "" }));
  }, [network?.configuration]);

  const [checked, setChecked] = useState<string[]>([]);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<
    Array<{ time: string; name: string; device: string; sn: string; status: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const tableScrollY = Math.max(240, Math.min(640, useTableHeight(420)));

  const boardNameMap = useMemo(
    () => Object.fromEntries(boards.map((b) => [b.id, b.name])),
    [boards],
  );

  const fetchRecords = useCallback(async () => {
    if (!netId) return;
    setLoading(true);
    try {
      const terms = [
        termEq("net_id", toDbId(netId)),
        { column: "ts", termType: "gt" as const, value: `${from} 00:00:00` },
        { column: "ts", termType: "lte" as const, value: `${to} 23:59:59` },
      ];
      const result = await pageBoardLogs({
        current: page,
        size: pageSize,
        terms,
        sorts: BOARD_SORTS,
      });
      const list = result.records ?? result.data ?? [];
      setRecords(
        list.map((r) => ({
          time: r.ts ?? "",
          name: boardNameMap[String(r.boardId ?? "")] ?? String(r.boardId ?? ""),
          device: r.deviceName ?? "",
          sn: r.deviceSn ?? "",
          status: r.state ?? "",
        })),
      );
      setTotal(result.total ?? list.length);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [boardNameMap, from, netId, page, pageSize, to]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!netId) return;
    stompManager.connect();
    const subId = stompManager.subscribe({ destination: `/topic/board_network_${netId}` }, () => {
      /* topic heartbeat */
    });
    return () => {
      stompManager.unsubscribe(subId);
    };
  }, [netId]);

  type RecruitRecord = {
    key: number;
    time: string;
    name: string;
    device: string;
    sn: string;
    status: string;
  };
  const recordRows: RecruitRecord[] = records.map((r, i) => ({ key: i, ...r }));
  const recordColumns: ColumnsType<RecruitRecord> = useMemo(
    () => [
      {
        key: "time",
        title: t("ingest.gateways.time"),
        dataIndex: "time",
        render: (v) => <span className="text-text-secondary">{v}</span>,
      },
      { key: "name", title: t("ingest.gateways.recruitName"), dataIndex: "name" },
      {
        key: "device",
        title: t("ingest.gateways.deviceName"),
        dataIndex: "device",
        render: (v) => <span className="text-text-secondary">{v}</span>,
      },
      {
        key: "sn",
        title: t("ingest.gateways.deviceSn"),
        dataIndex: "sn",
        render: (v) => <span className="text-text-secondary">{v}</span>,
      },
      {
        key: "status",
        title: t("common.status"),
        dataIndex: "status",
        render: (status: string) => (
          <span
            className={`rounded px-2 py-0.5 ${
              status === "success"
                ? "bg-status-online/15 text-status-online"
                : status === "timeout"
                  ? "bg-status-warning/15 text-status-warning"
                  : "bg-panel text-text-secondary"
            }`}
          >
            {status === "success"
              ? t("common.success")
              : status === "timeout"
                ? t("common.timeout")
                : status}
          </span>
        ),
      },
    ],
    [t],
  );

  const toggleBoard = (id: string) => {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSend = () => {
    if (!netId || checked.length === 0) {
      showError(t("ingest.gateways.recruitPickHint"));
      return;
    }
    if (!stompManager.isConnected) {
      showError(t("common.loadFailed"));
      return;
    }
    const payload = checked.map((id) => ({ netId: toDbId(netId), data: { id } }));
    stompManager.send("/queue/queue_stomp_board", payload, { "reply-to": "/temp-queue/foo" });
    showSuccess(
      t("ingest.gateways.recruitSent", {
        items: checked.map((id) => boardNameMap[id] ?? id).join(", "),
      }),
    );
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("ingest.gateways.recruitTitle", { name: gateway.name })}
      width={760}
      destroyOnHidden
      classNames={{ body: "vt-drawer-fill-body" }}
      styles={{ body: { paddingTop: 8 } }}
      footer={drawerFooter([
        { key: "close", label: t("common.close"), onClick: onClose },
        {
          key: "send",
          label: t("ingest.gateways.recruitSend"),
          type: "primary",
          disabled: checked.length === 0,
          onClick: handleSend,
        },
      ])}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {boards.length === 0 ? (
          <div className="mb-4 shrink-0 text-xs text-text-muted">{t("common.noData")}</div>
        ) : (
          <div className="mb-4 flex shrink-0 flex-wrap gap-3">
            {boards.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBoard(b.id)}
                className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs ${
                  checked.includes(b.id)
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-panel-border text-text-secondary"
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                    checked.includes(b.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-panel-border"
                  }`}
                >
                  {checked.includes(b.id) ? "✓" : ""}
                </span>
                {b.name}
              </button>
            ))}
          </div>
        )}

        <div className="mb-2 shrink-0 text-xs font-semibold text-foreground">
          {t("common.record")}
        </div>

        <div className="mb-3 flex w-fit shrink-0 items-center gap-2 rounded-md border border-panel-border bg-background/40 px-2 py-1.5 text-xs text-text-secondary">
          <CalendarOutlined className="text-sm text-text-muted" />
          <DatePicker.RangePicker
            size="small"
            value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
            onChange={(dates) => {
              setFrom(dates?.[0]?.format("YYYY-MM-DD") ?? from);
              setTo(dates?.[1]?.format("YYYY-MM-DD") ?? to);
              setPage(1);
            }}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="overflow-hidden rounded-md border border-panel-border">
            <Table<RecruitRecord>
              rowKey="key"
              size="small"
              loading={loading}
              tableLayout="fixed"
              pagination={false}
              className="vt-ant-data-table"
              columns={recordColumns}
              dataSource={recordRows}
              scroll={{ x: "max-content", y: tableScrollY }}
              locale={{ emptyText: t("common.noData") }}
            />
          </div>

          <div className="vt-table-pagination-bar shrink-0 border-t border-panel-border px-0 py-2">
            <Pagination
              className="vt-ant-pagination"
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={[10, 20, 50, 100]}
              hideOnSinglePage={false}
              onChange={(p, s) => {
                if (s !== pageSize) {
                  setPageSize(s);
                  setPage(1);
                } else {
                  setPage(p);
                }
              }}
              onShowSizeChange={(_current, s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}
