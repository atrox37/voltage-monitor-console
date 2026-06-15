import { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, Drawer, Spin, Table, Tabs } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { format, subDays } from "date-fns";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { pageDevicePropertyData } from "@/api";
import { termEq, toDbId } from "@/lib/query-terms";
import { useTableScrollSync } from "@/lib/table-utils";
import { useAdaptiveTableScrollY } from "@/lib/use-table-height";
import type { DevicePropertyRecord } from "@/types";
import type { EnumDataItem, SimplePropertyMetadata } from "@/types/api/metadata";

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

function defaultFrom() {
  return format(subDays(new Date(), 7), "yyyy-MM-dd");
}
function defaultTo() {
  return format(new Date(), "yyyy-MM-dd");
}

export function DevicePropertyHistoryDialog({
  open,
  deviceId,
  property,
  onClose,
}: {
  open: boolean;
  deviceId: string;
  property: SimplePropertyMetadata | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState("data");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<DevicePropertyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [chartRows, setChartRows] = useState<DevicePropertyRecord[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const isNumber = ["int", "long", "float", "double", "number"].includes(
    property?.valueType?.type ?? "",
  );
  const enumData = useMemo(
    () => (property?.valueType?.extra?.enumData as EnumDataItem[] | undefined) ?? [],
    [property?.valueType?.extra?.enumData],
  );

  const fetchPage = useCallback(async () => {
    if (!open || !property) return;
    setLoading(true);
    try {
      const terms = [
        termEq("device_id", toDbId(deviceId)),
        termEq("property", property.id),
        { column: "ts", termType: "gt" as const, value: `${from} 00:00:00` },
        { column: "ts", termType: "lte" as const, value: `${to} 23:59:59` },
      ];
      const res = await pageDevicePropertyData({
        current: page,
        size: pageSize,
        terms,
        sorts: [{ column: "ts", order: "desc" }],
      });
      const list = res.records ?? res.data ?? [];
      setRows(list);
      setTotal(res.total ?? list.length);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [deviceId, from, open, page, pageSize, property, to]);

  const fetchChartData = useCallback(async () => {
    if (!open || !property || !isNumber) return;
    setChartLoading(true);
    try {
      const terms = [
        termEq("device_id", toDbId(deviceId)),
        termEq("property", property.id),
        { column: "ts", termType: "gt" as const, value: `${from} 00:00:00` },
        { column: "ts", termType: "lte" as const, value: `${to} 23:59:59` },
      ];
      const res = await pageDevicePropertyData({
        current: 1,
        size: 1000,
        terms,
        sorts: [{ column: "ts", order: "asc" }],
      });
      setChartRows(res.records ?? res.data ?? []);
    } catch {
      setChartRows([]);
    } finally {
      setChartLoading(false);
    }
  }, [deviceId, from, isNumber, open, property, to]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setActiveTab("data");
    }
  }, [open, property?.id]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    if (activeTab === "chart") void fetchChartData();
  }, [activeTab, fetchChartData]);

  const columns: ColumnsType<DevicePropertyRecord> = useMemo(
    () => [
      {
        key: "ts",
        title: "\u65f6\u95f4",
        dataIndex: "ts",
        width: 200,
        sorter: (a, b) => String(a.ts ?? "").localeCompare(String(b.ts ?? "")),
        defaultSortOrder: "descend" as const,
      },
      {
        key: "value",
        title: "\u503c",
        render: (_: unknown, r: DevicePropertyRecord) => {
          if (property?.valueType?.type === "enum") {
            return enumData.find((d) => d.key === r.rawValue)?.value ?? r.rawValue ?? "-";
          }
          if (isNumber && r.numberValue != null) return String(r.numberValue);
          return r.rawValue ?? "-";
        },
      },
    ],
    [enumData, isNumber, property?.valueType?.type],
  );
  const historyTableRef = useTableScrollSync([rows, columns, page, pageSize, loading]);
  const historyTableScroll = useAdaptiveTableScrollY(historyTableRef, 360, [
    rows,
    columns,
    page,
    pageSize,
    loading,
  ]);

  const chartOption = useMemo(() => {
    const sorted = [...chartRows].sort((a, b) =>
      String(a.ts ?? "").localeCompare(String(b.ts ?? "")),
    );
    const xData = sorted.map((r) => r.ts ?? "");
    const yData = sorted.map((r) => r.numberValue ?? 0);
    const unit = property?.valueType?.unit ?? "";

    return {
      grid: { left: 56, right: 24, top: 32, bottom: 60 },
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "#1a2438",
        borderColor: "rgba(166, 182, 210, 0.25)",
        textStyle: { color: "#f5f7fb", fontSize: 12 },
        formatter: (params: Array<{ axisValue: string; value: number }>) => {
          const p = params[0];
          if (!p) return "";
          return `${p.axisValue}<br/><b>${p.value}</b> ${unit}`;
        },
      },
      xAxis: {
        type: "category" as const,
        data: xData,
        axisLabel: {
          color: "#8b9bb8",
          fontSize: 10,
          rotate: 30,
          formatter: (v: string) => v.replace(/^\d{4}-/, "").replace(/:\d{2}$/, ""),
        },
        axisLine: { lineStyle: { color: "rgba(166, 182, 210, 0.2)" } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value" as const,
        name: unit,
        nameTextStyle: { color: "#8b9bb8", fontSize: 11 },
        axisLabel: { color: "#8b9bb8", fontSize: 11 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(166, 182, 210, 0.1)" } },
      },
      dataZoom: [
        { type: "inside" as const, start: 0, end: 100 },
        {
          type: "slider" as const,
          height: 20,
          bottom: 6,
          borderColor: "transparent",
          backgroundColor: "rgba(166,182,210,0.08)",
          fillerColor: "rgba(255,105,0,0.15)",
          handleStyle: { color: "#ff6900" },
          textStyle: { color: "#8b9bb8", fontSize: 10 },
        },
      ],
      series: [
        {
          type: "line" as const,
          data: yData,
          smooth: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { color: "#ff6900", width: 2 },
          itemStyle: { color: "#ff6900" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(255, 105, 0, 0.25)" },
              { offset: 1, color: "rgba(255, 105, 0, 0.02)" },
            ]),
          },
        },
      ],
    };
  }, [chartRows, property?.valueType?.unit]);

  if (!property) return null;

  return (
    <Drawer
      open={open}
      title={`\u5c5e\u6027\u8bb0\u5f55 - ${property.name}`}
      onClose={onClose}
      width={560}
      styles={{ body: { minHeight: 420 } }}
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          <DatePicker.RangePicker
            size="small"
            className="vt-ant-date-range"
            value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
            onChange={(dates) => {
              if (!dates?.[0] || !dates[1]) return;
              setFrom(dates[0].format("YYYY-MM-DD"));
              setTo(dates[1].format("YYYY-MM-DD"));
              setPage(1);
            }}
            allowClear={false}
          />
        }
        items={[
          {
            key: "data",
            label: "\u6570\u636e",
            children: (
              <div ref={historyTableRef}>
                <Table<DevicePropertyRecord>
                  className={`vt-ant-data-table vt-ant-history-table ${historyTableScroll.hasVerticalOverflow ? "" : "vt-ant-data-table-no-y-scroll"}`.trim()}
                  rowKey={(r, i) => `${r.ts}-${i}`}
                  size="small"
                  loading={loading}
                  columns={columns}
                  dataSource={rows}
                  scroll={{ x: "max-content", y: historyTableScroll.scrollY }}
                  pagination={{
                    current: page,
                    pageSize,
                    total,
                    size: "small",
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50, 100],
                    className: "vt-ant-pagination",
                    onChange: (p) => setPage(p),
                    onShowSizeChange: (_c, s) => {
                      setPageSize(s);
                      setPage(1);
                    },
                  }}
                />
              </div>
            ),
          },
          ...(isNumber
            ? [
                {
                  key: "chart",
                  label: "\u56fe\u8868",
                  children: chartLoading ? (
                    <div className="flex h-[360px] items-center justify-center">
                      <Spin />
                    </div>
                  ) : chartRows.length === 0 ? (
                    <div className="flex h-[360px] items-center justify-center text-sm text-text-muted">
                      {"\u65e0\u6570\u636e"}
                    </div>
                  ) : (
                    <ReactEChartsCore
                      echarts={echarts}
                      option={chartOption}
                      style={{ height: 360 }}
                      theme="dark"
                      notMerge
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </Drawer>
  );
}
