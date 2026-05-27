// 属性/参数数据类型 — 对照 unitApi() 返回值
export const DATA_TYPES: { id: string; name: string }[] = [
  { id: "int",     name: "整数 (int)" },
  { id: "long",    name: "长整数 (long)" },
  { id: "float",   name: "单精度 (float)" },
  { id: "double",  name: "双精度 (double)" },
  { id: "string",  name: "字符串 (string)" },
  { id: "boolean", name: "布尔 (boolean)" },
  { id: "enum",    name: "枚举 (enum)" },
  { id: "date",    name: "日期 (date)" },
];

// 单位 — 对照 deviceTypes
export const DATA_UNITS: { unit: string; en: string }[] = [
  { unit: "V",  en: "Volt" },
  { unit: "A",  en: "Ampere" },
  { unit: "W",  en: "Watt" },
  { unit: "kW", en: "Kilowatt" },
  { unit: "kWh", en: "Kilowatt-hour" },
  { unit: "Hz", en: "Hertz" },
  { unit: "℃",  en: "Celsius" },
  { unit: "%",  en: "Percent" },
  { unit: "B",  en: "Byte" },
  { unit: "KB", en: "Kilobyte" },
  { unit: "MB", en: "Megabyte" },
  { unit: "m",  en: "Meter" },
  { unit: "s",  en: "Second" },
  { unit: "ms", en: "Millisecond" },
];

export const PROPERTY_RW: { label: string; value: string }[] = [
  { label: "只读",   value: "read" },
  { label: "只写",   value: "write" },
  { label: "读写",   value: "readwrite" },
  { label: "不支持", value: "none" },
];
