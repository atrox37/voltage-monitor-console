import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChartOutlined, EditOutlined, SyncOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { useTranslation } from "@/i18n";
import { useDeviceEdit } from "@/features/devices/contexts/device-edit-context";
import { getDevicePropertyHistory } from "@/api";
import stompManager from "@/lib/stomp";
import type { DevicePropertyPushItem } from "@/types";
import type { PropertyTagMetadata, SimplePropertyMetadata } from "@/types/api/metadata";
import { unitLabel } from "@/lib/data-types";
import { DevicePropertyHistoryDialog } from "@/features/devices/components/device-property-history-dialog";
import { DevicePropertyWriteDialog } from "@/features/devices/components/device-property-write-dialog";

type PropertyReading = {
  id: string;
  name: string;
  value: string;
  unit?: string;
  updateTime: string;
};

export function TabRuntime() {
  const { t } = useTranslation();
  const { device } = useDeviceEdit();
  const deviceId = device?.id;
  const propertyList = device?.metadata.properties;
  const propertyTagList = device?.metadata.propertyTags;
  const props = useMemo(() => propertyList ?? [], [propertyList]);
  const propertyTags = useMemo<PropertyTagMetadata[]>(
    () => propertyTagList ?? [],
    [propertyTagList],
  );

  const [readings, setReadings] = useState<Record<string, PropertyReading>>({});
  const [loading, setLoading] = useState(false);
  const [filterTag, setFilterTag] = useState<string>("all");
  const [historyProp, setHistoryProp] = useState<SimplePropertyMetadata | null>(null);
  const [writeProp, setWriteProp] = useState<SimplePropertyMetadata | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const historyMap = await getDevicePropertyHistory(deviceId);
      const map: Record<string, PropertyReading> = {};
      for (const p of props) {
        const rec = historyMap[p.id];
        map[p.id] = {
          id: p.id,
          name: p.name,
          value: rec?.rawValue ?? rec?.numberValue?.toString() ?? "-",
          unit: p.valueType?.unit ?? undefined,
          updateTime: rec?.ts ?? "-",
        };
      }
      setReadings(map);
    } catch {
      const map: Record<string, PropertyReading> = {};
      for (const p of props) {
        map[p.id] = {
          id: p.id,
          name: p.name,
          value: "-",
          unit: p.valueType?.unit ?? undefined,
          updateTime: "-",
        };
      }
      setReadings(map);
    } finally {
      setLoading(false);
    }
  }, [deviceId, props]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!deviceId) return;
    stompManager.connect();
    const reportSub = stompManager.subscribe(
      { destination: `/topic/report_property_${deviceId}` },
      (msg) => {
        const items = (Array.isArray(msg) ? msg : [msg]) as DevicePropertyPushItem[];
        setReadings((prev) => {
          const next = { ...prev };
          const now = new Date().toLocaleString("zh-CN", { hour12: false });
          for (const item of items) {
            const existing = next[item.property];
            if (existing) {
              next[item.property] = {
                ...existing,
                value: item.rawValue ?? item.numberValue?.toString() ?? String(item.value ?? "-"),
                updateTime: item.ts ?? now,
              };
            }
          }
          return next;
        });
      },
    );
    return () => {
      stompManager.unsubscribe(reportSub);
    };
  }, [deviceId]);

  const filteredProps = useMemo(
    () => props.filter((p) => filterTag === "all" || !p.tagId || p.tagId === filterTag),
    [props, filterTag],
  );
  const readingList = useMemo(
    () =>
      filteredProps.map(
        (p) => readings[p.id] ?? { id: p.id, name: p.name, value: "-", updateTime: "-" },
      ),
    [filteredProps, readings],
  );

  if (!device) return null;

  const findProp = (id: string) => props.find((p) => p.id === id) ?? null;
  const isWritable = (id: string) => {
    const rw = findProp(id)?.rw ?? "read";
    return rw === "write" || rw === "readwrite";
  };

  const handleWriteSubmit = (propertyId: string, value: string | number) => {
    stompManager.send("/queue/queue_stomp_write", {
      type: "write-property",
      deviceId: device.id,
      property: propertyId,
      value,
    });
    setWriteProp(null);
  };

  const handleReadAll = () => {
    const ids = filteredProps.map((p) => p.id);
    if (ids.length === 0) return;
    stompManager.send("/queue/queue_stomp_read", {
      type: "read-property",
      deviceId: device.id,
      property: ids,
    });
  };

  if (props.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-text-muted">
        {t("devices.detail.meta.noMetadata")}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-end gap-3">
        <button
          type="button"
          className="vt-detail-outline-btn px-2.5 py-1 text-xs"
          onClick={handleReadAll}
        >
          <SyncOutlined /> {t("common.refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <div className="grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-auto md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {readingList.map((r) => (
            <div
              key={r.id}
              className="flex h-[132px] flex-col justify-between rounded-lg border border-panel-border bg-panel/40 p-4"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-text-muted">{r.name}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    title={t("common.refresh")}
                    className="vt-detail-icon-btn p-0.5"
                    onClick={() => void fetchHistory()}
                  >
                    <SyncOutlined />
                  </button>
                  <button
                    type="button"
                    title={t("common.historyCurve")}
                    className="vt-detail-icon-btn p-0.5"
                    onClick={() => setHistoryProp(findProp(r.id))}
                  >
                    <BarChartOutlined />
                  </button>
                  {isWritable(r.id) && (
                    <button
                      type="button"
                      title="写入"
                      className="vt-detail-icon-btn p-0.5"
                      onClick={() => setWriteProp(findProp(r.id))}
                    >
                      <EditOutlined />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-foreground">{r.value}</span>
                {r.unit && <span className="text-xs text-text-secondary">{unitLabel(r.unit)}</span>}
              </div>
              <div className="mt-2 text-right text-[10px] text-text-muted">{r.updateTime}</div>
            </div>
          ))}
        </div>
      )}

      {/* 底部标签过滤 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-panel-border/60 pt-3">
        {[{ id: "all", name: t("common.all") }, ...propertyTags].map((tagItem) => {
          const a = filterTag === tagItem.id;
          return (
            <button
              key={tagItem.id}
              onClick={() => setFilterTag(tagItem.id)}
              className={`rounded border px-2 py-0.5 text-xs ${
                a
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-panel-border text-text-secondary hover:border-primary/40"
              }`}
            >
              {tagItem.name}
            </button>
          );
        })}
      </div>

      <DevicePropertyHistoryDialog
        open={!!historyProp}
        deviceId={device.id}
        property={historyProp}
        onClose={() => setHistoryProp(null)}
      />
      <DevicePropertyWriteDialog
        open={!!writeProp}
        property={writeProp}
        onClose={() => setWriteProp(null)}
        onSubmit={handleWriteSubmit}
      />
    </div>
  );
}
