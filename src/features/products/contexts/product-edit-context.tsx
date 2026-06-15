import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { showApiError, showSuccess } from "@/lib/api-message";
import { useTranslation } from "@/i18n";
import {
  getConfigurationUnits,
  getDimensionTree,
  saveProduct,
  searchProductOne,
  serializeProductRule,
  syncProductEdge,
} from "@/api";
import type { OrgNode } from "@/components/org-tree-select";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import {
  mapDetailToEditModel,
  mapEditToSavePayload,
  type ProductEditModel,
} from "@/features/products/lib/product-mappers";
import { termEqId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import { DATA_TYPES, normalizeConfigurationUnits } from "@/lib/data-types";
import type { JSqlColumn, RuleModel, SimpleMetadata } from "@/types";

export type ProductEditContextValue = {
  product: ProductEditModel | null;
  orgNodes: OrgNode[];
  dataTypes: { id: string; name: string }[];
  loading: boolean;
  saving: boolean;
  syncing: boolean;
  updateProduct: (patch: Partial<ProductEditModel>) => void;
  updateMetadata: (fn: (m: SimpleMetadata) => SimpleMetadata) => void;
  save: () => Promise<void>;
  syncEdge: () => Promise<void>;
  reload: () => Promise<void>;
  serializeRule: (index: number, rulePo: RuleModel, columns: JSqlColumn[][]) => Promise<void>;
};

const ProductEditContext = createContext<ProductEditContextValue | null>(null);

export function useProductEditState(productId: string): ProductEditContextValue {
  const { t } = useTranslation();
  const [product, setProduct] = useState<ProductEditModel | null>(null);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [dataTypes, setDataTypes] = useState(DATA_TYPES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await searchProductOne({ terms: [termEqId("t.id", productId)] });
      if (!detail) {
        setProduct(null);
        return;
      }
      setProduct(mapDetailToEditModel(detail));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setProduct(null);
      showApiError(err, t("devices.products.detail.loadFailed"));
    } finally {
      setLoading(false);
      setSaving(false);
    }
  }, [productId, t]);

  useEffect(() => {
    void getDimensionTree()
      .then((root) => setOrgNodes(dimensionToOrgNodes(root)))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
    void getConfigurationUnits()
      .then((list) => setDataTypes(normalizeConfigurationUnits(list)))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateProduct = useCallback((patch: Partial<ProductEditModel>) => {
    setProduct((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const updateMetadata = useCallback((fn: (m: SimpleMetadata) => SimpleMetadata) => {
    setProduct((prev) => (prev ? { ...prev, metadata: fn(prev.metadata) } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!product) return;
    setSaving(true);
    try {
      await saveProduct(mapEditToSavePayload(product));
      showSuccess(t("common.saveSuccess"));
      await reload();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.products.detail.saveFailed"));
      setSaving(false);
    }
  }, [product, reload, t]);

  const syncEdge = useCallback(async () => {
    if (!product) return;
    setSyncing(true);
    try {
      const res = await syncProductEdge(product.id);
      showSuccess(
        res.change === 0
          ? t("devices.products.detail.edgeSyncNoChange")
          : t("devices.products.detail.edgeSyncUpdated"),
      );
      if (res.change !== 0) await reload();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.products.detail.edgeSyncFailed"));
    } finally {
      setSyncing(false);
    }
  }, [product, reload, t]);

  const serializeRule = useCallback(
    async (index: number, rulePo: RuleModel, columns: JSqlColumn[][]) => {
      if (!product) return;
      try {
        const cron = rulePo.ruleData?.cron;
        const serialized = await serializeProductRule({
          metadata: product.metadata,
          columns,
          rulePo: {
            ...rulePo,
            ruleData: cron
              ? {
                  type: "time",
                  count: rulePo.ruleData?.count ?? 1,
                  ...rulePo.ruleData,
                  cron,
                  cronNum: cron,
                }
              : rulePo.ruleData,
          },
        });
        updateMetadata((m) => {
          const rules = [...(m.rules ?? [])];
          if (index < 0) rules.push(serialized);
          else rules[index] = serialized;
          return { ...m, rules };
        });
      } catch (err) {
        if (isRequestCanceled(err)) return;
        showApiError(err, t("devices.products.detail.ruleSerializeFailed"));
        throw err;
      }
    },
    [product, updateMetadata, t],
  );

  return useMemo(
    () => ({
      product,
      orgNodes,
      dataTypes,
      loading,
      saving,
      syncing,
      updateProduct,
      updateMetadata,
      save,
      syncEdge,
      reload,
      serializeRule,
    }),
    [
      product,
      orgNodes,
      dataTypes,
      loading,
      saving,
      syncing,
      updateProduct,
      updateMetadata,
      save,
      syncEdge,
      reload,
      serializeRule,
    ],
  );
}

/** 在页面根组件内调用 useProductEditState，再包 Provider — 避免 context 丢失 */
export function ProductEditContextProvider({
  value,
  children,
}: {
  value: ProductEditContextValue;
  children: ReactNode;
}) {
  return <ProductEditContext.Provider value={value}>{children}</ProductEditContext.Provider>;
}

/** @deprecated 使用页面内 useProductEditState + ProductEditContextProvider */
export function ProductEditProvider({
  productId,
  children,
}: {
  productId: string;
  children: ReactNode;
}) {
  const value = useProductEditState(productId);
  return <ProductEditContext.Provider value={value}>{children}</ProductEditContext.Provider>;
}

export function useProductEdit(): ProductEditContextValue {
  const ctx = useContext(ProductEditContext);
  if (!ctx) {
    throw new Error("useProductEdit must be used within ProductEditContextProvider");
  }
  return ctx;
}
