import { useSyncExternalStore } from "react";
import type {
  SimpleMetadata,
  SimplePropertyMetadata,
  SimpleFunctionMetadata,
  SimpleTreeMetadata,
  RuleModel,
  TagModel,
} from "@/types/api/metadata";

export type ProductType = "gateway" | "device" | "children";

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  gateway: "网关设备",
  device: "直连设备",
  children: "子设备",
};

export type Product = {
  id: string;
  name: string;
  sn: string;
  type: ProductType;
  creator: string;
  org: string;
  updateTime: string;
  metadata: SimpleMetadata;
};

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const initial: Product[] = [
  {
    id: "1", name: "PV 逆变器", sn: "GW-INV-M", type: "device",
    creator: "admin", org: "Group Root", updateTime: "2026-05-01 09:21:00",
    metadata: {
      properties: [
        { id: "voltage",  name: "电压",       valueType: { type: "double", unit: "V" } },
        { id: "current",  name: "电流",       valueType: { type: "double", unit: "A" } },
        { id: "power",    name: "瞬时功率",   valueType: { type: "double", unit: "kW" } },
        { id: "temp",     name: "组件温度",   valueType: { type: "double", unit: "℃" } },
      ],
      functions: [
        { id: "restart", name: "远程重启", async: true },
        { id: "calibrate", name: "校准", async: false },
      ],
      tags: [{ tagKey: "model", tagName: "PV-3000", tagValue: "1.0", optional: false }],
      rules: [
        {
          id: "r1", name: "过温告警", state: 1,
          ruleData: { type: "time", cron: "0 0/5 * * * ?", count: 1 },
          ruleMeta: { sql: "select * where temp >= ?", param: { temp: [80] } },
        },
      ],
      trees: [],
    },
  },
  {
    id: "2", name: "储能电池柜", sn: "ESS-Rack", type: "children",
    creator: "root", org: "Group Children1", updateTime: "2026-04-21 10:12:55",
    metadata: {
      properties: [
        { id: "soc",  name: "SOC",   valueType: { type: "double", unit: "%" } },
        { id: "soh",  name: "SOH",   valueType: { type: "double", unit: "%" } },
        { id: "cell", name: "单体温度", valueType: { type: "double", unit: "℃" } },
      ],
      functions: [{ id: "lock", name: "BMS 锁定", async: false }],
      tags: [], rules: [], trees: [],
    },
  },
  {
    id: "3", name: "网关-华东", sn: "GW-East-01", type: "gateway",
    creator: "test222", org: "Group Root", updateTime: "2026-03-15 14:08:30",
    metadata: {
      properties: [
        { id: "uplink", name: "上行流量", valueType: { type: "long", unit: "B" } },
      ],
      functions: [{ id: "reboot", name: "重启", async: true }],
      tags: [],
      rules: [],
      trees: [
        { id: "n1", name: "华东片区", children: [
          { id: "n1-1", name: "园区 A", children: [] },
          { id: "n1-2", name: "园区 B", children: [] },
        ] },
      ],
    },
  },
  {
    id: "4", name: "环境监测仪", sn: "ENV-Mini", type: "device",
    creator: "zhiyuan.wang", org: "Group Children1", updateTime: "2026-02-08 08:45:12",
    metadata: {
      properties: [
        { id: "temp", name: "环境温度", valueType: { type: "double", unit: "℃" } },
        { id: "hum",  name: "湿度",     valueType: { type: "double", unit: "%" } },
      ],
      functions: [], tags: [], rules: [], trees: [],
    },
  },
];

let state: Product[] = initial;
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((l) => l());
const getSnapshot = () => state;

export function useProducts(): Product[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useProduct(id: string | undefined): Product | undefined {
  const all = useProducts();
  return all.find((p) => p.id === id);
}

export const productActions = {
  add(p: Omit<Product, "id" | "updateTime" | "metadata"> & { metadata?: SimpleMetadata }) {
    const newP: Product = {
      ...p,
      id: String(Date.now()),
      updateTime: nowStr(),
      metadata: p.metadata ?? { properties: [], functions: [], tags: [], rules: [], trees: [] },
    };
    state = [newP, ...state];
    emit();
    return newP;
  },
  update(id: string, patch: Partial<Product>) {
    state = state.map((p) => (p.id === id ? { ...p, ...patch, updateTime: nowStr() } : p));
    emit();
  },
  remove(id: string) {
    state = state.filter((p) => p.id !== id);
    emit();
  },
  updateMetadata(id: string, fn: (m: SimpleMetadata) => SimpleMetadata) {
    state = state.map((p) =>
      p.id === id ? { ...p, metadata: fn(p.metadata), updateTime: nowStr() } : p,
    );
    emit();
  },
};

export type {
  SimplePropertyMetadata,
  SimpleFunctionMetadata,
  SimpleTreeMetadata,
  RuleModel,
  TagModel,
};
