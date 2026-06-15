import { useCallback, useEffect, useMemo, useState } from "react";
import { SyncOutlined } from "@ant-design/icons";
import { DatePicker, Drawer, Table } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "@/i18n";
import type { ColumnsType } from "antd/es/table";
import { DetailServerTable } from "@/components/detail-table";
import { vtActionColumn } from "@/lib/table-utils";
import { RowActionBtn } from "@/components/row-action-buttons";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import { pageDeviceAlarmLogs } from "@/api";
import { termEq, toDbId } from "@/lib/query-terms";
import type { AlarmReplyRecord, DeviceAlarmLogRecord } from "@/types";

import { CopyableCell } from "../components/copyable-cell";
import { defaultFrom, defaultTo } from "../lib/date-defaults";

type AlarmDetailRow = { key: number; items: Array<{ property: string; value: string }> };

function parseRuleReply(reply: DeviceAlarmLogRecord["ruleReply"]): AlarmReplyRecord[] {
  if (Array.isArray(reply)) return reply;
  if (typeof reply === "string") {
    try {
      return JSON.parse(reply) as AlarmReplyRecord[];
    } catch {
      return [];
    }
  }
  return [];
}

function replyNotifyView(row: DeviceAlarmLogRecord, state: "SUCCESS" | "FAIL") {
  const list = parseRuleReply(row.ruleReply);
  const countMap = new Map<string, number>();
  for (const item of list) {
    if (item?.type !== "notify") continue;
    if (String(item.state ?? "").toUpperCase() !== state) continue;
    const username = item.username || String(item.userId ?? "");
    if (!username) continue;
    countMap.set(username, (countMap.get(username) ?? 0) + 1);
  }
  return Array.from(countMap.entries()).map(([username, count]) => ({ username, count }));
}

