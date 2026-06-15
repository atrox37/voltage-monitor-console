import { getLocale } from "@/i18n";

/** 数据类型 — 对齐 model/device/DeviceUnit.ts deviceUnits + unitApi */
export type DataTypeOption = { id: string; name: string };

export const DATA_TYPES: DataTypeOption[] = [
  { id: "enum", name: "enum" },
  { id: "number", name: "number" },
  { id: "string", name: "string" },
];

/** 归一化 GET /iot-app/configuration/unit 响应 — 兼容 id/name 与 label/value */
export function normalizeConfigurationUnits(raw: unknown): DataTypeOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return DATA_TYPES;
  const mapped = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.value ?? row.type ?? "").trim();
      const name = String(row.name ?? row.label ?? row.id ?? row.value ?? "").trim();
      if (!id) return null;
      return { id, name: name || id };
    })
    .filter((x): x is DataTypeOption => x !== null);
  return mapped.length > 0 ? mapped : DATA_TYPES;
}

/** 单位 — 对齐 model/device/DeviceUnit.ts deviceTypes */
export const DATA_UNITS: { unit: string; en: string; zh?: string }[] = [
  { zh: "百分比", en: "Percent", unit: "%" },
  { zh: "千瓦", en: "Kilowatt", unit: "kW" },
  { zh: "千瓦时", en: "Kilowatt Hour", unit: "kWh" },
  { zh: "伏特", en: "Volt", unit: "V" },
  { zh: "安培", en: "Ampere", unit: "A" },
  { zh: "摄氏度", en: "Celsius", unit: "℃" },
  { zh: "赫兹", en: "Hertz", unit: "Hz" },
  { zh: "升", en: "Liter", unit: "L" },
  { zh: "升/千瓦时", en: "Liter per kWh", unit: "L/kWh" },
  { zh: "分钟", en: "Minute", unit: "min" },
  { zh: "平方米", en: "Square Meter", unit: "m²" },
  { zh: "美元", en: "Dollar", unit: "$" },
  { zh: "千乏", en: "Kilovar", unit: "kVar" },
  { zh: "千伏安", en: "Kilovolt Ampere", unit: "kVA" },
  { zh: "千焦/摄氏度", en: "kJ per Celsius", unit: "kJ/°C" },
  { zh: "瓦/摄氏度", en: "Watt per Celsius", unit: "W/°C" },
  { zh: "无单位", en: "None", unit: "" },
];

export const PROPERTY_RW: { label: string; value: string }[] = [
  { label: "可读", value: "read" },
  { label: "可写", value: "write" },
  { label: "可读写", value: "readwrite" },
  { label: "无", value: "none" },
];

export function unitLabel(unit: string | null | undefined, _loc = getLocale()): string {
  if (!unit) return "—";
  const hit = DATA_UNITS.find((u) => u.unit.toLowerCase() === String(unit).toLowerCase());
  if (!hit) return unit;
  return hit.unit || "—";
}

export function defaultPropertyValueType(type = "string") {
  if (type === "number") {
    return { type: "number" as const, extra: { point: 1 }, unit: "" };
  }
  if (type === "enum") {
    return {
      type: "enum" as const,
      extra: { enumData: [] as { key: string; value: string }[] },
      unit: "",
    };
  }
  return { type: "string" as const, extra: { length: null as null }, unit: "" };
}
