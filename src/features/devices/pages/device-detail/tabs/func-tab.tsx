import { useCallback, useEffect, useState } from "react";
import { SendOutlined } from "@ant-design/icons";
import { DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "@/i18n";
import type { ColumnsType } from "antd/es/table";
import { DetailServerTable, DETAIL_FUNC_TAB_OVERHEAD } from "@/components/detail-table";

import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import { pageDeviceFunctionLogs } from "@/api";
import { termEq, toDbId } from "@/lib/query-terms";
import stompManager from "@/lib/stomp";
import type { DeviceFunctionLogRecord } from "@/types";

import { CopyableCell } from "../components/copyable-cell";
import { FRow } from "../components/f-row";
import { defaultFrom, defaultTo } from "../lib/date-defaults";

export function TabFunc() {
  const { t } = useTranslation();
  const { device } = useDeviceEdit();
  const deviceId = device?.id;
  const fns = device?.metadata.functions ?? [];
  const [activeId, setActiveId] = useState<string>("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [raw, setRaw] = useState("");
  const [formatted, setFormatted] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [fnLogs, setFnLogs] = useState<DeviceFunctionLogRecord[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(false);
  const [logPageSize, setLogPageSize] = useState(20);

  const onPickFn = (id: string) => {
    setActiveId(id);
    const f = fns.find((x) => x.id === id);
    setInputs(Object.fromEntries((f?.inputs ?? []).map((p) => [p.id, ""])));
    setRaw("");
    setFormatted("");
  };

  const fetchFnLogs = useCallback(async () => {
    if (!deviceId) return;
    setLogLoading(true);
    try {
      const terms = [
        termEq("device_id", toDbId(deviceId)),
        { column: "ts", termType: "gt" as const, value: `${from} 00:00:00` },
        { column: "ts", termType: "lte" as const, value: `${to} 23:59:59` },
      ];
      const res = await pageDeviceFunctionLogs({
        current: logPage,
        size: logPageSize,
        terms,
        sorts: [{ column: "ts", order: "desc" }],
      });
      setFnLogs(res.records ?? res.data ?? []);
      setLogTotal(res.total ?? 0);
    } catch {
      setFnLogs([]);
      setLogTotal(0);
    } finally {
      setLogLoading(false);
    }
  }, [deviceId, from, to, logPage, logPageSize]);

  useEffect(() => {
    void fetchFnLogs();
  }, [fetchFnLogs]);

  if (!device) return null;
  const active = fns.find((f) => f.id === activeId);

  const invoke = () => {
    if (!active) return;
    const payload = inputs;
    setRaw(JSON.stringify(payload));
    setFormatted("");
    stompManager.send("/queue/queue_stomp_function", {
      type: "function",
      deviceId: device.id,
      function: active.id,
      args: payload,
    });
    setTimeout(() => void fetchFnLogs(), 1500);
  };

  const fnLogColumns: ColumnsType<DeviceFunctionLogRecord> = [
    {
      key: "ts",
      title: (
        <DatePicker.RangePicker
          size="small"
          value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
          onChange={(dates) => {
            setFrom(dates?.[0]?.format("YYYY-MM-DD") ?? "");
            setTo(dates?.[1]?.format("YYYY-MM-DD") ?? "");
            setLogPage(1);
          }}
        />
      ),
      onHeaderCell: () => ({ className: "vt-table-header-filter" }),
      dataIndex: "ts",
      width: 280,
      align: "center",
      render: (v) => <span className="text-xs text-text-secondary">{v}</span>,
    },
    {
      key: "func",
      title: t("devices.detail.func.fnLabel"),
      dataIndex: "func",
      width: 160,
      align: "center",
    },
    {
      key: "funcStatus",
      title: t("common.requestStatus"),
      dataIndex: "funcStatus",
      width: 100,
      align: "center",
      render: (v) => (
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] ${v === "success" ? "bg-status-online/15 text-status-online" : "bg-status-critical/15 text-status-critical"}`}
        >
          {v === "success"
            ? t("devices.detail.func.statusSuccess")
            : t("devices.detail.func.statusFailed")}
        </span>
      ),
    },
    {
      key: "sendData",
      title: t("common.sendData"),
      dataIndex: "sendData",
      align: "center",
      ellipsis: true,
      render: (v) => <CopyableCell text={v ?? "-"} maxWidth={720} />,
    },
    {
      key: "resultData",
      title: t("common.resultFile"),
      dataIndex: "resultData",
      align: "center",
      ellipsis: true,
      render: (v) => <CopyableCell text={v ?? "-"} maxWidth={720} />,
    },
  ];

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-3 overflow-auto pr-2">
        <FRow label={t("devices.detail.func.fnLabel")}>
          <Select
            className="vt-select-control"
            classNames={{ popup: { root: "vt-select-popup" } }}
            style={{ width: "100%" }}
            value={activeId || undefined}
            onChange={(v) => onPickFn(String(v ?? ""))}
            options={fns.map((f) => ({ label: f.name || f.id, value: f.id }))}
          />
        </FRow>

        <FRow label={t("common.paramName")} alignTop>
          {!active || (active.inputs ?? []).length === 0 ? (
            <span className="text-xs text-text-muted">—</span>
          ) : (
            <div className="flex flex-col gap-2">
              {(active.inputs ?? []).map((p) => (
                <div key={p.id} className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <span className="text-xs text-text-secondary">{p.name}</span>
                  <Input
                    value={inputs[p.id] ?? ""}
                    placeholder={p.valueType?.type ?? "string"}
                    onChange={(e) => setInputs({ ...inputs, [p.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </FRow>

        <FRow label={t("common.actions")}>
          <button
            onClick={invoke}
            disabled={!active}
            className="vt-detail-action-btn px-3 py-1 text-xs"
          >
            <SendOutlined /> {t("common.send")}
          </button>
        </FRow>

        <FRow label={t("common.formatResult")} alignTop>
          <pre className="min-h-[80px] w-full rounded border border-panel-border bg-panel/40 p-2 text-xs text-text-secondary">
            {formatted || ""}
          </pre>
        </FRow>

        <FRow label={t("common.rawData")} alignTop>
          <Input.TextArea rows={4} readOnly value={raw} />
        </FRow>
      </div>

      <DetailServerTable<DeviceFunctionLogRecord>
        rowKey={(r, i) => `${r.ts}-${i}`}
        loading={logLoading}
        columns={fnLogColumns}
        dataSource={fnLogs}
        locale={{ emptyText: t("common.noData") }}
        page={logPage}
        pageSize={logPageSize}
        total={logTotal}
        onPageChange={setLogPage}
        onPageSizeChange={setLogPageSize}
        scrollOverhead={DETAIL_FUNC_TAB_OVERHEAD}
      />
    </div>
  );
}