export function TabAlarm() {
  const { t } = useTranslation();
  const { device } = useDeviceEdit();
  const deviceId = device?.id ?? "";
  const properties = device?.metadata.properties ?? [];
  const ruleIds = useMemo(
    () => (device?.metadata.rules ?? []).map((r) => r.id),
    [device?.metadata.rules],
  );
  const ruleNameMap = useMemo(
    () => Object.fromEntries((device?.metadata.rules ?? []).map((r) => [r.id, r.name])),
    [device?.metadata.rules],
  );

  const [list, setList] = useState<DeviceAlarmLogRecord[]>([]);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DeviceAlarmLogRecord | null>(null);
  const [pageSize, setPageSize] = useState(20);

  const fetchAlarms = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const terms = [
        termEq("device_id", toDbId(deviceId)),
        ...(ruleIds.length > 0
          ? [{ column: "rule_id", termType: "in" as const, value: ruleIds }]
          : []),
        { column: "ts", termType: "gt" as const, value: `${from} 00:00:00` },
        { column: "ts", termType: "lte" as const, value: `${to} 23:59:59` },
      ];
      const res = await pageDeviceAlarmLogs({
        current: page,
        size: pageSize,
        terms,
        sorts: [{ column: "ts", order: "desc" }],
      });
      setList(res.records ?? res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [deviceId, ruleIds, from, to, page, pageSize]);

  useEffect(() => {
    void fetchAlarms();
  }, [fetchAlarms]);

  const detailRows: AlarmDetailRow[] = useMemo(() => {
    if (!detail || !Array.isArray(detail.ruleData)) return [];
    return detail.ruleData.map((dataItem, index) => {
      const items: Array<{ property: string; value: string }> = [];
      if (dataItem && typeof dataItem === "object") {
        for (const key of Object.keys(dataItem)) {
          const propMeta = properties.find((p) => p.id === key);
          items.push({
            property: propMeta?.name ?? key,
            value: String(dataItem[key] ?? ""),
          });
        }
      }
      return { key: index, items };
    });
  }, [detail, properties]);

  const alarmColumns: ColumnsType<DeviceAlarmLogRecord> = [
    {
      key: "ts",
      title: t("common.reportTime"),
      dataIndex: "ts",
      width: 180,
      align: "center",
      render: (v) => <span className="text-xs text-text-secondary">{v}</span>,
    },
    {
      key: "ruleName",
      title: t("common.alarmName"),
      width: 160,
      align: "center",
      render: (_, a) => <span>{ruleNameMap[a.ruleId ?? ""] ?? a.ruleId ?? "-"}</span>,
    },
    {
      key: "triggerCount",
      title: t("common.triggerCount"),
      width: 100,
      align: "center",
      render: (_, a) => (
        <span className="text-xs text-text-secondary">
          {t("devices.detail.alarm.triggerCountUnit", {
            count: Array.isArray(a.ruleData) ? a.ruleData.length : 0,
          })}
        </span>
      ),
    },
    {
      key: "ruleData",
      title: t("devices.detail.alarm.data"),
      align: "center",
      ellipsis: true,
      render: (_, a) => {
        const text = a.ruleData ? JSON.stringify(a.ruleData) : "-";
        return <CopyableCell text={text} />;
      },
    },
    {
      key: "notification",
      title: t("common.notify"),
      width: 220,
      align: "center",
      render: (_, a) => (
        <div className="flex flex-wrap justify-center gap-1">
          {replyNotifyView(a, "SUCCESS").map((item) => (
            <span
              key={`ok-${item.username}`}
              className="rounded bg-status-online/15 px-1.5 py-0.5 text-[11px] text-status-online"
            >
              {t("devices.detail.alarm.notifySuccess", {
                user: item.username,
                count: item.count,
              })}
            </span>
          ))}
          {replyNotifyView(a, "FAIL").map((item) => (
            <span
              key={`fail-${item.username}`}
              className="rounded bg-status-critical/15 px-1.5 py-0.5 text-[11px] text-status-critical"
            >
              {t("devices.detail.alarm.notifyFail", {
                user: item.username,
                count: item.count,
              })}
            </span>
          ))}
        </div>
      ),
    },
    vtActionColumn<DeviceAlarmLogRecord>(
      t("common.actions"),
      (a) => <RowActionBtn onClick={() => setDetail(a)}>{t("common.details")}</RowActionBtn>,
      100,
    ),
  ];

  const detailColumns: ColumnsType<AlarmDetailRow> = [
    {
      key: "index",
      title: t("devices.detail.alarm.recordNo"),
      width: 120,
      align: "center",
      render: (_, row) => (
        <span className="text-xs text-text-secondary">
          {t("devices.detail.alarm.recordData", { index: row.key + 1 })}
        </span>
      ),
    },
    {
      key: "data",
      title: t("devices.detail.alarm.data"),
      align: "center",
      render: (_, row) => (
        <div className="flex flex-wrap justify-center gap-1">
          {row.items.map((item, i) => (
            <span
              key={`${item.property}-${i}`}
              className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary"
            >
              {item.property}:{item.value}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <DetailServerTable<DeviceAlarmLogRecord>
        rowKey={(r, i) => `${r.ts}-${r.ruleId}-${i}`}
        loading={loading}
        columns={alarmColumns}
        dataSource={list}
        locale={{ emptyText: t("common.noData") }}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        toolbar={
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <span className="text-xs text-text-muted">{t("common.timeRange")}</span>
            <DatePicker.RangePicker
              size="small"
              value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
              onChange={(dates) => {
                setFrom(dates?.[0]?.format("YYYY-MM-DD") ?? "");
                setTo(dates?.[1]?.format("YYYY-MM-DD") ?? "");
                setPage(1);
              }}
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                void fetchAlarms();
              }}
              className="vt-detail-outline-btn ml-auto px-2 py-1 text-xs"
            >
              <SyncOutlined /> {t("common.refresh")}
            </button>
          </div>
        }
      />

      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={t("devices.detail.alarm.viewTitle")}
        width={520}
        destroyOnHidden
        styles={{ body: { paddingTop: 8 } }}
      >
        <Table<AlarmDetailRow>
          rowKey="key"
          size="small"
          pagination={false}
          className="vt-ant-data-table"
          columns={detailColumns}
          dataSource={detailRows}
          locale={{ emptyText: t("common.noData") }}
        />
      </Drawer>
    </>
  );
}
