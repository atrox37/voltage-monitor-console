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
  pageGateways,
  saveDevice,
  searchDeviceOne,
  syncDeviceModel,
} from "@/api";
import type { OrgNode } from "@/components/org-tree-select";
import { dimensionToOrgNodes } from "@/lib/dimension-tree";
import {
  mapDetailToDeviceEditModel,
  mapDeviceEditToSavePayload,
  type DeviceEditModel,
} from "@/features/devices/lib/device-mappers";
import { DATA_TYPES, normalizeConfigurationUnits } from "@/lib/data-types";
import { ALL_PAGE_QUERY } from "@/lib/query-terms";
import { termEqId } from "@/lib/query-terms";
import { isRequestCanceled } from "@/lib/request";
import type { SimpleMetadata } from "@/types";
import type { GatewayDto } from "@/types";

export type DeviceEditContextValue = {
  device: DeviceEditModel | null;
  orgNodes: OrgNode[];
  gateways: GatewayDto[];
  dataTypes: { id: string; name: string }[];
  loading: boolean;
  saving: boolean;
  syncing: boolean;
  updateDevice: (patch: Partial<DeviceEditModel>) => void;
  updateMetadata: (fn: (m: SimpleMetadata) => SimpleMetadata) => void;
  save: () => Promise<void>;
  syncModel: () => Promise<void>;
  reload: () => Promise<void>;
};

const DeviceEditContext = createContext<DeviceEditContextValue | null>(null);

export function useDeviceEditState(deviceId: string): DeviceEditContextValue {
  const { t } = useTranslation();
  const [device, setDevice] = useState<DeviceEditModel | null>(null);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [gateways, setGateways] = useState<GatewayDto[]>([]);
  const [dataTypes, setDataTypes] = useState(DATA_TYPES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await searchDeviceOne({ terms: [termEqId("t.id", deviceId)] });
      if (!detail) {
        setDevice(null);
        return;
      }
      setDevice(mapDetailToDeviceEditModel(detail));
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setDevice(null);
      showApiError(err, t("devices.detail.loadFailed"));
    } finally {
      setLoading(false);
      setSaving(false);
    }
  }, [deviceId, t]);

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
    void pageGateways(ALL_PAGE_QUERY)
      .then((res) => setGateways(res.records ?? res.data ?? []))
      .catch((err) => {
        if (isRequestCanceled(err)) return;
      });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateDevice = useCallback((patch: Partial<DeviceEditModel>) => {
    setDevice((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const updateMetadata = useCallback((fn: (m: SimpleMetadata) => SimpleMetadata) => {
    setDevice((prev) => (prev ? { ...prev, metadata: fn(prev.metadata) } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!device) return;
    setSaving(true);
    try {
      await saveDevice(mapDeviceEditToSavePayload(device));
      showSuccess(t("common.saveSuccess"));
      await reload();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.detail.saveFailed"));
      setSaving(false);
    }
  }, [device, reload, t]);

  const syncModel = useCallback(async () => {
    if (!device) return;
    setSyncing(true);
    try {
      const res = await syncDeviceModel(device.id);
      showSuccess(
        res.change === 0
          ? t("devices.detail.modelSyncNoChange")
          : t("devices.detail.modelSyncUpdated"),
      );
      if (res.change !== 0) await reload();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      showApiError(err, t("devices.detail.modelSyncFailed"));
    } finally {
      setSyncing(false);
    }
  }, [device, reload, t]);

  return useMemo(
    () => ({
      device,
      orgNodes,
      gateways,
      dataTypes,
      loading,
      saving,
      syncing,
      updateDevice,
      updateMetadata,
      save,
      syncModel,
      reload,
    }),
    [
      device,
      orgNodes,
      gateways,
      dataTypes,
      loading,
      saving,
      syncing,
      updateDevice,
      updateMetadata,
      save,
      syncModel,
      reload,
    ],
  );
}

export function DeviceEditContextProvider({
  value,
  children,
}: {
  value: DeviceEditContextValue;
  children: ReactNode;
}) {
  return <DeviceEditContext.Provider value={value}>{children}</DeviceEditContext.Provider>;
}

export function useDeviceEdit(): DeviceEditContextValue {
  const ctx = useContext(DeviceEditContext);
  if (!ctx) {
    throw new Error("useDeviceEdit must be used within DeviceEditContextProvider");
  }
  return ctx;
}
