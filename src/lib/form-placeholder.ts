import { useMemo } from "react";
import { useTranslation } from "@/i18n";

type TFn = (key: string, params?: Record<string, string | number>) => string;

/** 表单占位符：请输入/请选择 + label（与 i18n validation.* 对齐） */
export function inputPlaceholderFor(t: TFn, label: string) {
  return t("validation.requiredInput", { label });
}

export function selectPlaceholderFor(t: TFn, label: string) {
  return t("validation.requiredSelect", { label });
}

export function useFormPlaceholder() {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      input: (label: string) => inputPlaceholderFor(t, label),
      select: (label: string) => selectPlaceholderFor(t, label),
    }),
    [t],
  );
}
