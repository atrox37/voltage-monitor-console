import { useCallback, useEffect, useState } from "react";
import { SyncOutlined } from "@ant-design/icons";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "@/i18n";
import type { ColumnsType } from "antd/es/table";
import { DetailServerTable } from "@/components/detail-table";

import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import { pageDeviceLogs } from "@/api";
import { termEq, toDbId } from "@/lib/query-terms";
import type { DeviceLogRecord } from "@/types";

import { CopyableCell } from "../components/copyable-cell";
import { defaultFrom, defaultTo } from "../lib/date-defaults";

export function TabEvents() {
  const { t } = useTranslation();
  const { device } = useDeviceEdit();
  const deviceId = device?.id ?? "";
  const [list, setList] = useState<DeviceLogRecord[]>([]);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(20);

  const fetchLogs = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const terms = [
        termEq("device_id", toDbId(deviceId)),
        { column: "ts", termType: "gt" as const, value: `${from} 00:00:00` },
        { column: "ts", termType: "lte" as const, value: `${to} 23:59:59` },
      ];
      const res = await pageDeviceLogs({
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
  }, [deviceId, from, to, page, pageSize]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const eventColumns: ColumnsType<DeviceLogRecord> = [
    {
      key: "ts",
      title: t("common.reportTime"),
      dataIndex: "ts",
      width: 180,
      render: (v) => <span className="text-xs text-text-secondary">{v}</span>,
    },
    {
      key: "messageType",
      title: t("common.type"),
      width: 120,
      dataIndex: "messageType",
      render: (v) => <span className="text-xs text-text-secondary">{v}</span>,
    },
    {
      key: "messageId",
      title: t("common.messageId"),
      width: 160,
      dataIndex: "messageId",
      render: (v) => <span className="text-xs text-text-secondary">{v}</span>,
    },
    {
      key: "log",
      title: t("common.log"),
      dataIndex: "log",
      ellipsis: true,
      render: (v) => <CopyableCell text={v ?? "-"} />,
    },
  ];

  return (
    <DetailServerTable<DeviceLogRecord>
      rowKey={(r, i) => `${r.ts}-${i}`}
      loading={loading}
      columns={eventColumns}
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
              void fetchLogs();
            }}
            className="vt-detail-outline-btn ml-auto px-2 py-1 text-xs"
          >
            <SyncOutlined /> {t("common.refresh")}
          </button>
        </div>
      }
    />
  );
}
