import { useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n";
import type { ProductType } from "@/features/products/lib/product-mappers";

export function useProductTypeLabel() {
  const { t } = useTranslation();
  return useCallback(
    (type: ProductType | string) => {
      const key = type === "children" ? "children" : type;
      if (key === "gateway" || key === "device" || key === "children") {
        return t(`devices.types.${key}`);
      }
      return String(type);
    },
    [t],
  );
}

export function useProductTypeOptions() {
  const { t } = useTranslation();
  return useMemo(
    (): { value: ProductType; label: string }[] => [
      { value: "gateway", label: t("devices.types.gateway") },
      { value: "device", label: t("devices.types.device") },
      { value: "children", label: t("devices.types.children") },
    ],
    [t],
  );
}
