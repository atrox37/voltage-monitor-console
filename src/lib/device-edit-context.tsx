import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
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
} from "@/lib/device-mappers";
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
      toast.error(err instanceof Error ? err.message : "加载设备详情失败");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  }, [deviceId]);

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
      toast.success("保存成功");
      await reload();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : "保存设备失败");
      setSaving(false);
    }
  }, [device, reload]);

  const syncModel = useCallback(async () => {
    if (!device) return;
    setSyncing(true);
    try {
      const res = await syncDeviceModel(device.id);
      toast.success(res.change === 0 ? "模型同步：无更新" : "模型同步：已更新");
      if (res.change !== 0) await reload();
    } catch (err) {
      if (isRequestCanceled(err)) return;
      toast.error(err instanceof Error ? err.message : "模型同步失败");
    } finally {
      setSyncing(false);
    }
  }, [device, reload]);

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
