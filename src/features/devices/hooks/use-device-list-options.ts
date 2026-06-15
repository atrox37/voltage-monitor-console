import { useQuery } from "@tanstack/react-query";
import { pageGateways, pageProducts } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { ALL_PAGE_QUERY } from "@/lib/query-terms";
import type { GatewayDto } from "@/types";

export type ProductOption = { id: string; name: string; type: string };

export function useDeviceProductOptions() {
  return useQuery({
    queryKey: queryKeys.devices.productOptions,
    queryFn: async (): Promise<ProductOption[]> => {
      const res = await pageProducts(ALL_PAGE_QUERY);
      const list = res.records ?? res.data ?? [];
      return list.map((row) => ({
        id: String(row.productPo.id ?? ""),
        name: row.productPo.name ?? "",
        type: row.productPo.type ?? "device",
      }));
    },
    // staleTime: 60_000,
  });
}

export function useDeviceGatewayOptions() {
  return useQuery({
    queryKey: queryKeys.devices.gatewayOptions,
    queryFn: async (): Promise<GatewayDto[]> => {
      const res = await pageGateways(ALL_PAGE_QUERY);
      return res.records ?? res.data ?? [];
    },
    // staleTime: 60_000,
  });
}
