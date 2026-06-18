import type { AlarmCond } from "@/features/devices/lib/rule-format";
import type { DeviceAlarmHandlerRow } from "@/features/devices/lib/device-alarm-handler-mappers";
import type { EnumDataItem } from "@/types/api/metadata";

type TFn = (key: string, params?: Record<string, string | number>) => string;

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const ENUM_KEY_PATTERN = /^[a-zA-Z0-9]+$/;

export function requiredInputError(t: TFn, label: string) {
  return t("validation.requiredInput", { label });
}

export function requiredSelectError(t: TFn, label: string) {
  return t("validation.requiredSelect", { label });
}

export function requiredInputRule(t: TFn, label: string) {
  return { required: true, whitespace: true, message: requiredInputError(t, label) };
}

export function requiredSelectRule(t: TFn, label: string) {
  return { required: true, message: requiredSelectError(t, label) };
}

export function isValidEnumKey(key: string) {
  return ENUM_KEY_PATTERN.test(key);
}

export function validateEnumData(t: TFn, data: EnumDataItem[] | undefined): string | null {
  const items = data ?? [];
  if (items.length === 0) return t("validation.enumDataRequired");
  for (const item of items) {
    if (!item.key?.trim()) return requiredInputError(t, t("common.enumKey"));
    if (!isValidEnumKey(item.key.trim())) return t("validation.enumKeyFormat");
    if (!item.value?.trim()) return requiredInputError(t, t("common.enumLabel"));
  }
  return null;
}

export function isAlarmConditionFilled(groups: AlarmCond[][] | undefined): boolean {
  return (groups ?? []).some((group) =>
    group.some((cond) => {
      if (!cond.column?.trim()) return false;
      if (cond.operation === "IS NOT NULL") return true;
      return cond.value !== "" && cond.value !== null && cond.value !== undefined;
    }),
  );
}

export function hasValidAlarmHandlers(handlers: DeviceAlarmHandlerRow[] | undefined): boolean {
  return (handlers ?? []).some((row) => Boolean(row.templateId && row.userId));
}

export function fieldFeedback(error?: string) {
  if (!error) return {};
  return {
    validateStatus: "error" as const,
    help: error,
  };
}
