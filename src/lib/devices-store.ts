import { useSyncExternalStore } from "react";
import type { TagModel } from "@/types/api/metadata";

export type DeviceStatus = "online" | "offline" | "disabled";

export type Device = {
  id: string;
  name: string;
  sn: string;
  productId: string;
  productName: string;
  productType: "gateway" | "device" | "children";
  gatewayId?: string;
  gatewayName?: string;
  collectGateway?: string;
  collectMode?: string;
  org: string;
  creator: string;
  status: DeviceStatus;
  statusTime: string;
  createTime: string;
  updateTime: string;
  tags: TagModel[];
};

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const initial: Device[] = [
  {
    id: "1", name: "1号逆变器", sn: "INV-2025-0001",
    productId: "1", productName: "PV 逆变器", productType: "device",
    gatewayId: "3", gatewayName: "网关-华东-01",
    collectGateway: "mqtt-client网关", collectMode: "MQTT_CLIENT",
    org: "Group Root", creator: "admin",
    status: "online", statusTime: "2026-05-19 02:14:08",
    createTime: "2026-05-01 09:21:00", updateTime: "2026-05-19 02:14:08",
    tags: [{ tagKey: "model", tagName: "型号", tagValue: "PV-3000" }],
  },
  {
    id: "2", name: "B2 电池柜", sn: "ESS-2025-002",
    productId: "2", productName: "储能电池柜", productType: "children",
    gatewayId: "3", gatewayName: "网关-华东-01",
    collectGateway: "mqtt-client网关", collectMode: "MQTT_CLIENT",
    org: "Group Children1", creator: "admin",
    status: "online", statusTime: "2026-05-19 01:52:31",
    createTime: "2026-04-22 10:11:55", updateTime: "2026-05-19 01:52:31", tags: [],
  },
  {
    id: "3", name: "12 号组串", sn: "INV-2025-0012",
    productId: "1", productName: "PV 逆变器", productType: "device",
    collectGateway: "modbus网关", collectMode: "MODBUS_TCP",
    org: "Group Children1", creator: "zhiyuan.wang",
    status: "disabled", statusTime: "2026-05-19 01:30:11",
    createTime: "2026-05-02 11:01:21", updateTime: "2026-05-19 01:30:11", tags: [],
  },
  {
    id: "4", name: "网关-华南-03", sn: "GW-South-03",
    productId: "3", productName: "网关-华东", productType: "gateway",
    collectGateway: "mqtt-client网关", collectMode: "MQTT_CLIENT",
    org: "Group Root", creator: "admin",
    status: "online", statusTime: "2026-05-19 00:48:02",
    createTime: "2026-03-15 14:08:30", updateTime: "2026-05-19 00:48:02", tags: [],
  },
  {
    id: "5", name: "环境监测 #1", sn: "ENV-2025-0001",
    productId: "4", productName: "环境监测仪", productType: "device",
    collectGateway: "http网关", collectMode: "HTTP",
    org: "Group Root", creator: "test222",
    status: "offline", statusTime: "2026-05-19 00:12:50",
    createTime: "2026-02-08 08:45:12", updateTime: "2026-05-19 00:12:50", tags: [],
  },
];

let state: Device[] = initial;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach((l) => l());
const getSnapshot = () => state;

export function useDevices(): Device[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function useDevice(id: string | undefined): Device | undefined {
  return useDevices().find((d) => d.id === id);
}

export const deviceActions = {
  add(d: Omit<Device, "id" | "statusTime" | "createTime" | "updateTime" | "tags" | "status"> & { status?: DeviceStatus }) {
    const newD: Device = {
      ...d,
      id: String(Date.now()),
      status: d.status ?? "offline",
      statusTime: nowStr(),
      createTime: nowStr(),
      updateTime: nowStr(),
      tags: [],
    };
    state = [newD, ...state];
    emit();
    return newD;
  },
  update(id: string, patch: Partial<Device>) {
    state = state.map((d) => (d.id === id ? { ...d, ...patch, updateTime: nowStr() } : d));
    emit();
  },
  remove(id: string) {
    state = state.filter((d) => d.id !== id);
    emit();
  },
  setStatus(id: string, status: DeviceStatus) {
    state = state.map((d) => (d.id === id ? { ...d, status, statusTime: nowStr() } : d));
    emit();
  },
  setTags(id: string, tags: TagModel[]) {
    state = state.map((d) => (d.id === id ? { ...d, tags } : d));
    emit();
  },
};

/* ---- Mock real-time/alarm helpers ---- */

export type PropertyReading = {
  id: string; name: string; value: string; unit?: string; updateTime: string;
};

export function mockReadings(
  productProps: { id: string; name: string; valueType?: { type?: string; unit?: string | null } }[],
  seed: number,
): PropertyReading[] {
  const t = nowStr();
  return productProps.map((p, i) => {
    const rand = ((seed * 9301 + i * 49297) % 233280) / 233280;
    const num = (rand * 100).toFixed(2);
    return {
      id: p.id, name: p.name, value: num,
      unit: p.valueType?.unit ?? undefined, updateTime: t,
    };
  });
}

export type AlarmLog = {
  id: string;
  ruleName: string;
  level: "warning" | "critical";
  message: string;
  time: string;
  acked: boolean;
};

export function mockAlarms(deviceId: string): AlarmLog[] {
  return [
    { id: `${deviceId}-a1`, ruleName: "过温告警", level: "critical",
      message: "组件温度 85℃ ≥ 阈值 80℃", time: "2026-05-19 02:01:33", acked: false },
    { id: `${deviceId}-a2`, ruleName: "通讯异常", level: "warning",
      message: "心跳缺失 30s", time: "2026-05-18 22:14:08", acked: true },
  ];
}

export type EventLog = {
  id: string;
  type: "property" | "function" | "online" | "offline" | "error";
  source: string;
  payload: string;
  time: string;
};

export function mockEvents(deviceId: string): EventLog[] {
  return [
    { id: `${deviceId}-e1`, type: "property", source: "voltage",
      payload: `{"value": 235.6, "unit": "V"}`, time: "2026-05-19 02:14:08" },
    { id: `${deviceId}-e2`, type: "property", source: "power",
      payload: `{"value": 4.21, "unit": "kW"}`, time: "2026-05-19 02:13:08" },
    { id: `${deviceId}-e3`, type: "function", source: "restart",
      payload: `{"result": "success", "code": 0}`, time: "2026-05-19 02:00:11" },
    { id: `${deviceId}-e4`, type: "online", source: "session",
      payload: `device online from 10.0.12.55`, time: "2026-05-19 01:48:02" },
    { id: `${deviceId}-e5`, type: "error", source: "decoder",
      payload: `parse frame failed: invalid CRC`, time: "2026-05-18 23:11:30" },
  ];
}
